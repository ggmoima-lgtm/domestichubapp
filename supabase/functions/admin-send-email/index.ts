import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: jsonHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), { status: 500, headers: jsonHeaders });
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: jsonHeaders });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: jsonHeaders });

    const { to, subject, message } = await req.json();
    if (!to || !subject || !message) {
      return new Response(JSON.stringify({ error: "to, subject, and message are required" }), { status: 400, headers: jsonHeaders });
    }

    // Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Domestic Hub <info@domestichub.co.za>",
        to: Array.isArray(to) ? to : [to],
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #1B5E20; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 20px;">Domestic Hub</h1>
            </div>
            <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1a1a1a; font-size: 18px; margin: 0 0 16px;">${subject}</h2>
              <div style="color: #555; font-size: 14px; line-height: 1.6;">${message.replace(/\n/g, '<br/>')}</div>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;"/>
              <p style="color: #999; font-size: 12px; margin: 0;">This email was sent by Domestic Hub admin. If you have questions, contact info@domestichub.co.za</p>
            </div>
          </div>
        `,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Resend error:", result);
      return new Response(JSON.stringify({ error: result.message || "Failed to send email" }), { status: 500, headers: jsonHeaders });
    }

    // Log the action
    await adminClient.from("audit_logs").insert({
      actor_id: caller.id,
      action: "admin_send_email",
      target_type: "email",
      details: { to, subject, resend_id: result.id },
    });

    return new Response(JSON.stringify({ success: true, id: result.id }), { headers: jsonHeaders });
  } catch (error) {
    console.error("Admin send email error:", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), { status: 500, headers: jsonHeaders });
  }
});
