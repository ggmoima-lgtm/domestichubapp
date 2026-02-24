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
  credits: number;
  amount: number;
  tax: string;
  total: string;
  paymentRef: string;
  transactionId: string;
}) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f0; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #5bb5a2, #4a9e8e); padding: 32px; text-align: center; color: white; }
    .logo { width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 12px; background: white; object-fit: contain; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .header p { margin: 6px 0 0; opacity: 0.9; font-size: 14px; }
    .paid-badge { display: inline-block; background: rgba(255,255,255,0.25); color: white; padding: 6px 20px; border-radius: 20px; font-size: 14px; font-weight: 700; letter-spacing: 2px; margin-top: 12px; border: 2px solid rgba(255,255,255,0.5); }
    .body { padding: 32px; }
    .invoice-meta { margin-bottom: 24px; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .meta-label { color: #999; }
    .meta-value { color: #333; font-weight: 600; }
    .divider { border: none; border-top: 1px solid #eee; margin: 20px 0; }
    .greeting { font-size: 14px; color: #666; margin-bottom: 20px; }
    .greeting strong { color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { text-align: left; padding: 12px; background: #f8f8f5; color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 2px solid #eee; }
    th:last-child { text-align: right; }
    td { padding: 14px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333; }
    td:last-child { text-align: right; font-weight: 600; }
    .subtotal-row td { color: #666; font-size: 13px; }
    .tax-row td { color: #666; font-size: 13px; border-bottom: 2px solid #5bb5a2; }
    .total-row td { font-weight: 700; font-size: 18px; color: #5bb5a2; border-bottom: none; }
    .company-details { padding: 24px 32px; background: #f8f8f5; }
    .company-details h3 { margin: 0 0 8px; font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 1px; }
    .company-details p { margin: 2px 0; font-size: 12px; color: #666; }
    .footer { padding: 20px 32px; text-align: center; font-size: 11px; color: #bbb; border-top: 1px solid #f0f0f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${LOGO_URL}" alt="Domestic Hub" class="logo" />
      <h1>${COMPANY_DETAILS.name}</h1>
      <p>Credit Purchase Invoice</p>
      <div class="paid-badge">✓ PAID</div>
    </div>
    <div class="body">
      <div class="invoice-meta">
        <div class="meta-row">
          <span class="meta-label">Invoice Number</span>
          <span class="meta-value">${invoice.invoiceNumber}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Date</span>
          <span class="meta-value">${invoice.invoiceDate}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Payment Reference</span>
          <span class="meta-value">${invoice.paymentRef}</span>
        </div>
        ${invoice.transactionId ? `<div class="meta-row">
          <span class="meta-label">Transaction ID</span>
          <span class="meta-value">${invoice.transactionId}</span>
        </div>` : ""}
        <div class="meta-row">
          <span class="meta-label">Status</span>
          <span class="meta-value" style="color: #5bb5a2; font-weight: 700;">PAID</span>
        </div>
      </div>
      
      <hr class="divider" />
      
      <p class="greeting">Hi <strong>${invoice.fullName}</strong>,</p>
      <p class="greeting">Thank you for your purchase. Here is your tax invoice:</p>
      
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${invoice.credits} Profile Unlock Credits</td>
            <td>R${Number(invoice.amount).toFixed(2)}</td>
          </tr>
          <tr class="subtotal-row">
            <td>Subtotal</td>
            <td>R${Number(invoice.amount).toFixed(2)}</td>
          </tr>
          <tr class="tax-row">
            <td>VAT (15%)</td>
            <td>R${invoice.tax}</td>
          </tr>
          <tr class="total-row">
            <td>Total</td>
            <td>R${invoice.total}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="company-details">
      <h3>Company Details</h3>
      <p><strong>${COMPANY_DETAILS.name}</strong></p>
      <p>${COMPANY_DETAILS.address}</p>
      <p>Email: ${COMPANY_DETAILS.email}</p>
      <p>Web: ${COMPANY_DETAILS.website}</p>
    </div>
    
    <div class="footer">
      <p>This is an automatically generated tax invoice. Please retain for your records.</p>
      <p>&copy; ${new Date().getFullYear()} ${COMPANY_DETAILS.name}. All rights reserved.</p>
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
