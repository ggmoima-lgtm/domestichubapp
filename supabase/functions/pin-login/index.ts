import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const pinPattern = /^[0-9]{4,6}$/;
const maxFailedAttempts = 5;
const lockMinutes = 15;
const incorrectLoginMessage = "The mobile number or PIN is incorrect.";
const workerSignInStatuses = new Set([
  "active_available",
  "temporarily_unavailable",
  "hired",
  "not_looking",
]);

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

function randomPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function hashPin(pin: string, salt: string, iterations: number) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations },
    key,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

/** Legacy hash written by earlier versions of create-pin. */
async function legacyHashPin(pin: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function lockedUntil() {
  return new Date(Date.now() + lockMinutes * 60 * 1000).toISOString();
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const body = await request.json().catch(() => null);
  const phoneE164 = toE164(String(body?.phoneE164 ?? body?.phone ?? body?.phoneNumber ?? ""));
  const pin = String(body?.pin ?? body?.code ?? "").trim();
  if (!/^\+27[0-9]{9}$/.test(phoneE164) || !pinPattern.test(pin)) {
    return jsonResponse({ error: incorrectLoginMessage }, 422);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("ANON_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Server configuration missing" }, 500);

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: attempt } = await client
    .from("pin_auth_attempts")
    .select("failed_count, locked_until")
    .eq("phone_e164", phoneE164)
    .maybeSingle();
  if (attempt?.locked_until && new Date(attempt.locked_until).getTime() > Date.now()) {
    return jsonResponse({ error: "Too many attempts. Try again later." }, 429);
  }

  const variants = phoneVariants(phoneE164);
  const { data: profiles } = await client
    .from("profiles")
    .select("id, user_id, email, primary_role, role, status, pin_hash, deleted_at")
    .or([
      `phone_e164.in.(${variants.join(",")})`,
      `phone.in.(${variants.join(",")})`,
    ].join(","));

  const profile = (profiles ?? []).find(
    (row) => !row.deleted_at && (row.status ?? "active") === "active",
  ) ?? null;

  const resolvedRole =
    profile?.primary_role === "worker" || profile?.primary_role === "employer"
      ? profile.primary_role
      : profile?.role === "worker" || profile?.role === "employer"
        ? profile.role
        : null;
  const profileId = String(profile?.id ?? "");
  const authUserId = String(profile?.user_id ?? profile?.id ?? "");

  const { data: credential } = profile?.id
    ? await client
        .from("profile_pin_credentials")
        .select("pin_hash, salt, iterations")
        .eq("profile_id", profile.id)
        .maybeSingle()
    : { data: null };

  let verified = false;
  if (credential) {
    verified = (await hashPin(pin, credential.salt, credential.iterations)) === credential.pin_hash;
  } else if (profile?.pin_hash) {
    // Fall back to the legacy SHA-256 hash so existing accounts keep working.
    const candidates = [...new Set([authUserId, profileId])].filter(Boolean);
    for (const salt of candidates) {
      if ((await legacyHashPin(pin, salt)) === profile.pin_hash) {
        verified = true;
        break;
      }
    }
    if (verified) {
      // Upgrade the stored credential to PBKDF2 on successful legacy login.
      const salt = crypto.randomUUID();
      const iterations = 100000;
      await client.from("profile_pin_credentials").upsert({
        profile_id: profile.id,
        pin_hash: await hashPin(pin, salt, iterations),
        salt,
        iterations,
        updated_at: new Date().toISOString(),
      });
    }
  }

  let profileReady = Boolean(profile && resolvedRole);
  if (profileReady && resolvedRole === "worker") {
    const { data: workerProfile } = await client
      .from("worker_profiles")
      .select("status")
      .eq("profile_id", profileId)
      .maybeSingle();
    profileReady = workerSignInStatuses.has(String(workerProfile?.status ?? ""));
  }
  if (profileReady && resolvedRole === "employer") {
    const { data: employerProfile } = await client
      .from("employer_profiles")
      .select("profile_id")
      .eq("profile_id", profileId)
      .maybeSingle();
    profileReady = Boolean(employerProfile?.profile_id);
  }

  if (!profile || !verified || !profileReady) {
    const failedCount = Number(attempt?.failed_count ?? 0) + 1;
    await client.from("pin_auth_attempts").upsert({
      phone_e164: phoneE164,
      failed_count: failedCount,
      locked_until: failedCount >= maxFailedAttempts ? lockedUntil() : null,
      updated_at: new Date().toISOString(),
    });
    await client.from("security_events").insert({
      profile_id: profile?.id ?? null,
      phone_e164: phoneE164,
      event_type: "pin_login_failed",
    });
    return jsonResponse({ error: incorrectLoginMessage }, 401);
  }

  const { data: authUser } = await client.auth.admin.getUserById(authUserId);
  let email = String(authUser?.user?.email ?? profile.email ?? "").trim().toLowerCase();
  if (!email) return jsonResponse({ error: "This account needs an email before PIN login can be used." }, 422);

  const shouldUseProfileEmail = Boolean(
    profile.email &&
      (!authUser?.user?.email || authUser.user.email.endsWith("@domestichub.local")),
  );
  if (shouldUseProfileEmail) {
    email = String(profile.email).trim().toLowerCase();
    const { data: updatedUser, error: updateUserError } = await client.auth.admin.updateUserById(
      authUserId,
      { email, email_confirm: true },
    );
    if (updateUserError) {
      email = String(authUser?.user?.email ?? email).trim().toLowerCase();
    } else {
      email = String(updatedUser.user.email ?? email).trim().toLowerCase();
    }
  }

  // The caller proved ownership with the correct PIN, so rotate the password
  // server-side and sign in with it to obtain a real, refreshable session.
  const loginPassword = randomPassword();
  const { error: passwordError } = await client.auth.admin.updateUserById(authUserId, {
    password: loginPassword,
  });
  if (passwordError) return jsonResponse({ error: "Could not create login session." }, 500);

  if (!anonKey) return jsonResponse({ error: "Server configuration missing" }, 500);
  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email,
    password: loginPassword,
  });
  if (signInError || !signInData.session) {
    return jsonResponse({ error: "Could not create login session." }, 500);
  }

  await client.from("pin_auth_attempts").upsert({
    phone_e164: phoneE164,
    failed_count: 0,
    locked_until: null,
    updated_at: new Date().toISOString(),
  });
  await client.from("security_events").insert({
    profile_id: profile.id,
    phone_e164: phoneE164,
    event_type: "pin_login_succeeded",
  });

  return jsonResponse({
    status: "verified",
    email,
    role: resolvedRole,
    userId: authUserId,
    onboardingCompleted: true,
    session: {
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    },
  });
});
