import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const pinPattern = /^[0-9]{4}$/;
const otpPattern = /^[0-9]{4,8}$/;
const blockedPins = new Set(["0000", "1111", "1234", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999", "4321", "1212"]);
const iterations = 210000;

function isStrongPin(pin: string) {
  if (!pinPattern.test(pin) || blockedPins.has(pin)) return false;
  const digits = pin.split("").map(Number);
  const ascending = digits.every((digit, index) => index === 0 || digit === digits[index - 1] + 1);
  const descending = digits.every((digit, index) => index === 0 || digit === digits[index - 1] - 1);
  return !ascending && !descending;
}

function toE164(raw: string): string {
  let digits = (raw || "").trim().replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("0")) digits = `27${digits.slice(1)}`;
  if (digits.length === 9) digits = `27${digits}`;
  return digits ? `+${digits}` : "";
}

function phoneVariants(e164: string): string[] {
  const digits = e164.slice(1);
  const local = digits.startsWith("27") ? `0${digits.slice(2)}` : digits;
  const bare = digits.startsWith("27") ? digits.slice(2) : digits;
  return [...new Set([e164, digits, local, bare])].filter(Boolean);
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function hashPin(pin: string, salt: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations },
    key,
    256
  );
  return toBase64(new Uint8Array(bits));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const body = await request.json().catch(() => null);
  const phoneE164 = toE164(String(body?.phoneE164 ?? body?.phone ?? ""));
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";
  const confirmPin = typeof body?.confirmPin === "string" ? body.confirmPin : "";
  const role = body?.role === "employer" ? "employer" : "worker";

  if (!/^\+27[0-9]{9}$/.test(phoneE164)) return jsonResponse({ error: "Enter a valid South African mobile number." }, 422);
  if (!otpPattern.test(code)) return jsonResponse({ error: "Enter the SMS code from your phone." }, 422);
  if (!pinPattern.test(pin) || !pinPattern.test(confirmPin)) return jsonResponse({ error: "Enter a four-digit PIN." }, 422);
  if (pin !== confirmPin) return jsonResponse({ error: "The PINs do not match." }, 422);
  if (!isStrongPin(pin)) return jsonResponse({ error: "This PIN is too easy to guess." }, 422);

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
      purpose: "password_reset",
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
    console.error("[reset-pin-with-otp] verify-sms-otp rejected the code", {
      status: verifyResponse.status,
      error: typeof verifyBody.error === "string" ? verifyBody.error.slice(0, 200) : undefined
    });
    const status = verifyResponse.status >= 500 ? 502 : 422;
    return jsonResponse(
      {
        error: status === 502
          ? "We could not verify your SMS code right now. Please try again in a moment."
          : "That SMS code is incorrect or has expired. Please check the code or request a new one."
      },
      status
    );
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const variants = phoneVariants(phoneE164);
  const [byE164, byPhone] = await Promise.all([
    client.from("profiles").select("id, status, deleted_at").in("phone_e164", variants),
    client.from("profiles").select("id, status, deleted_at").in("phone", variants)
  ]);
  let profileError = byE164.error ?? byPhone.error;
  let profiles = [...(byE164.data ?? []), ...(byPhone.data ?? [])].filter(
    (row, index, all) => all.findIndex((other) => other.id === row.id) === index
  );

  if (!profileError && profiles.length === 0) {
    const lastNine = phoneE164.replace(/\D/g, "").slice(-9);
    if (lastNine.length === 9) {
      const loose = await client
        .from("profiles")
        .select("id, status, deleted_at")
        .or(`phone_e164.ilike.%${lastNine},phone.ilike.%${lastNine}`);
      profileError = loose.error;
      const rows = loose.data ?? [];
      if (rows.length === 1) profiles = rows;
    }
  }

  if (profileError) {
    console.error("[reset-pin-with-otp] profile lookup failed", { code: profileError.code, message: profileError.message });
    return jsonResponse({ error: "We could not reset your PIN right now. Please try again." }, 500);
  }

  let profile = (profiles ?? []).find((row) => !row.deleted_at && (row.status ?? "active") === "active");

  if (!profile) {
    const hidden = (profiles ?? []).find((row) => row.status === "deleted" && row.deleted_at);
    if (hidden) {
      const { data: pendingRequest } = await client
        .from("account_deletion_requests")
        .select("id")
        .eq("profile_id", hidden.id)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();
      if (pendingRequest) profile = hidden;
    }
  }

  if (!profile) {
    console.error("[reset-pin-with-otp] no matching account", {
      spellingsTried: variants.length,
      rowsFound: profiles.length,
      statuses: profiles.map((row) => `${row.status ?? "null"}${row.deleted_at ? "+deleted" : ""}`)
    });
    return jsonResponse(
      { error: "We could not find a Domestic Hub account for this mobile number. Please check the number or complete sign-up first." },
      404
    );
  }

  const salt = crypto.randomUUID();
  const { error: credentialError } = await client.from("profile_pin_credentials").upsert(
    {
      profile_id: profile.id,
      pin_hash: await hashPin(pin, salt),
      salt,
      iterations,
      updated_at: new Date().toISOString()
    },
    { onConflict: "profile_id" }
  );
  if (credentialError) {
    console.error("[reset-pin-with-otp] credential upsert failed", { code: credentialError.code, message: credentialError.message });
    return jsonResponse({ error: "We could not save your PIN. Please try again." }, 422);
  }

  await client
    .from("pin_auth_attempts")
    .upsert({ phone_e164: phoneE164, failed_count: 0, locked_until: null, updated_at: new Date().toISOString() });

  await client.from("security_events").insert({
    profile_id: profile.id,
    phone_e164: phoneE164,
    event_type: "pin_reset",
    metadata: { source: "mobile", method: "sms_otp" }
  });

  return jsonResponse({ status: "saved" });
});

After deploying, answer in words and paste raw output where asked:
1. Confirm an OPTIONS request answers 200.
2. Run this READ-ONLY query and paste the RAW result (does the live table have a reset_at column?):
   select column_name from information_schema.columns
   where table_schema = 'public' and table_name = 'profile_pin_credentials' order by ordinal_position;
3. Do NOT test it with a real account.