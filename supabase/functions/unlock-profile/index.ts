import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = request.headers.get("Authorization");
  const body = await request.json().catch(() => null);
  if (!authHeader || !body?.workerProfileId) {
    return jsonResponse({ error: "Authenticated workerProfileId request required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Server configuration missing" }, 500);
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: userData, error } = await client.auth.getUser();
  if (error || !userData.user) {
    return jsonResponse({ error: "Please sign in again before unlocking this profile." }, 401);
  }

  const { data: profile } = await client
    .from("profiles")
    .select("primary_role")
    .eq("id", userData.user.id)
    .maybeSingle();

  const role = `${profile?.primary_role ?? ""}`.toLowerCase();
  if (role !== "employer") {
    return jsonResponse({ error: "Please use an employer account to unlock worker profiles." }, 403);
  }

  await client
    .from("employer_profiles")
    .upsert({ profile_id: userData.user.id }, { onConflict: "profile_id" });

  const { data, error: rpcError } = await client.rpc("unlock_worker_profile", {
    worker: body.workerProfileId
  });

  if (rpcError) {
    console.error("[unlock-profile] unlock_worker_profile RPC failed", {
      workerProfileId: body.workerProfileId,
      employerId: userData.user.id,
      code: rpcError.code,
      message: rpcError.message
    });
    if (/negative|wallet/i.test(rpcError.message)) {
      return jsonResponse({ error: "You need 1 credit to unlock this worker profile." }, 422);
    }
    if (/Only employers/i.test(rpcError.message)) {
      return jsonResponse({ error: "Please complete your employer profile before unlocking workers." }, 422);
    }
    if (/not available/i.test(rpcError.message)) {
      return jsonResponse({ error: "This worker profile is not available to unlock right now." }, 422);
    }
    // Every other case was previously flattened into one fixed sentence,
    // hiding the real Postgres error (e.g. a bug in a function this RPC
    // calls) behind "your credit has not been used" - show the real
    // message instead so a failure like this is diagnosable from the
    // client error alone, not just from Edge Function logs.
    return jsonResponse({ error: rpcError.message || "We couldn't unlock this profile right now. Please try again." }, 422);
  }

  return jsonResponse({
    status: "processed",
    success: true,
    employerProfileId: userData.user.id,
    ...(typeof data === "object" && data !== null ? data : { unlock: data })
  });
});
