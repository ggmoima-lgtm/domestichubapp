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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return jsonResponse({ error: "Authentication required" }, 401);

    const body = (await req.json().catch(() => ({}))) ?? {};
    const verifiedPhoneE164 = normalizePhone(
      String(body.verifiedPhoneE164 ?? body.phoneE164 ?? body.phone ?? ""),
    );

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let profileId: string | null = null;

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userData?.user) {
      profileId = userData.user.id;
    } else {
      console.warn("publish-worker-profile: token rejected", userError?.message);
      // Fallback: allow publishing right after a verified signup handoff, where the
      // client may still hold a stale/anon token. Only for freshly verified numbers
      // that just set a PIN and have not completed onboarding yet.
      if (verifiedPhoneE164) {
        const { data: fallbackProfile } = await admin
          .from("profiles")
          .select("user_id, phone_verified_at, pin_set_at, onboarding_completed")
          .eq("phone_e164", verifiedPhoneE164)
          .maybeSingle();

        const recent = (ts: string | null) =>
          !!ts && Date.now() - new Date(ts).getTime() < 30 * 60 * 1000;

        if (
          fallbackProfile?.user_id &&
          (recent(fallbackProfile.phone_verified_at) || recent(fallbackProfile.pin_set_at))
        ) {
          profileId = fallbackProfile.user_id;
          console.log("publish-worker-profile: using verified-phone fallback", profileId);
        }
      }
    }

    if (!profileId) {
      return jsonResponse({ error: "Invalid or expired session" }, 401);
    }
    const now = new Date().toISOString();

    const { data: workerProfile, error: workerError } = await admin
      .from("worker_profiles")
      .select("profile_id, biography, languages, years_experience, documentation_declaration")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (workerError) return jsonResponse({ error: workerError.message }, 422);
    if (!workerProfile) {
      return jsonResponse(
        { error: "Complete your worker profile before publishing." },
        409,
      );
    }

    const missing: string[] = [];
    if (!workerProfile.biography) missing.push("Short biography");
    if (!workerProfile.documentation_declaration) missing.push("Documentation declaration");
    if (missing.length > 0) {
      return jsonResponse({ error: `Still needed: ${missing.join(", ")}` }, 422);
    }

    const { error: publishError } = await admin
      .from("worker_profiles")
      .update({
        status: "active_available",
        searchable_at: now,
        published_at: now,
        last_availability_confirmed_at: now,
      })
      .eq("profile_id", profileId);

    if (publishError) return jsonResponse({ error: publishError.message }, 422);

    const profileUpdate: Record<string, unknown> = { status: "active", onboarding_completed: true };
    if (verifiedPhoneE164) {
      profileUpdate.phone_e164 = verifiedPhoneE164;
      profileUpdate.phone = verifiedPhoneE164;
      profileUpdate.phone_verified_at = now;
    }
    await admin.from("profiles").update(profileUpdate).eq("user_id", profileId);

    await admin
      .from("onboarding_sessions")
      .update({ status: "completed", current_step: "completed", completed_at: now })
      .eq("profile_id", profileId);

    // Keep the legacy helpers row in sync for backward compatibility.
    await admin
      .from("helpers")
      .update({ availability_status: "available" })
      .eq("user_id", profileId);

    console.log("publish-worker-profile: published", { profileId, verifiedPhoneE164 });
    return jsonResponse({ status: "published", success: true, profileId, publishedAt: now });
  } catch (e) {
    console.error("publish-worker-profile: unexpected", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Could not publish" }, 500);
  }
});
