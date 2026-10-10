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

  // Applying again to a job already applied for is refused. An application
  // that was WITHDRAWN does not count and may be reopened below.
  const { data: existing } = await client
    .from("job_applications")
    .select("id, status")
    .eq("job_id", body.jobId)
    .eq("helper_id", userData.user.id)
    .limit(5);
  const activeApplication = (existing ?? []).find((row: { status?: unknown }) => String(row.status) !== "withdrawn");
  if (activeApplication) {
    return jsonResponse({ error: "You have already applied for this job.", code: "already_applied" }, 409);
  }
  const withdrawnApplication = (existing ?? [])[0] as { id?: string } | undefined;

  const answers = Array.isArray(body?.answers) ? body.answers : [];
  const message = answers
    .map((entry: { answer?: unknown }) => (typeof entry?.answer === "string" ? entry.answer : ""))
    .filter(Boolean)
    .join("\n");

  // Applying again after withdrawing: the old row is made live again.
  // Done with a service-role client that carries no caller token, because
  // workers have no update right on their own application rows; the caller
  // was authenticated above and the row is matched on their own id.
  if (withdrawnApplication?.id) {
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data: reopened, error: reopenError } = await adminClient
      .from("job_applications")
      .update({ status: "submitted", message: message || null, updated_at: new Date().toISOString() })
      .eq("id", withdrawnApplication.id)
      .eq("helper_id", userData.user.id)
      .select()
      .maybeSingle();
    if (reopenError || !reopened) {
      console.error("apply-to-job could not reopen a withdrawn application", {
        workerProfileId: userData.user.id,
        jobId: body.jobId,
        message: reopenError?.message
      });
      return jsonResponse({ error: "We couldn't submit your application right now. Please try again." }, 422);
    }
    return jsonResponse({ status: "submitted", workerProfileId: userData.user.id, application: reopened });
  }

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

