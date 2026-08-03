import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function normalizePhone(input: string) {
  const digits = (input || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("27")) return `+${digits}`;
  if (digits.startsWith("0")) return `+27${digits.slice(1)}`;
  return `+${digits}`;
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
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return jsonResponse({ error: "Authentication required" }, 401);

    const body = await req.json().catch(() => null);
    if (!body) return jsonResponse({ error: "Invalid request body" }, 400);

    const pin = String(body.pin ?? "").trim();
    const confirmPin = String(body.confirmPin ?? body.pin ?? "").trim();
    const phoneE164 = normalizePhone(String(body.phoneE164 ?? body.phone ?? ""));

    if (!/^\d{4,6}$/.test(pin)) {
      return jsonResponse({ error: "PIN must be 4 to 6 digits." }, 400);
    }
    if (pin !== confirmPin) {
      return jsonResponse({ error: "PINs do not match." }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Invalid or expired session" }, 401);
    }
    const userId = userData.user.id;

    // Store an irreversible hash of the PIN on the profile.
    const pinHash = await hashPin(pin, userId);
    const now = new Date().toISOString();

    const update: Record<string, unknown> = { pin_hash: pinHash, pin_set_at: now };
    if (phoneE164) {
      update.phone_e164 = phoneE164;
      update.phone = phoneE164;
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update(update)
      .eq("user_id", userId);

    if (profileError) {
      console.error("create-pin: profile update failed", profileError.message);
      return jsonResponse({ error: profileError.message }, 422);
    }

    // Keep password sign-in in sync where the PIN meets the password policy.
    const passwordCandidate = pin.length >= 6 ? pin : `pin-${pin}-${userId.slice(0, 8)}`;
    const { error: passwordError } = await admin.auth.admin.updateUserById(userId, {
      password: passwordCandidate,
    });
    if (passwordError) {
      console.error("create-pin: password sync skipped", passwordError.message);
    }

    // Mark onboarding complete now that the PIN step is done.
    await admin.from("profiles").update({ onboarding_completed: true }).eq("user_id", userId);
    await admin
      .from("onboarding_sessions")
      .update({ status: "completed", current_step: "completed", completed_at: now })
      .eq("profile_id", userId);

    console.log("create-pin: PIN set", { userId, phoneE164 });
    return jsonResponse({ status: "created", success: true, userId });
  } catch (e) {
    console.error("create-pin: unexpected", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Could not set PIN" }, 500);
  }
});
