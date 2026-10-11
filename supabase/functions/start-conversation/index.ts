
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = request.headers.get("Authorization");
  const body = await request.json().catch(() => null);
  if (!authHeader || !body?.workerProfileId) {
    return jsonResponse({ error: "Unlock this profile to message this worker." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Server configuration missing" }, 500);

  const client = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse({ error: "Please sign in before messaging a worker." }, 401);
  }

  const { data, error } = await client.rpc("start_unlocked_conversation", {
    worker: body.workerProfileId,
    related_job: body.jobId ?? null,
    related_application: body.applicationId ?? null
  });

  if (error) {
    return jsonResponse({ error: error.message }, 422);
  }

  return jsonResponse({
    status: "ready",
    conversation: data
  });
});

