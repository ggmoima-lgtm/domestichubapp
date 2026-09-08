import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = request.headers.get("Authorization");
  const body = await request.json().catch(() => null);
  if (!authHeader || !body?.applicationId) {
    return jsonResponse({ error: "Authenticated applicationId request required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Server configuration missing" }, 500);

  const client = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: userData, error } = await client.auth.getUser();
  if (error || !userData.user) return jsonResponse({ error: "Invalid session" }, 401);

  const { data: application, error: rpcError } = await client.rpc("shortlist_application", {
    application_id: body.applicationId
  });

  if (rpcError) {
    console.error("shortlist-application shortlist_application failed", {
      employerProfileId: userData.user.id,
      applicationId: body.applicationId,
      code: rpcError.code,
      message: rpcError.message
    });
    return jsonResponse({ error: "We couldn't shortlist this applicant right now. Please try again." }, 422);
  }

  return jsonResponse({
    status: "shortlisted",
    employerProfileId: userData.user.id,
    application
  });
});