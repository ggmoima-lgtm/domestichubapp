import { useState, useEffect } from "react";
import { ArrowLeft, Trash2, Shield, Clock, Database, AlertTriangle, Loader2, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type Step = "info" | "confirm-prompt" | "otp" | "final-confirm";

const DeleteAccount = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [step, setStep] = useState<Step>("info");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  // Fetch user's phone number
  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("phone")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.phone) setPhone(data.phone);
        });
    }
  }, [user]);

  const maskedPhone = phone
    ? phone.replace(/(\d{3})\d+(\d{2})/, "$1****$2")
    : "your phone";

  const handleSendOtp = async () => {
    if (!phone) {
      toast.error("No phone number found on your account.");
      return;
    }
    setOtpLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms-otp", {
        body: { phone, purpose: "account_delete" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStep("otp");
      toast.success("Verification code sent to " + maskedPhone);
    } catch (error: any) {
      toast.error(error.message || "Failed to send verification code.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error("Enter the 6-digit code.");
      return;
    }
    setOtpLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-sms-otp", {
        body: { phone, code: otpCode, purpose: "account_delete" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOtpVerified(true);
      setStep("final-confirm");
      toast.success("Phone verified. You may now proceed.");
    } catch (error: any) {
      toast.error(error.message || "Verification failed.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!otpVerified) return;
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
          <>
            {step === "info" && (
              <button
                onClick={() => setStep("confirm-prompt")}
                className="flex items-center justify-center gap-2 w-full bg-destructive text-destructive-foreground font-semibold py-3.5 rounded-xl hover:bg-destructive/90 transition-colors text-sm"
              >
                <Trash2 size={18} /> I Want to Delete My Account
              </button>
            )}

            {step === "confirm-prompt" && (
              <Card className="border-destructive/30">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Are you sure?</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        We'll send a verification code to <strong>{maskedPhone}</strong> to confirm your identity before deleting your account.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl"
                      onClick={() => setStep("info")}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 rounded-xl"
                      onClick={handleSendOtp}
                      disabled={otpLoading}
                    >
                      {otpLoading ? (
                        <><Loader2 size={16} className="animate-spin" /> Sending...</>
                      ) : (
                        <><Phone size={16} /> Send Code</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === "otp" && (
              <Card className="border-destructive/30">
                <CardContent className="p-4 space-y-4">
                  <div className="text-center space-y-2">
                    <Shield size={24} className="text-destructive mx-auto" />
                    <p className="text-sm font-semibold text-foreground">Enter verification code</p>
                    <p className="text-xs text-muted-foreground">
                      We sent a 6-digit code to {maskedPhone}
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpLoading}
                      className="text-xs text-primary font-semibold hover:underline"
                    >
                      Resend code
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl"
                      onClick={() => { setStep("info"); setOtpCode(""); }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 rounded-xl"
                      onClick={handleVerifyOtp}
                      disabled={otpLoading || otpCode.length !== 6}
                    >
                      {otpLoading ? (
                        <><Loader2 size={16} className="animate-spin" /> Verifying...</>
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === "final-confirm" && (
              <Card className="border-destructive/30">
                <CardContent className="p-4 space-y-4">
                  <div className="text-center space-y-2">
                    <AlertTriangle size={28} className="text-destructive mx-auto" />
                    <p className="text-base font-bold text-destructive">Last chance</p>
                    <p className="text-sm text-foreground">
                      This action is <strong>permanent</strong>. All your data will be erased and cannot be recovered.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl"
                      onClick={() => { setStep("info"); setOtpCode(""); setOtpVerified(false); }}
                      disabled={deleting}
                    >
                      Keep My Account
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 rounded-xl"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? (
                        <><Loader2 size={16} className="animate-spin" /> Deleting...</>
                      ) : (
                        <><Trash2 size={16} /> Delete Forever</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
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