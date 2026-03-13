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
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
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
    const userId = claimsData.claims.sub;

    // Parse request
    const { phone, purpose = "phone_change" } = await req.json();

    if (!phone || typeof phone !== "string" || phone.length < 10) {
      return new Response(JSON.stringify({ error: "Invalid phone number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize phone - only allow digits, +, spaces
    const sanitizedPhone = phone.replace(/[^\d+\s]/g, "").trim();
    if (sanitizedPhone.length < 10 || sanitizedPhone.length > 15) {
      return new Response(JSON.stringify({ error: "Invalid phone number format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for DB operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limit: max 3 OTPs per phone per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("otp_codes")
      .select("*", { count: "exact", head: true })
      .eq("phone", sanitizedPhone)
      .gte("created_at", oneHourAgo);

    if (count && count >= 3) {
      return new Response(
        JSON.stringify({ error: "Too many OTP requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate 6-digit OTP
    const code = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join("");

    // Store OTP
    const { error: insertError } = await supabase.from("otp_codes").insert({
      phone: sanitizedPhone,
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

    // Authenticate with SMSPortal to get token
    const authCredentials = btoa(`${clientId}:${clientSecret}`);
    const tokenResponse = await fetch("https://rest.smsportal.com/v1/Authentication", {
      method: "GET",
      headers: {
        Authorization: `Basic ${authCredentials}`,
      },
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

    // Send SMS
    const smsResponse = await fetch("https://rest.smsportal.com/v1/BulkMessages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${smsToken}`,
      },
      body: JSON.stringify({
        sendOptions: {
          testMode: false,
        },
        messages: [
          {
            destination: sanitizedPhone,
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

    return new Response(
      JSON.stringify({ success: true, message: "Verification code sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-sms-otp error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
