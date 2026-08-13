import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = request.headers.get("Authorization");
  const body = await request.json().catch(() => null);
  const reference = asText(body?.reference);

  if (!authHeader || !reference) {
    return jsonResponse({ error: "Please sign in again and confirm the payment reference." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!supabaseUrl || !serviceRoleKey || !paystackSecretKey) {
    return jsonResponse({ error: "Payment setup is not ready yet." }, 500);
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse({ error: "Please sign in again before confirming payment." }, 401);
  }

  const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${paystackSecretKey}` }
  });
  const verifyBody = await verifyResponse.json().catch(() => null);
  const transaction = verifyBody?.data;

  if (!verifyResponse.ok || !verifyBody?.status || transaction?.status !== "success") {
    return jsonResponse({ error: asText(verifyBody?.message) || "Payment has not been completed yet." }, 422);
  }

  const metadata = transaction.metadata ?? {};
  const packageId = asText(metadata.packageId);
  const employerProfileId = asText(metadata.employerProfileId);
  if (employerProfileId !== userData.user.id || !packageId) {
    return jsonResponse({ error: "Payment reference does not match this account." }, 403);
  }

  const { data, error } = await client.rpc("record_verified_store_purchase", {
    package_id: packageId,
    platform_name: "web",
    provider_transaction: reference,
    receipt_hash: `paystack:${transaction.id ?? reference}:${transaction.paid_at ?? transaction.paidAt ?? ""}`
  });

  if (error) {
    const message = error.message.includes("already been processed")
      ? "This payment has already been added to your wallet."
      : error.message;
    return jsonResponse({ error: message }, 422);
  }

  return jsonResponse({
    status: "processed",
    provider: "paystack",
    reference,
    transaction: data
  });
});