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
    const body = await req.json();
    const { phone, email, purpose = "phone_change", channel = "sms" } = body;

    // Validate channel
    if (channel !== "sms" && channel !== "email") {
      return new Response(JSON.stringify({ error: "Invalid channel. Use 'sms' or 'email'." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For email channel, email is required
    if (channel === "email" && (!email || typeof email !== "string" || !email.includes("@"))) {
      return new Response(JSON.stringify({ error: "Valid email address required for email OTP" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For SMS channel, phone is required
    if (channel === "sms" && (!phone || typeof phone !== "string" || phone.length < 10)) {
      return new Response(JSON.stringify({ error: "Invalid phone number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check for non-public purposes
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

    // The identifier for rate limiting and storage
    const identifier = channel === "sms"
      ? phone.replace(/[^\d+\s]/g, "").trim()
      : email.trim().toLowerCase();

    if (channel === "sms") {
      const sanitizedPhone = identifier;
      if (sanitizedPhone.length < 10 || sanitizedPhone.length > 15) {
        return new Response(JSON.stringify({ error: "Invalid phone number format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Cleanup expired OTPs, then rate limit
    const nowIso = new Date().toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    await supabase
      .from("otp_codes")
      .delete()
      .lt("expires_at", nowIso);

    const { count } = await supabase
      .from("otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("phone", identifier)
      .eq("purpose", purpose)
      .eq("verified", false)
      .gt("expires_at", nowIso)
      .gte("created_at", oneHourAgo);

    if (count && count >= 3) {
      return new Response(
        JSON.stringify({ error: "Too many OTP requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const digits = new Uint32Array(6);
    crypto.getRandomValues(digits);
    const code = Array.from(digits, d => d % 10).join("");

    const { error: insertError } = await supabase.from("otp_codes").insert({
      phone: identifier,
      code,
      user_id: userId,
      purpose,
    });

    if (insertError) {
      console.error("Failed to store OTP:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create OTP" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via chosen channel
    if (channel === "sms") {
      // Send SMS via SMSPortal
      const clientId = Deno.env.get("SMSPORTAL_CLIENT_ID");
      const clientSecret = Deno.env.get("SMSPORTAL_CLIENT_SECRET");

      if (!clientId || !clientSecret) {
        console.error("SMSPortal credentials not configured");
        return new Response(JSON.stringify({ error: "SMS service not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const authCredentials = btoa(`${clientId}:${clientSecret}`);
      const tokenResponse = await fetch("https://rest.smsportal.com/v1/Authentication", {
        method: "GET",
        headers: { Authorization: `Basic ${authCredentials}` },
      });

      if (!tokenResponse.ok) {
        console.error("SMSPortal auth failed:", await tokenResponse.text());
        return new Response(JSON.stringify({ error: "SMS service authentication failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tokenData = await tokenResponse.json();
      const smsToken = tokenData.token;

      const smsResponse = await fetch("https://rest.smsportal.com/v1/BulkMessages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${smsToken}`,
        },
        body: JSON.stringify({
          sendOptions: { testMode: false },
          messages: [
            {
              destination: identifier,
              content: `Your Domestic Hub verification code is: ${code}. It expires in 10 minutes. Do not share this code.`,
            },
          ],
        }),
      });

      if (!smsResponse.ok) {
        const smsError = await smsResponse.text();
        console.error("SMSPortal send error:", smsError);
        return new Response(JSON.stringify({ error: "Failed to send SMS" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Send email via Resend API
      const resendApiKey = Deno.env.get("RESEND_API_KEY");

      if (!resendApiKey) {
        console.error("Resend API key not configured");
        return new Response(JSON.stringify({ error: "Email service not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #1a1a1a; font-size: 22px; margin-bottom: 8px;">Verification Code</h2>
          <p style="color: #555; font-size: 15px; margin-bottom: 24px;">
            Use the code below to verify your identity on Domestic Hub.
          </p>
          <div style="background: #f4f4f5; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${code}</span>
          </div>
          <p style="color: #888; font-size: 13px;">
            This code expires in 10 minutes. Do not share it with anyone.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #aaa; font-size: 11px;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
      `;

      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "Domestic Hub <info@domestichub.co.za>",
          to: [identifier],
          subject: `${code} is your Domestic Hub verification code`,
          html: emailHtml,
        }),
      });

      if (!emailResponse.ok) {
        const emailError = await emailResponse.text();
        console.error("Resend send error:", emailError);
        return new Response(JSON.stringify({ error: "Failed to send email" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const channelLabel = channel === "sms" ? "SMS" : "email";
    return new Response(
      JSON.stringify({ success: true, message: `Verification code sent via ${channelLabel}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-otp error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
