import { useState, useEffect } from "react";
import { FileText, Eye, ChevronDown, ChevronRight, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import InvoicePreviewSheet from "./InvoicePreviewSheet";
import { InvoiceTemplateData } from "./InvoiceTemplate";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  tax: number;
  total: number;
  credits_purchased: number;
  payment_method: string | null;
  payment_reference: string | null;
  transaction_id: string | null;
  status: string;
  created_at: string;
}

const InvoiceHistory = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceTemplateData | null>(null);
  const [client, setClient] = useState<{ name: string; email?: string | null; phone?: string | null }>({
    name: "Customer",
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setInvoices((data as Invoice[]) || []));

    // Fetch client info for the bill-to section
    Promise.all([
      supabase.from("employer_profiles").select("full_name, email").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("full_name, email, phone").eq("user_id", user.id).maybeSingle(),
    ]).then(([emp, prof]) => {
      setClient({
        name: emp.data?.full_name || prof.data?.full_name || "Customer",
        email: emp.data?.email || prof.data?.email,
        phone: prof.data?.phone,
      });
    });
  }, [user]);

  const openPreview = (inv: Invoice) => {
    setPreviewInvoice({
      ...inv,
      client_name: client.name,
      client_email: client.email,
      client_phone: client.phone,
    });
  };

  return (
    <>
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
                <button
                  key={inv.id}
                  onClick={() => openPreview(inv)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition text-left"
                >
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
                    <Eye size={14} className="text-primary" />
                  </div>
                </button>
              ))
            )}
          </CardContent>
        )}
      </Card>
      <InvoicePreviewSheet
        open={!!previewInvoice}
        onOpenChange={(v) => !v && setPreviewInvoice(null)}
        invoice={previewInvoice}
      />
    </>
  );
};

export default InvoiceHistory;
