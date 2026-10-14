import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const staleAfterMs = 24 * 60 * 60 * 1000;

function mapStatus(paystackStatus: string): "success" | "failed" | "abandoned" | null {
  if (paystackStatus === "success") return "success";
  if (paystackStatus === "failed" || paystackStatus === "reversed") return "failed";
  if (paystackStatus === "abandoned") return "abandoned";
  return null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!token) return jsonResponse({ error: "Please sign in." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!supabaseUrl || !serviceRoleKey || !paystackSecretKey) {
    return jsonResponse({ error: "Payment setup is not ready yet." }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return jsonResponse({ error: "Please sign in." }, 401);

  const { data: pending, error } = await admin
    .from("payment_attempts")
    .select("id, reference, created_at")
    .eq("user_id", userData.user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) return jsonResponse({ error: "We couldn't check your payments right now." }, 500);

  const updated: Array<{ reference: string; status: string }> = [];

  for (const attempt of pending ?? []) {
    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(attempt.reference)}`, {
        headers: { Authorization: `Bearer ${paystackSecretKey}` }
      });
      const body = await response.json().catch(() => null);
      const transaction = body?.data;
      let status = mapStatus(String(transaction?.status ?? ""));

      if (!status && Date.now() - Date.parse(attempt.created_at) > staleAfterMs) status = "abandoned";
      if (!status) continue;

      const gatewayMessage = typeof transaction?.gateway_response === "string" ? transaction.gateway_response.slice(0, 200) : null;
      const { error: updateError } = await admin
        .from("payment_attempts")
        .update({
          status,
          gateway_message: gatewayMessage,
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        })
        .eq("id", attempt.id)
        .eq("status", "pending");
      if (!updateError) updated.push({ reference: attempt.reference, status });
    } catch (checkError) {
      console.error("refresh-payment-attempts check failed", { reference: attempt.reference, message: (checkError as Error).message });
    }
  }

  return jsonResponse({ status: "checked", checked: (pending ?? []).length, updated });
});
