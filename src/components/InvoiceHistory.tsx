import { useState, useEffect } from "react";
import { FileText, Download, ChevronDown, ChevronRight, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  tax: number;
  total: number;
  credits_purchased: number;
  payment_method: string | null;
  payment_reference: string | null;
  status: string;
  created_at: string;
}

const InvoiceHistory = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from("invoices")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => setInvoices((data as Invoice[]) || []));
    }
  }, [user]);

  const downloadInvoice = (invoice: Invoice) => {
    const content = `
DOMESTIC HUB - INVOICE
========================
Invoice #: ${invoice.invoice_number}
Date: ${new Date(invoice.created_at).toLocaleDateString("en-ZA")}
Status: ${invoice.status.toUpperCase()}

Credits Purchased: ${invoice.credits_purchased}
Subtotal: R${Number(invoice.amount).toFixed(2)}
VAT (15%): R${Number(invoice.tax).toFixed(2)}
Total: R${Number(invoice.total).toFixed(2)}

Payment: ${invoice.payment_method || "N/A"}
Ref: ${invoice.payment_reference || "N/A"}

Thank you for using Domestic Hub.
info@domestichub.co.za
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoice.invoice_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt size={16} className="text-primary" /> Invoice History
        </CardTitle>
        <button onClick={() => setExpanded(!expanded)} className="p-1">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-2">
          {invoices.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No invoices yet</p>
          ) : (
            invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{inv.invoice_number}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(inv.created_at).toLocaleDateString("en-ZA")} · {inv.credits_purchased} credits
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">R{Number(inv.total).toFixed(0)}</span>
                  <button onClick={() => downloadInvoice(inv)} className="p-1.5 rounded-lg hover:bg-muted">
                    <Download size={14} className="text-primary" />
                  </button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default InvoiceHistory;
