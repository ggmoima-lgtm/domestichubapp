import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, code, purpose = "phone_change" } = await req.json();

    if (!phone || !code || typeof code !== "string" || code.length !== 6) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For signup_verify, no auth required. For other purposes, require auth.
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");

    if (purpose === "signup_verify" || purpose === "password_reset") {
      userId = null;
    } else {
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = claimsData.claims.sub;
    }

    // If the phone looks like an email, use it as-is; otherwise sanitize as phone number
    const isEmail = phone.includes("@");
    const identifier = isEmail ? phone.trim().toLowerCase() : phone.replace(/[^\d+\s]/g, "").trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find the latest unexpired, unverified OTP for this phone+purpose
    let query = supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", identifier)
      .eq("purpose", purpose)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    // For authenticated purposes, also filter by user_id
    if (userId) {
      query = query.eq("user_id", userId);
    } else {
      query = query.is("user_id", null);
    }

    const { data: otpRecord, error: fetchError } = await query.single();

    if (fetchError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: "No valid OTP found. Please request a new code." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (otpRecord.attempts >= otpRecord.max_attempts) {
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please request a new code." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("otp_codes")
      .update({ attempts: otpRecord.attempts + 1 })
      .eq("id", otpRecord.id);

    if (otpRecord.code !== code) {
      const remaining = otpRecord.max_attempts - (otpRecord.attempts + 1);
      return new Response(
        JSON.stringify({ error: `Invalid code. ${remaining} attempt(s) remaining.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("otp_codes")
      .update({ verified: true, expires_at: new Date().toISOString() })
      .eq("id", otpRecord.id);

    // For phone_change/phone_verify, update profile phone
    if (userId && (purpose === "phone_change" || purpose === "phone_verify")) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ phone: identifier })
        .eq("user_id", userId);

      if (profileError) {
        console.error("Failed to update profile phone:", profileError);
        return new Response(
          JSON.stringify({ error: "Verification succeeded but failed to update phone" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("helpers")
        .update({ phone: identifier })
        .eq("user_id", userId);
    }

    // Clean up expired OTPs
    await supabase
      .from("otp_codes")
      .delete()
      .lt("expires_at", new Date().toISOString());

    return new Response(
      JSON.stringify({ success: true, verified: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("verify-sms-otp error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
