import { useState } from "react";
import { ArrowLeft, Trash2, Shield, Clock, Database, AlertTriangle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DeleteAccount = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [step, setStep] = useState<"info" | "confirm">("info");
  const [confirmText, setConfirmText] = useState("");

  const handleDelete = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account");
      if (error || !data?.success) {
        toast.error(data?.error || "Failed to delete account. Please contact support.");
        setDeleting(false);
        return;
      }
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) {
        console.warn("Local sign out after deletion failed:", signOutError);
      }
      toast.success("Your account and all data have been permanently deleted.");
      navigate("/", { replace: true });
    } catch {
      toast.error("Something went wrong. Please try again or contact support.");
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-foreground">Delete Your Account</h1>
        </div>
      </header>

      <main className="px-5 py-6 max-w-lg mx-auto space-y-6 pb-12">
        {/* Warning */}
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle size={20} className="text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              Deleting your account is <strong>permanent and irreversible</strong>. Once processed, your data cannot be recovered.
            </p>
          </CardContent>
        </Card>

        {/* Data That Will Be Deleted */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Database size={18} className="text-primary" /> Data That Will Be Deleted
          </h3>
          <ul className="space-y-2 text-sm text-foreground">
            {[
              "Your profile information (name, photo, bio, skills, location)",
              "Your phone number and email address",
              "Uploaded documents (ID copies, references)",
              "Intro videos",
              "Messages and chat history",
              "Saved helpers and job posts",
              "Credit wallet balance and purchase history",
              "Notification preferences and push tokens",
              "Badge awards and review history",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">✕</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <Separator />

        {/* Data That May Be Retained */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Clock size={18} className="text-primary" /> Data That May Be Retained
          </h3>
          <ul className="space-y-2 text-sm text-foreground">
            {[
              { data: "Payment transaction records and invoices", period: "Retained for 5 years (SARS)" },
              { data: "Abuse reports and moderation records", period: "Retained up to 12 months" },
              { data: "Anonymised analytics data", period: "Retained indefinitely in aggregate form" },
            ].map((item, i) => (
              <li key={i} className="bg-muted/50 rounded-xl p-3 space-y-1">
                <p className="font-medium">{item.data}</p>
                <p className="text-xs text-muted-foreground">{item.period}</p>
              </li>
            ))}
          </ul>
        </section>

        <Separator />

        {/* Delete Action */}
        {user ? (
          step === "info" ? (
            <button
              onClick={() => setStep("confirm")}
              className="flex items-center justify-center gap-2 w-full bg-destructive text-destructive-foreground font-semibold py-3.5 rounded-xl hover:bg-destructive/90 transition-colors text-sm"
            >
              <Trash2 size={18} /> I Want to Delete My Account
            </button>
          ) : (
            <div className="space-y-4">
              <Card className="border-destructive/30">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-semibold text-destructive">
                    Type DELETE to confirm permanent account deletion:
                  </p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                    placeholder="Type DELETE"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-destructive"
                    disabled={deleting}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setStep("info"); setConfirmText(""); }}
                      className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={confirmText !== "DELETE" || deleting}
                      className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {deleting ? <><Loader2 size={16} className="animate-spin" /> Deleting...</> : "Delete Forever"}
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">Please log in to delete your account.</p>
            <button
              onClick={() => navigate("/auth")}
              className="mt-3 px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
            >
              Log In
            </button>
          </div>
        )}

        {/* Contact */}
        <div className="bg-muted rounded-2xl p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">Need help?</p>
          <p className="text-sm text-muted-foreground">
            For questions about data deletion, contact: info@domestichub.co.za
          </p>
        </div>
      </main>
    </div>
  );
};

export default DeleteAccount;
