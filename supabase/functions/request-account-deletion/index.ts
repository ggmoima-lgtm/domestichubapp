import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = request.headers.get("Authorization");
  const body = await request.json().catch(() => ({}));
  if (!authHeader) return jsonResponse({ error: "Authenticated deletion request required" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Server configuration missing" }, 500);

  const client = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data, error } = await client.rpc("request_account_deletion", {
    reason: body.reason ?? null,
    reauthenticated_at: body.reauthenticatedAt ?? new Date().toISOString()
  });

  if (error) return jsonResponse({ error: error.message }, 422);
  return jsonResponse({ status: "scheduled", deletion: data });
});

