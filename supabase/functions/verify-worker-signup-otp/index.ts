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

/** Build the likely stored variants of a SA phone number. */
function phoneVariants(raw: string): string[] {
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("0")) digits = `27${digits.slice(1)}`;
  if (digits.length === 9) digits = `27${digits}`;

  const local = digits.startsWith("27") ? `0${digits.slice(2)}` : digits;
  const set = new Set([
    trimmed,
    trimmed.replace(/[^\d+\s]/g, "").trim(),
    digits,
    `+${digits}`,
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

    console.log("verify-worker-signup-otp request:", JSON.stringify({
      phone, codeLength: code.length,
    }));

    if (!phone || !/^\d{6}$/.test(code)) {
      return json({ success: false, error: "Please enter the full 6-digit code." }, 400);
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
      .eq("verified", false)
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

    if (otpRecord.attempts >= otpRecord.max_attempts) {
      return json({
        success: false,
        error: "Too many incorrect attempts. Please request a new code.",
      }, 400);
    }

    await supabase
      .from("otp_codes")
      .update({ attempts: otpRecord.attempts + 1 })
      .eq("id", otpRecord.id);

    if (otpRecord.code !== code) {
      const remaining = otpRecord.max_attempts - (otpRecord.attempts + 1);
      return json({
        success: false,
        error: remaining > 0
          ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : "Incorrect code. Please request a new one.",
      }, 400);
    }

    await supabase
      .from("otp_codes")
      .update({ verified: true, expires_at: new Date().toISOString() })
      .eq("id", otpRecord.id);

    console.log("verify-worker-signup-otp: verified OK", JSON.stringify({ phone: otpRecord.phone }));

    return json({ success: true, verified: true, phone: otpRecord.phone });
  } catch (error) {
    console.error("verify-worker-signup-otp error:", error);
    return json({ success: false, error: "Internal server error" }, 500);
  }
});
