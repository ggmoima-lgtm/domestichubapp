import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

/** Normalize a SA phone number to E.164 (+27...). */
function toE164(raw: string): string {
  let digits = (raw || "").trim().replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("0")) digits = `27${digits.slice(1)}`;
  if (digits.length === 9) digits = `27${digits}`;
  return digits ? `+${digits}` : "";
}

function phoneVariants(raw: string): string[] {
  const e164 = toE164(raw);
  if (!e164) return [];
  const digits = e164.slice(1);
  const local = digits.startsWith("27") ? `0${digits.slice(2)}` : digits;
  const bare = digits.startsWith("27") ? digits.slice(2) : digits;
  return [...new Set([raw.trim(), e164, digits, local, bare])].filter(Boolean);
}

async function hashPin(pin: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) ?? {};
    const phoneRaw = String(body.phoneE164 ?? body.phone ?? body.phoneNumber ?? "");
    const pin = String(body.pin ?? body.code ?? "").trim();
    const phoneE164 = toE164(phoneRaw);

    if (!phoneE164 || !/^\d{4,6}$/.test(pin)) {
      return jsonResponse({ success: false, error: "Enter your mobile number and 4-6 digit PIN." }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const variants = phoneVariants(phoneRaw);

    let { data: profile } = await admin
      .from("profiles")
      .select("user_id, email, pin_hash, role, primary_role, onboarding_completed")
      .eq("phone_e164", phoneE164)
      .maybeSingle();

    if (!profile) {
      const { data: rows } = await admin
        .from("profiles")
        .select("user_id, email, pin_hash, role, primary_role, onboarding_completed")
        .in("phone", variants)
        .limit(1);
      profile = rows?.[0] ?? null;
    }

    if (!profile?.user_id) {
      console.log("pin-login: no profile for", phoneE164);
      return jsonResponse({ success: false, error: "Mobile number not found. Please sign up." }, 404);
    }

    if (!profile.pin_hash) {
      return jsonResponse(
        { success: false, error: "No PIN set for this number. Please reset your PIN." },
        409,
      );
    }

    const candidate = await hashPin(pin, profile.user_id);
    if (candidate !== profile.pin_hash) {
      console.log("pin-login: incorrect PIN", { userId: profile.user_id });
      return jsonResponse({ success: false, error: "Incorrect PIN. Please try again." }, 401);
    }

    const { data: userData } = await admin.auth.admin.getUserById(profile.user_id);
    const authEmail = userData?.user?.email ?? profile.email;
    if (!authEmail) {
      return jsonResponse({ success: false, error: "Could not start your session." }, 500);
    }

    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: authEmail,
    });

    if (linkError || !link?.properties?.hashed_token) {
      console.error("pin-login: generateLink failed", linkError?.message);
      return jsonResponse({ success: false, error: "Could not start your session." }, 500);
    }

    const { data: verified, error: verifyErr } = await anon.auth.verifyOtp({
      type: "magiclink",
      token_hash: link.properties.hashed_token,
    });

    if (verifyErr || !verified?.session) {
      console.error("pin-login: verifyOtp failed", verifyErr?.message);
      return jsonResponse({ success: false, error: "Could not start your session." }, 500);
    }

    const role = profile.primary_role ?? profile.role ?? "worker";

    console.log("pin-login: success", { userId: profile.user_id, role });

    return jsonResponse({
      success: true,
      status: "signed_in",
      userId: profile.user_id,
      user_id: profile.user_id,
      role,
      onboardingCompleted: profile.onboarding_completed ?? true,
      phoneE164,
      access_token: verified.session.access_token,
      refresh_token: verified.session.refresh_token,
      accessToken: verified.session.access_token,
      refreshToken: verified.session.refresh_token,
      session: {
        access_token: verified.session.access_token,
        refresh_token: verified.session.refresh_token,
        expires_at: verified.session.expires_at,
        expires_in: verified.session.expires_in,
        token_type: verified.session.token_type,
        user: verified.session.user,
      },
      user: verified.user,
    });
  } catch (e) {
    console.error("pin-login: unexpected", e);
    return jsonResponse({ success: false, error: "Internal server error" }, 500);
  }
});
