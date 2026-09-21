import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

function friendlyTicketError(message: string): string {
  if (/not_authenticated/i.test(message)) return "Please sign in, then send your support request again.";
  if (/invalid_category/i.test(message)) return "Choose a support category and try again.";
  if (/subject_required/i.test(message)) return "Enter a subject for your support request.";
  if (/message_required/i.test(message)) return "Enter a message for your support request.";
  // Anything else used to be replaced with one fixed sentence, hiding the
  // real cause (same anti-pattern as unlock-profile and apply-to-job).
  return message || "We couldn't send your support request. Please try again.";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = request.headers.get("Authorization");
  const body = await request.json().catch(() => null);
  if (!authHeader) {
    return jsonResponse({ error: "Please sign in to continue." }, 401);
  }

  if (!body?.category || !body?.subject || !body?.message) {
    return jsonResponse({ error: "Complete the highlighted fields before sending your support request." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Support is not ready yet. Please try again later." }, 500);

  const client = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data, error } = await client.rpc("create_support_ticket", {
    category: body.category,
    subject: body.subject,
    message: body.message
  });

  if (error) {
    console.error("create-support-ticket failed", { code: error.code, message: error.message });
    return jsonResponse({ error: friendlyTicketError(error.message) }, 422);
  }
  return jsonResponse({ status: "created", ticket: data });
});
