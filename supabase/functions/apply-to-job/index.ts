import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

function friendlyApplyError(message: string): string {
  if (/no longer accepting applications/i.test(message)) return "This job is no longer accepting applications.";
  if (/could not be found/i.test(message)) return "This job could not be found. It may have been removed.";
  if (/complete your worker profile/i.test(message)) return "Complete your worker profile before applying for jobs.";
  return message || "We couldn't submit your application right now. Please try again.";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = request.headers.get("Authorization");
  const body = await request.json().catch(() => null);
  if (!authHeader || !body?.jobId) {
    return jsonResponse({ error: "Authenticated jobId request required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Server configuration missing" }, 500);

  const client = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: userData, error } = await client.auth.getUser();
  if (error || !userData.user) return jsonResponse({ error: "Invalid session" }, 401);

  // create_job_application is idempotent: applying again to the same job
  // quietly returns the existing application, so a repeat tap looked like a
  // second successful application. Say so explicitly instead. Row-level
  // security limits this read to the worker's own applications.
  const { data: existing } = await client
    .from("job_applications")
    .select("id")
    .eq("job_id", body.jobId)
    .eq("helper_id", userData.user.id)
    .limit(1);
  if (existing && existing.length > 0) {
    return jsonResponse({ error: "You have already applied for this job.", code: "already_applied" }, 409);
  }

  // job_applications has a single free-text message column, not a
  // per-question answers table, so the answers[] entries are joined into
  // that one field.
  const answers = Array.isArray(body?.answers) ? body.answers : [];
  const message = answers
    .map((entry: { answer?: unknown }) => (typeof entry?.answer === "string" ? entry.answer : ""))
    .filter(Boolean)
    .join("\n");

  const { data: application, error: rpcError } = await client.rpc("create_job_application", {
    job_id: body.jobId,
    message
  });

  if (rpcError) {
    console.error("apply-to-job create_job_application failed", {
      workerProfileId: userData.user.id,
      jobId: body.jobId,
      code: rpcError.code,
      message: rpcError.message
    });
    return jsonResponse({ error: friendlyApplyError(rpcError.message) }, 422);
  }

  return jsonResponse({
    status: "submitted",
    workerProfileId: userData.user.id,
    application
  });
});

Before deploying, please confirm from the live database (paste raw output of this query) that the column I filter on really is helper_id:

select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'job_applications' order by ordinal_position;

If job_applications has no helper_id column, STOP and tell me - do not deploy.