import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Normalize a SA phone number to E.164 (+27...). */
function toE164(raw: string): string {
  let digits = raw.trim().replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("0")) digits = `27${digits.slice(1)}`;
  if (digits.length === 9) digits = `27${digits}`;
  return `+${digits}`;
}

/** Build the likely stored variants of a SA phone number. */
function phoneVariants(raw: string): string[] {
  const trimmed = raw.trim();
  const e164 = toE164(trimmed);
  const digits = e164.slice(1);
  const local = digits.startsWith("27") ? `0${digits.slice(2)}` : digits;
  const set = new Set([
    trimmed,
    trimmed.replace(/[^\d+\s]/g, "").trim(),
    digits,
    e164,
    local,
  ]);
  return [...set].filter(Boolean);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const phone: string = body.phone ?? body.phoneNumber ?? body.msisdn ?? "";
    const code: string = String(body.code ?? body.otp ?? body.otpCode ?? "").trim();
    const role: string = (body.role ?? "worker").toString();

    console.log("verify-worker-signup-otp request:", JSON.stringify({
      phone, codeLength: code.length, role,
    }));

    if (!phone || !/^\d{6}$/.test(code)) {
      return json({ success: false, error: "Please enter the full 6-digit code." }, 400);
    }

    if (!["worker", "employer"].includes(role)) {
      return json({ success: false, error: "Invalid role." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const variants = phoneVariants(phone);

    const { data: rows, error: fetchError } = await supabase
      .from("otp_codes")
      .select("*")
      .in("phone", variants)
      .in("purpose", ["signup_verify", "phone_verify", "phone_change"])
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    const otpRecord = rows?.[0];

    if (fetchError || !otpRecord) {
      console.log("verify-worker-signup-otp: no matching OTP", JSON.stringify({
        variants, fetchError: fetchError?.message ?? null,
      }));
      return json({
        success: false,
        error: "Code expired or not found. Tap 'Resend code' to get a new one.",
      }, 400);
    }

    if (!otpRecord.verified && otpRecord.attempts >= otpRecord.max_attempts) {
      return json({
        success: false,
        error: "Too many incorrect attempts. Please request a new code.",
      }, 400);
    }

    if (otpRecord.code !== code) {
      if (!otpRecord.verified) {
        await supabase
          .from("otp_codes")
          .update({ attempts: otpRecord.attempts + 1 })
          .eq("id", otpRecord.id);
      }
      const remaining = otpRecord.max_attempts - (otpRecord.attempts + 1);
      return json({
        success: false,
        error: remaining > 0
          ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : "Incorrect code. Please request a new one.",
      }, 400);
    }

    if (!otpRecord.verified) {
      await supabase
        .from("otp_codes")
        .update({ verified: true })
        .eq("id", otpRecord.id);
    } else {
      console.log("verify-worker-signup-otp: retrying previously verified code", JSON.stringify({
        phoneE164: toE164(phone), role,
      }));
    }

    // --- Create or find the auth user for this phone ---
    const phoneE164 = toE164(phone);
    const localDigits = phoneE164.slice(1);
    const email = `${localDigits}@helper.domestichub.co.za`;

    let userId: string | null = null;

    // Try to find an existing profile row that maps this phone to a user
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("user_id, email")
      .in("phone", variants)
      .limit(1)
      .maybeSingle();

    let authEmail = email;

    if (existingProfile?.user_id) {
      userId = existingProfile.user_id;
      const { data: existingUser } = await supabase.auth.admin.getUserById(userId);
      if (existingUser?.user?.email) authEmail = existingUser.user.email;
    }

    if (!userId) {
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email,
        phone: phoneE164,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { role, phone_e164: phoneE164 },
      });

      if (createError) {
        // Most likely the user already exists — locate them by email
        console.log("createUser failed, looking up existing:", createError.message);
        const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const match = list?.users?.find(
          (u) => u.email === email || u.phone === localDigits || u.phone === phoneE164,
        );
        if (!match) {
          console.error("verify-worker-signup-otp: unable to create or find auth user");
          return json({ success: false, error: "Could not create your account. Please try again." }, 500);
        }
        userId = match.id;
        authEmail = match.email ?? email;
      } else {
        userId = created.user!.id;
        authEmail = created.user!.email ?? email;
      }
    }

    // --- Establish a session server-side so the client doesn't have to verify ---
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    let accessToken: string | null = null;
    let refreshToken: string | null = null;

    const { data: sessionLink } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: authEmail,
    });

    if (sessionLink?.properties?.hashed_token) {
      const { data: verified, error: verifyErr } = await anon.auth.verifyOtp({
        type: "magiclink",
        token_hash: sessionLink.properties.hashed_token,
      });
      if (verifyErr) {
        console.error("verify-worker-signup-otp: server-side verifyOtp failed", verifyErr.message);
      } else {
        accessToken = verified.session?.access_token ?? null;
        refreshToken = verified.session?.refresh_token ?? null;
      }
    }

    // --- A second, unconsumed magic link for clients that verify themselves ---
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: authEmail,
    });

    if ((linkError || !linkData?.properties?.hashed_token) && !accessToken) {
      console.error("verify-worker-signup-otp: generateLink failed", linkError?.message);
      return json({ success: false, error: "Could not start your session. Please try again." }, 500);
    }

    const tokenHash = linkData?.properties?.hashed_token ?? null;

    console.log("verify-worker-signup-otp: verified OK", JSON.stringify({
      phoneE164, role, userId, hasSession: !!accessToken,
    }));

    return json({
      status: "verified",
      success: true,
      verified: true,
      phoneE164,
      phone: phoneE164,
      email: authEmail,
      tokenHash,
      token_hash: tokenHash,
      type: "magiclink",
      role,
      userId,
      user_id: userId,
      access_token: accessToken,
      refresh_token: refreshToken,
      accessToken,
      refreshToken,
      session: accessToken && refreshToken
        ? { access_token: accessToken, refresh_token: refreshToken }
        : null,
    });
  } catch (error) {
    console.error("verify-worker-signup-otp error:", error);
    return json({ success: false, error: "Internal server error" }, 500);
  }
});
