import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = request.headers.get("Authorization");
  const body = await request.json().catch(() => null);
  if (!authHeader || !body) return jsonResponse({ error: "Authenticated preferences request required" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Server configuration missing" }, 500);

  const client = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data, error } = await client.rpc("update_notification_preferences", {
    messages: Boolean(body.messages),
    interviews: Boolean(body.interviews),
    profile_unlocks: Boolean(body.profileUnlocks),
    hire_updates: Boolean(body.hireUpdates),
    reviews: Boolean(body.reviews),
    credits: Boolean(body.credits),
    admin_actions: Boolean(body.adminActions)
  });

  if (error) return jsonResponse({ error: error.message }, 422);
  return jsonResponse({ status: "updated", preferences: data });
});
