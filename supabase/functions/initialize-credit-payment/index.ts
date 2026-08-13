import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const paystackInitializeUrl = "https://api.paystack.co/transaction/initialize";

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function packageCredits(packageId: string): number | null {
  const match = packageId.match(/^credits_(\d+)$/);
  if (!match) return null;
  const credits = Number(match[1]);
  return Number.isFinite(credits) ? credits : null;
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
  const packageId = asText(body?.packageId);
  const credits = packageCredits(packageId);

  if (!authHeader || !packageId || credits === null) {
    return jsonResponse({ error: "Please sign in and choose a credit package." }, 400);
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
  if (userError || !userData.user?.email) {
    return jsonResponse({ error: "Please sign in again before buying credits." }, 401);
  }

  const { data: profile } = await client
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", userData.user.id)
    .maybeSingle();

  const { data: packageRow, error: packageError } = await client
    .from("credit_packages")
    .select("id, name, credits, price_cents, currency")
    .eq("credits", credits)
    .eq("is_active", true)
    .maybeSingle();

  if (packageError || !packageRow) {
    return jsonResponse({ error: "This credit package is not available." }, 422);
  }

  if (packageRow.currency !== "ZAR") {
    return jsonResponse({ error: "This credit package is not available for Paystack." }, 422);
  }

  const reference = `DH-${userData.user.id.slice(0, 8)}-${Date.now()}`;
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  const email = asText(profile?.email) || userData.user.email;

  const paystackResponse = await fetch(paystackInitializeUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackSecretKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      amount: packageRow.price_cents,
      currency: "ZAR",
      reference,
      channels: ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer"],
      metadata: {
        employerProfileId: userData.user.id,
        packageId: packageRow.id,
        packageName: packageRow.name,
        credits: packageRow.credits,
        customerName: displayName
      }
    })
  });

  const paystackBody = await paystackResponse.json().catch(() => null);
  if (!paystackResponse.ok || !paystackBody?.status || !paystackBody?.data?.authorization_url) {
    return jsonResponse({ error: asText(paystackBody?.message) || "We couldn't start Paystack checkout. Please try again." }, 502);
  }

  return jsonResponse({
    status: "initialized",
    provider: "paystack",
    reference,
    authorizationUrl: paystackBody.data.authorization_url,
    accessCode: paystackBody.data.access_code,
    package: {
      id: packageRow.id,
      name: packageRow.name,
      credits: packageRow.credits,
      amount: packageRow.price_cents,
      currency: packageRow.currency
    }
  });
});