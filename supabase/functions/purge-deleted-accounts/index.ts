
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const graceDays = 30;
const fileBuckets = ["avatars", "helper-videos", "helper-documents"];

function admin() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return { client: createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }), key };
}

async function listFiles(client: ReturnType<typeof createClient>, bucket: string, ownerId: string) {
  const paths: string[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await client.storage.from(bucket).list(ownerId, { limit: 100, offset });
    if (error) throw new Error(`list ${bucket}: ${error.message}`);
    const files = (data ?? []).filter((entry) => entry.id);
    paths.push(...files.map((entry) => `${ownerId}/${entry.name}`));
    if ((data ?? []).length < 100) break;
    offset += 100;
  }
  return paths;
}

async function removeFiles(client: ReturnType<typeof createClient>, ownerIds: string[]) {
  const removed: Record<string, number> = {};
  for (const bucket of fileBuckets) {
    let count = 0;
    for (const ownerId of ownerIds) {
      const paths = await listFiles(client, bucket, ownerId);
      for (let index = 0; index < paths.length; index += 100) {
        const batch = paths.slice(index, index + 100);
        const { error } = await client.storage.from(bucket).remove(batch);
        if (error) throw new Error(`remove ${bucket}: ${error.message}`);
        count += batch.length;
      }
    }
    removed[bucket] = count;
  }
  return removed;
}

async function countFiles(client: ReturnType<typeof createClient>, ownerIds: string[]) {
  const counts: Record<string, number> = {};
  for (const bucket of fileBuckets) {
    let count = 0;
    for (const ownerId of ownerIds) count += (await listFiles(client, bucket, ownerId)).length;
    counts[bucket] = count;
  }
  return counts;
}

async function purgeOne(client: ReturnType<typeof createClient>, profileId: string, dryRun: boolean) {
  const { data: preview, error: previewError } = await client.rpc("purge_deleted_account", {
    p_profile_id: profileId,
    p_dry_run: true,
    p_grace_days: graceDays
  });
  if (previewError) throw new Error(`preview: ${previewError.message}`);

  const authUserId = String(preview?.auth_user_id ?? profileId);
  const ownerIds = [...new Set([profileId, authUserId])];

  if (dryRun) {
    return { ...preview, files: await countFiles(client, ownerIds) };
  }

  const cutoff = new Date(Date.now() - graceDays * 24 * 60 * 60 * 1000).toISOString();
  const { data: due, error: dueError } = await client
    .from("account_deletion_requests")
    .select("id")
    .eq("profile_id", profileId)
    .eq("status", "pending")
    .lte("requested_at", cutoff)
    .limit(1);
  if (dueError) throw new Error(`due check: ${dueError.message}`);
  if (!due || due.length === 0) throw new Error("grace_period_not_over");

  const files = await removeFiles(client, ownerIds);

  const { data: purged, error: purgeError } = await client.rpc("purge_deleted_account", {
    p_profile_id: profileId,
    p_dry_run: false,
    p_grace_days: graceDays
  });
  if (purgeError) throw new Error(`purge: ${purgeError.message}`);

  const { error: deleteError } = await client.auth.admin.deleteUser(authUserId);
  const alreadyGone = deleteError && /not found/i.test(deleteError.message);
  if (deleteError && !alreadyGone) throw new Error(`delete auth user: ${deleteError.message}`);

  return { ...purged, files, auth_user_deleted: !deleteError };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const service = admin();
  if (!service) return jsonResponse({ error: "Server configuration missing" }, 500);

  const bearer = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const cronSecret = Deno.env.get("PURGE_CRON_SECRET") ?? "";
  const providedSecret = request.headers.get("x-purge-secret") ?? "";
  const allowed = bearer === service.key || (cronSecret.length >= 24 && providedSecret === cronSecret);
  if (!allowed) return jsonResponse({ error: "Not allowed" }, 403);

  const body = await request.json().catch(() => ({}));
  const profileId = typeof body?.profileId === "string" ? body.profileId.trim() : "";
  const { client } = service;

  try {
    if (profileId) {
      const dryRun = body?.dryRun !== false;
      return jsonResponse({ status: dryRun ? "dry_run" : "purged", result: await purgeOne(client, profileId, dryRun) });
    }

    const cutoff = new Date(Date.now() - graceDays * 24 * 60 * 60 * 1000).toISOString();
    const { data: due, error } = await client
      .from("account_deletion_requests")
      .select("profile_id")
      .eq("status", "pending")
      .lte("requested_at", cutoff)
      .order("requested_at", { ascending: true })
      .limit(20);
    if (error) return jsonResponse({ error: error.message }, 500);

    const results: Array<Record<string, unknown>> = [];
    for (const row of due ?? []) {
      const id = String(row.profile_id);
      try {
        results.push({ profileId: id, ...(await purgeOne(client, id, false)) });
      } catch (purgeError) {
        console.error("purge-deleted-accounts failed", { profileId: id, message: (purgeError as Error).message });
        results.push({ profileId: id, error: (purgeError as Error).message });
      }
    }
    return jsonResponse({ status: "processed", due: results.length, results });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 422);
  }
});

