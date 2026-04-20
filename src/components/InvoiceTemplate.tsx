import { forwardRef, useEffect, useState } from "react";
import QRCode from "qrcode";
import logo from "@/assets/logo.jpg";

export interface InvoiceTemplateData {
  invoice_number: string;
  created_at: string;
  status: string;
  amount: number;
  tax: number;
  total: number;
  credits_purchased: number;
  payment_method: string | null;
  payment_reference: string | null;
  transaction_id: string | null;
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
}

const TEAL = "#58B39E";
const TEAL_LIGHT = "#DFF1EC";
const TEXT_DARK = "#1F2933";
const TEXT_MUTED = "#6B7280";
const BORDER = "#EEF2F1";

const InvoiceTemplate = forwardRef<HTMLDivElement, { invoice: InvoiceTemplateData }>(
  ({ invoice }, ref) => {
    const [qrDataUrl, setQrDataUrl] = useState<string>("");
    const isPaid = invoice.status?.toLowerCase() === "paid";
    const dateStr = new Date(invoice.created_at).toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    useEffect(() => {
      const payload = JSON.stringify({
        inv: invoice.invoice_number,
        ref: invoice.payment_reference,
        total: Number(invoice.total).toFixed(2),
      });
      QRCode.toDataURL(payload, {
        width: 200,
        margin: 0,
        color: { dark: TEXT_DARK, light: "#FFFFFF" },
      })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(""));
    }, [invoice]);

    return (
      <div
        ref={ref}
        style={{
          width: "100%",
          maxWidth: 720,
          margin: "0 auto",
          background: "#FFFFFF",
          color: TEXT_DARK,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          padding: 40,
          borderRadius: 16,
          boxShadow: "0 4px 24px rgba(15, 23, 42, 0.06)",
          fontSize: 14,
          lineHeight: 1.5,
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 32,
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={logo}
              alt="Domestic Hub"
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                objectFit: "contain",
                background: "#FFFFFF",
              }}
            />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: TEXT_DARK }}>
                Domestic Hub
              </div>
              <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                domestichub.co.za
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 4,
                color: TEAL,
              }}
            >
              INVOICE
            </div>
            <div style={{ fontSize: 13, color: TEXT_DARK, fontWeight: 600, marginTop: 6 }}>
              {invoice.invoice_number}
            </div>
            <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
              {dateStr}
            </div>
          </div>
        </div>

        {/* Bill To + Status */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 24,
            gap: 24,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 1.5,
                color: TEXT_MUTED,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              BILL TO
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_DARK }}>
              {invoice.client_name}
            </div>
            {invoice.client_email && (
              <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
                {invoice.client_email}
              </div>
            )}
            {invoice.client_phone && (
              <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
                {invoice.client_phone}
              </div>
            )}
          </div>
          <div>
            <span
              style={{
                display: "inline-block",
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
                background: isPaid ? "#E6F7EF" : "#FEF3E2",
                color: isPaid ? "#0E8A5F" : "#B26A00",
              }}
            >
              {isPaid ? "● PAID" : "● PENDING"}
            </span>
          </div>
        </div>

        {/* Service Card */}
        <div
          style={{
            background: TEAL_LIGHT,
            borderRadius: 14,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.5,
              color: TEAL,
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            PURCHASE DETAILS
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <div style={{ flex: "1 1 45%", minWidth: 140 }}>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>Service</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_DARK }}>
                Profile Unlock Credits
              </div>
            </div>
            <div style={{ flex: "1 1 45%", minWidth: 140 }}>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>Quantity</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_DARK }}>
                {invoice.credits_purchased} credits
              </div>
            </div>
            <div style={{ flex: "1 1 45%", minWidth: 140 }}>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>Payment Method</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_DARK }}>
                {invoice.payment_method || "Paystack"}
              </div>
            </div>
            <div style={{ flex: "1 1 45%", minWidth: 140 }}>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>Date Issued</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_DARK }}>
                {dateStr}
              </div>
            </div>
          </div>
        </div>

        {/* Charges */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
              fontSize: 13,
              color: TEXT_DARK,
            }}
          >
            <span>Service Fee ({invoice.credits_purchased} credits)</span>
            <span>R{Number(invoice.amount).toFixed(2)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
              fontSize: 13,
              color: TEXT_MUTED,
              borderTop: `1px solid ${BORDER}`,
            }}
          >
            <span>VAT (15%)</span>
            <span>R{Number(invoice.tax).toFixed(2)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "16px 0 4px",
              borderTop: `1px solid ${BORDER}`,
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700, color: TEXT_DARK }}>
              Total
            </span>
            <span style={{ fontSize: 22, fontWeight: 700, color: TEAL }}>
              R{Number(invoice.total).toFixed(2)}
            </span>
          </div>
        </div>

        {/* QR + Reference */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            padding: "20px 0",
            borderTop: `1px solid ${BORDER}`,
            borderBottom: `1px solid ${BORDER}`,
            marginBottom: 20,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 1.5,
                color: TEXT_MUTED,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              REFERENCE NUMBER
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: TEXT_DARK,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                wordBreak: "break-all",
              }}
            >
              {invoice.payment_reference || invoice.transaction_id || "—"}
            </div>
          </div>
          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt="QR Code"
              style={{
                width: 80,
                height: 80,
                borderRadius: 8,
                background: "#FFFFFF",
                padding: 4,
                border: `1px solid ${BORDER}`,
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4, lineHeight: 1.5 }}>
            Domestic Hub is a connection platform and does not employ service providers.
          </div>
          <div style={{ fontSize: 11, color: TEAL, fontWeight: 600 }}>
            support@domestichub.co.za
          </div>
        </div>
      </div>
    );
  }
);

InvoiceTemplate.displayName = "InvoiceTemplate";

export default InvoiceTemplate;
