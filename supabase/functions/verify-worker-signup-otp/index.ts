import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const e164Pattern = /^\+27[0-9]{9}$/;
const otpPattern = /^[0-9]{4,8}$/;

function signupEmailForPhone(phone: string) {
  return `phone-${phone.replace(/\D/g, "")}@domestichub.local`;
}

function randomPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const body = await request.json().catch(() => null);
  const phoneE164 = typeof body?.phone === "string"
    ? body.phone.trim()
    : typeof body?.phoneE164 === "string"
      ? body.phoneE164.trim()
      : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const role = body?.role === "employer" ? "employer" : "worker";

  if (!e164Pattern.test(phoneE164)) return jsonResponse({ error: "Enter a valid South African mobile number." }, 422);
  if (!otpPattern.test(code)) return jsonResponse({ error: "Enter the SMS code from your phone." }, 422);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("ANON_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Server configuration missing" }, 500);

  const verifyResponse = await fetch(`${supabaseUrl}/functions/v1/verify-sms-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey || serviceRoleKey,
      Authorization: `Bearer ${anonKey || serviceRoleKey}`
    },
    body: JSON.stringify({
      phoneE164,
      phone: phoneE164,
      phoneNumber: phoneE164,
      mobileNumber: phoneE164,
      code,
      otp: code,
      otpCode: code,
      verificationCode: code,
      purpose: "signup_verify",
      role
    })
  });

  const verifyText = await verifyResponse.text();
  let verifyBody: Record<string, unknown> = {};
  if (verifyText.trim()) {
    try {
      verifyBody = JSON.parse(verifyText) as Record<string, unknown>;
    } catch {
      verifyBody = { error: verifyText };
    }
  }

  if (!verifyResponse.ok || verifyBody.error || verifyBody.success === false || verifyBody.verified === false) {
    const message = typeof verifyBody.error === "string"
      ? verifyBody.error
      : "That SMS code is incorrect or has expired. Please request a new code.";
    return jsonResponse({ error: message }, verifyResponse.ok ? 422 : verifyResponse.status);
  }

  const client = createClient(supabaseUrl, serviceRoleKey);
  const email = signupEmailForPhone(phoneE164);
  const password = randomPassword();
  const metadata = {
    phone_e164: phoneE164,
    primary_role: role,
    phone_verified_at: new Date().toISOString()
  };
  const signInStartFailedMessage = "Your mobile number is verified, but sign-in could not start. Please try again.";
  const phoneTaken = (message?: string) => /users_phone_key|duplicate key/i.test(message ?? "");

  let { data: createData, error: createError } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    phone: phoneE164,
    phone_confirm: true,
    user_metadata: metadata
  });

  // The number may already be attached to an older/legacy auth account. The
  // canonical identity here is the phone-derived email, so fall back to
  // creating the account without the auth-level phone field.
  if (createError && phoneTaken(createError.message)) {
    ({ data: createData, error: createError } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata
    }));
  }

  let userId = createData?.user?.id ?? "";

  if (createError) {
    if (!/already|exists|registered|duplicate/i.test(createError.message)) {
      console.error("[verify-worker-signup-otp] createUser failed", { email, status: createError.status, message: createError.message });
      return jsonResponse({ error: signInStartFailedMessage }, 500);
    }

    // The account already exists (e.g. resuming onboarding after an earlier
    // interruption). We don't know its original password, but as the
    // service role — and having already verified this SMS code — we can
    // safely look the account up and reset its password to this freshly
    // generated one, then sign in with it below. generateLink is used only
    // to resolve the existing user id; its hashed_token is discarded.
    const { data: lookupData, error: lookupError } = await client.auth.admin.generateLink({ type: "magiclink", email });
    userId = lookupData?.user?.id ?? "";
    if (lookupError || !userId) {
      console.error("[verify-worker-signup-otp] existing-user lookup failed", { email, status: lookupError?.status, message: lookupError?.message });
      return jsonResponse({ error: signInStartFailedMessage }, 500);
    }

    // Older accounts may have been created without a confirmed email, which
    // makes signInWithPassword fail with "Email not confirmed". Confirm it
    // here — SMS ownership has already been proven above.
    let { error: updateError } = await client.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      phone: phoneE164,
      phone_confirm: true,
      user_metadata: metadata
    });

    // Phone already claimed by another (legacy) auth row — retry without it.
    if (updateError && phoneTaken(updateError.message)) {
      ({ error: updateError } = await client.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: metadata
      }));
    }

    if (updateError) {
      console.error("[verify-worker-signup-otp] password reset failed", { userId, status: updateError.status, message: updateError.message });
      return jsonResponse({ error: signInStartFailedMessage }, 500);
    }
  }


  if (!anonKey) {
    console.error("[verify-worker-signup-otp] SUPABASE_ANON_KEY is not configured for this function");
    return jsonResponse({ error: "Server configuration missing" }, 500);
  }

  // Sign in server-side with the anon client to obtain a real, refreshable
  // session directly, rather than relying on a magic-link token exchange
  // completing reliably on the mobile client.
  const anonClient = createClient(supabaseUrl, anonKey);
  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({ email, password });
  if (signInError || !signInData.session) {
    console.error("[verify-worker-signup-otp] signInWithPassword failed", { email, userId, status: signInError?.status, message: signInError?.message, name: signInError?.name });
    return jsonResponse({ error: signInStartFailedMessage }, 500);
  }


  return jsonResponse({
    status: "verified",
    phoneE164,
    email,
    role,
    userId,
    session: {
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token
    }
  });
});
