import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { user_id, credits, amount, payment_ref } = await req.json();

    if (!user_id || !credits || !amount) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get employer email
    const { data: employer } = await supabaseAdmin
      .from("employer_profiles")
      .select("email, full_name")
      .eq("user_id", user_id)
      .maybeSingle();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", user_id)
      .maybeSingle();

    const email = employer?.email || profile?.email;
    const fullName = employer?.full_name || profile?.full_name || "Valued Customer";

    if (!email) {
      console.log("No email found for user:", user_id);
      return new Response(JSON.stringify({ error: "No email on file", sent: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the latest invoice for this payment
    const { data: invoice } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found", sent: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tax = invoice.tax?.toFixed(2) || (amount * 0.15).toFixed(2);
    const total = invoice.total?.toFixed(2) || (amount * 1.15).toFixed(2);
    const invoiceNumber = invoice.invoice_number;
    const invoiceDate = new Date(invoice.created_at).toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Use Lovable AI to send email via Supabase Auth (admin)
    // Since we don't have a dedicated email service, use the Supabase built-in
    // For now, send via the auth.admin API's invite mechanism won't work.
    // Instead, we'll use a simple Resend-like approach via fetch to a mail API.
    // Since no email service is configured, we'll log and store the invoice data.

    // Actually, let's use Supabase's built-in email sending via auth hooks
    // The simplest approach: use the SMTP configured in Supabase to send email

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f0; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #5bb5a2, #4a9e8e); padding: 32px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
    .body { padding: 32px; }
    .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 14px; color: #666; }
    .invoice-meta div { }
    .invoice-meta strong { color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { text-align: left; padding: 12px; background: #f8f8f5; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #eee; }
    td { padding: 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333; }
    .total-row td { border-top: 2px solid #5bb5a2; font-weight: bold; font-size: 16px; color: #5bb5a2; }
    .footer { padding: 24px 32px; background: #f8f8f5; text-align: center; font-size: 12px; color: #999; }
    .badge { display: inline-block; background: #e8f5f1; color: #5bb5a2; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Domestic Hub</h1>
      <p>Credit Purchase Invoice</p>
    </div>
    <div class="body">
      <div class="invoice-meta">
        <div>
          <strong>Invoice #</strong><br>${invoiceNumber}
        </div>
        <div style="text-align: right;">
          <strong>Date</strong><br>${invoiceDate}
        </div>
      </div>
      <p style="font-size: 14px; color: #666;">Hi <strong>${fullName}</strong>,</p>
      <p style="font-size: 14px; color: #666;">Thank you for your purchase! Here's your invoice:</p>
      
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${credits} Credits <span class="badge">Profile Unlocks</span></td>
            <td style="text-align: right;">R${Number(amount).toFixed(2)}</td>
          </tr>
          <tr>
            <td>VAT (15%)</td>
            <td style="text-align: right;">R${tax}</td>
          </tr>
          <tr class="total-row">
            <td>Total</td>
            <td style="text-align: right;">R${total}</td>
          </tr>
        </tbody>
      </table>

      <p style="font-size: 13px; color: #999; margin-top: 24px;">
        Payment Reference: ${payment_ref || "N/A"}
      </p>
    </div>
    <div class="footer">
      <p>Domestic Hub &mdash; Finding trusted helpers made easy</p>
      <p>This is an automated invoice. Please keep it for your records.</p>
    </div>
  </div>
</body>
</html>`;

    // Send email using Supabase Auth admin API (sendRawEmail)
    // Since Supabase doesn't have a direct email API, we'll use the
    // auth.admin.generateLink trick or a simple SMTP approach.
    // The most reliable way without an external email service:
    // Use Supabase's internal mail sending via the auth schema.
    
    // Use the Supabase project's inbuilt email via REST API
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Send via Supabase Auth's admin email (magic link with custom template)
    // This won't work well. Instead, let's try the Resend free tier or log it.
    
    // Best approach: Use the Lovable AI gateway to generate + store,
    // and attempt sending via SMTP if configured.
    
    // For now, let's use a pragmatic approach - store the invoice HTML
    // and attempt to send via the auth.admin.inviteUserByEmail trick
    // Actually, the cleanest solution: just use fetch to send via Resend if available
    
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (resendApiKey) {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Domestic Hub <invoices@domestichub.co.za>",
          to: [email],
          subject: `Invoice ${invoiceNumber} - ${credits} Credits Purchased`,
          html: emailHtml,
        }),
      });

      if (emailResponse.ok) {
        console.log("Invoice email sent successfully to:", email);
        return new Response(JSON.stringify({ sent: true, email }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const errText = await emailResponse.text();
        console.error("Resend error:", errText);
      }
    }

    // Fallback: Use Supabase's built-in email via auth.admin
    // Send a "magic link" style email with the invoice content
    // This is a workaround - ideally use Resend or similar
    console.log(`Invoice ${invoiceNumber} generated for ${email}. Email service not configured - invoice stored in database.`);
    
    return new Response(JSON.stringify({ 
      sent: false, 
      reason: "Email service not configured. Invoice saved to database.",
      invoice_number: invoiceNumber,
      email 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Send invoice error:", error);
    return new Response(JSON.stringify({ error: "Failed to send invoice" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
