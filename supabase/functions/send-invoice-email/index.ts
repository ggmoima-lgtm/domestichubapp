import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOGO_URL = "https://qlvcirkyharrarblgdue.supabase.co/storage/v1/object/public/avatars/logo.jpg";

const COMPANY_DETAILS = {
  name: "Domestic Hub",
  address: "South Africa",
  email: "info@domestichub.co.za",
  website: "www.domestichub.co.za",
};

function generateInvoiceHtml(invoice: {
  invoiceNumber: string;
  invoiceDate: string;
  fullName: string;
  email: string;
  credits: number;
  amount: number;
  tax: string;
  total: string;
  paymentRef: string;
  transactionId: string;
  status: string;
}) {
  const isPaid = invoice.status?.toLowerCase() === "paid";
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
</head>
<body style="margin:0;padding:20px;background:#F7F9F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1F2933;">
  <div style="max-width:640px;margin:0 auto;background:#FFFFFF;border-radius:16px;box-shadow:0 4px 24px rgba(15,23,42,0.06);padding:40px;">
    <!-- Header -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td valign="top" style="text-align:left;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td><img src="${LOGO_URL}" alt="Domestic Hub" width="48" height="48" style="border-radius:12px;display:block;" /></td>
            <td style="padding-left:12px;vertical-align:middle;">
              <div style="font-size:16px;font-weight:700;color:#1F2933;">Domestic Hub</div>
              <div style="font-size:12px;color:#6B7280;">domestichub.co.za</div>
            </td>
          </tr></table>
        </td>
        <td valign="top" style="text-align:right;">
          <div style="font-size:22px;font-weight:700;letter-spacing:4px;color:#58B39E;">INVOICE</div>
          <div style="font-size:13px;color:#1F2933;font-weight:600;margin-top:6px;">${invoice.invoiceNumber}</div>
          <div style="font-size:12px;color:#6B7280;margin-top:2px;">${invoice.invoiceDate}</div>
        </td>
      </tr>
    </table>

    <!-- Bill To + Status -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td valign="top">
          <div style="font-size:10px;letter-spacing:1.5px;color:#6B7280;font-weight:600;margin-bottom:6px;">BILL TO</div>
          <div style="font-size:14px;font-weight:600;color:#1F2933;">${invoice.fullName}</div>
          <div style="font-size:12px;color:#6B7280;margin-top:2px;">${invoice.email}</div>
        </td>
        <td valign="top" align="right">
          <span style="display:inline-block;padding:6px 14px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:1px;background:${isPaid ? "#E6F7EF" : "#FEF3E2"};color:${isPaid ? "#0E8A5F" : "#B26A00"};">
            ${isPaid ? "● PAID" : "● PENDING"}
          </span>
        </td>
      </tr>
    </table>

    <!-- Service Card -->
    <div style="background:#DFF1EC;border-radius:14px;padding:20px;margin-bottom:24px;">
      <div style="font-size:10px;letter-spacing:1.5px;color:#58B39E;font-weight:700;margin-bottom:10px;">PURCHASE DETAILS</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-bottom:12px;width:50%;">
            <div style="font-size:11px;color:#6B7280;">Service</div>
            <div style="font-size:14px;font-weight:600;color:#1F2933;">Profile Unlock Credits</div>
          </td>
          <td style="padding-bottom:12px;width:50%;">
            <div style="font-size:11px;color:#6B7280;">Quantity</div>
            <div style="font-size:14px;font-weight:600;color:#1F2933;">${invoice.credits} credits</div>
          </td>
        </tr>
        <tr>
          <td>
            <div style="font-size:11px;color:#6B7280;">Payment Reference</div>
            <div style="font-size:13px;font-weight:600;color:#1F2933;font-family:monospace;word-break:break-all;">${invoice.paymentRef}</div>
          </td>
          <td>
            <div style="font-size:11px;color:#6B7280;">Date Issued</div>
            <div style="font-size:14px;font-weight:600;color:#1F2933;">${invoice.invoiceDate}</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Charges -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:10px 0;font-size:13px;color:#1F2933;">Service Fee (${invoice.credits} credits)</td>
        <td style="padding:10px 0;font-size:13px;color:#1F2933;text-align:right;">R${Number(invoice.amount).toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;font-size:13px;color:#6B7280;border-top:1px solid #EEF2F1;">VAT (15%)</td>
        <td style="padding:10px 0;font-size:13px;color:#6B7280;text-align:right;border-top:1px solid #EEF2F1;">R${invoice.tax}</td>
      </tr>
      <tr>
        <td style="padding:16px 0 4px;border-top:1px solid #EEF2F1;font-size:16px;font-weight:700;color:#1F2933;">Total</td>
        <td style="padding:16px 0 4px;border-top:1px solid #EEF2F1;font-size:22px;font-weight:700;color:#58B39E;text-align:right;">R${invoice.total}</td>
      </tr>
    </table>

    <!-- Footer -->
    <div style="border-top:1px solid #EEF2F1;padding-top:20px;text-align:center;">
      <div style="font-size:11px;color:#6B7280;margin-bottom:6px;line-height:1.5;">
        Domestic Hub is a connection platform and does not employ service providers.
      </div>
      <div style="font-size:11px;color:#58B39E;font-weight:600;">support@domestichub.co.za</div>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { user_id, credits, amount, payment_ref, transaction_id } = await req.json();

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

    const invoiceData = {
      invoiceNumber,
      invoiceDate,
      fullName,
      credits,
      amount,
      tax,
      total,
      paymentRef: payment_ref || "N/A",
      transactionId: transaction_id || invoice.transaction_id || "",
    };

    const emailHtml = generateInvoiceHtml(invoiceData);

    // Store invoice HTML as PDF-equivalent in storage
    const pdfPath = `${user_id}/${invoiceNumber}.html`;
    const htmlBlob = new Blob([emailHtml], { type: "text/html" });
    await supabaseAdmin.storage
      .from("invoice-pdfs")
      .upload(pdfPath, htmlBlob, { contentType: "text/html", upsert: true });

    // Send email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (resendApiKey) {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Domestic Hub <onboarding@resend.dev>",
          to: [email],
          subject: `Invoice ${invoiceNumber} - ${credits} Credits Purchased | PAID`,
          html: emailHtml,
        }),
      });

      if (emailResponse.ok) {
        console.log("Invoice email sent successfully to:", email);
        return new Response(JSON.stringify({ sent: true, email, invoice_number: invoiceNumber }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const errText = await emailResponse.text();
        console.error("Resend error:", errText);
        return new Response(JSON.stringify({ sent: false, reason: errText, invoice_number: invoiceNumber }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`Invoice ${invoiceNumber} stored. No RESEND_API_KEY configured.`);
    return new Response(JSON.stringify({ 
      sent: false, 
      reason: "Email service not configured",
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
