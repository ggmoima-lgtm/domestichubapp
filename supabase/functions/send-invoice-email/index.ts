import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const LOGO_URL = "https://qlvcirkyharrarblgdue.supabase.co/storage/v1/object/public/avatars/logo.jpg";
const SUPPORT_EMAIL = "info@domestichub.co.za";

function isInternalCaller(request: Request): boolean {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const serviceRole = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  return Boolean(serviceRole) && token === serviceRole;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(value: unknown): string {
  const number = Number(value);
  return `R${(Number.isFinite(number) ? number : 0).toFixed(2)}`;
}

interface InvoiceView {
  invoiceNumber: string;
  invoiceDate: string;
  fullName: string;
  email: string;
  credits: number;
  amount: number;
  paymentRef: string;
  status: string;
}

function generateInvoiceHtml(invoice: InvoiceView) {
  const isPaid = invoice.status.toLowerCase() === "paid";
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
</head>
<body style="margin:0;padding:20px;background:#F7F9F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1F2933;">
  <div style="max-width:640px;margin:0 auto;background:#FFFFFF;border-radius:16px;box-shadow:0 4px 24px rgba(15,23,42,0.06);padding:40px;">
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
          <div style="font-size:13px;color:#1F2933;font-weight:600;margin-top:6px;">${escapeHtml(invoice.invoiceNumber)}</div>
          <div style="font-size:12px;color:#6B7280;margin-top:2px;">${escapeHtml(invoice.invoiceDate)}</div>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td valign="top">
          <div style="font-size:10px;letter-spacing:1.5px;color:#6B7280;font-weight:600;margin-bottom:6px;">BILL TO</div>
          <div style="font-size:14px;font-weight:600;color:#1F2933;">${escapeHtml(invoice.fullName)}</div>
          <div style="font-size:12px;color:#6B7280;margin-top:2px;">${escapeHtml(invoice.email)}</div>
        </td>
        <td valign="top" align="right">
          <span style="display:inline-block;padding:6px 14px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:1px;background:${isPaid ? "#E6F7EF" : "#FEF3E2"};color:${isPaid ? "#0E8A5F" : "#B26A00"};">
            ${isPaid ? "&#9679; PAID" : "&#9679; PENDING"}
          </span>
        </td>
      </tr>
    </table>

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
            <div style="font-size:14px;font-weight:600;color:#1F2933;">${escapeHtml(invoice.credits)} credits</div>
          </td>
        </tr>
        <tr>
          <td>
            <div style="font-size:11px;color:#6B7280;">Payment Reference</div>
            <div style="font-size:13px;font-weight:600;color:#1F2933;font-family:monospace;word-break:break-all;">${escapeHtml(invoice.paymentRef)}</div>
          </td>
          <td>
            <div style="font-size:11px;color:#6B7280;">Date Issued</div>
            <div style="font-size:14px;font-weight:600;color:#1F2933;">${escapeHtml(invoice.invoiceDate)}</div>
          </td>
        </tr>
      </table>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:10px 0;font-size:13px;color:#1F2933;">Profile unlock credits (${escapeHtml(invoice.credits)})</td>
        <td style="padding:10px 0;font-size:13px;color:#1F2933;text-align:right;">${money(invoice.amount)}</td>
      </tr>
      <tr>
        <td style="padding:16px 0 4px;border-top:1px solid #EEF2F1;font-size:16px;font-weight:700;color:#1F2933;">Total paid</td>
        <td style="padding:16px 0 4px;border-top:1px solid #EEF2F1;font-size:22px;font-weight:700;color:#58B39E;text-align:right;">${money(invoice.amount)}</td>
      </tr>
    </table>

    <div style="border-top:1px solid #EEF2F1;padding-top:20px;text-align:center;">
      <div style="font-size:11px;color:#6B7280;margin-bottom:6px;line-height:1.5;">
        Domestic Hub is a connection platform and does not employ service providers.
      </div>
      <div style="font-size:11px;color:#58B39E;font-weight:600;">${SUPPORT_EMAIL}</div>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!isInternalCaller(request)) return jsonResponse({ error: "Forbidden" }, 403);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Server configuration missing" }, 500);
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const { user_id, credits, amount, payment_ref } = await request.json();
    if (!user_id || !credits || !amount) return jsonResponse({ error: "Missing required fields" }, 400);

    const { data: employer } = await admin
      .from("employer_profiles")
      .select("email, full_name")
      .eq("user_id", user_id)
      .maybeSingle();
    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", user_id)
      .maybeSingle();

    const email = employer?.email || profile?.email;
    const fullName = employer?.full_name || profile?.full_name || "Valued Customer";
    if (!email) {
      console.log("No email found for user:", user_id);
      return jsonResponse({ error: "No email on file", sent: false });
    }

    let invoiceQuery = admin.from("invoices").select("*").eq("user_id", user_id);
    if (payment_ref) invoiceQuery = invoiceQuery.eq("payment_reference", payment_ref);
    const { data: invoice } = await invoiceQuery.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!invoice) return jsonResponse({ error: "Invoice not found", sent: false });

    const invoiceNumber = String(invoice.invoice_number);
    const view: InvoiceView = {
      invoiceNumber,
      invoiceDate: new Date(invoice.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }),
      fullName,
      email,
      credits: Number(credits),
      amount: Number(invoice.amount ?? amount),
      paymentRef: String(payment_ref || invoice.payment_reference || "N/A"),
      status: String(invoice.status || "paid")
    };
    const emailHtml = generateInvoiceHtml(view);

    await admin.storage
      .from("invoice-pdfs")
      .upload(`${user_id}/${invoiceNumber}.html`, new Blob([emailHtml], { type: "text/html" }), {
        contentType: "text/html",
        upsert: true
      });

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log(`Invoice ${invoiceNumber} stored. No RESEND_API_KEY configured.`);
      return jsonResponse({ sent: false, reason: "Email service not configured", invoice_number: invoiceNumber });
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: Deno.env.get("INVOICE_FROM_EMAIL") || "Domestic Hub <onboarding@resend.dev>",
        to: [email],
        subject: `Invoice ${invoiceNumber} - ${credits} Credits Purchased | PAID`,
        html: emailHtml
      })
    });

    if (!emailResponse.ok) {
      console.error("Resend error:", await emailResponse.text());
      return jsonResponse({ sent: false, reason: "Email provider rejected the message", invoice_number: invoiceNumber });
    }
    return jsonResponse({ sent: true, invoice_number: invoiceNumber });
  } catch (error) {
    console.error("Send invoice error:", error);
    return jsonResponse({ error: "Failed to send invoice" }, 500);
  }
});
