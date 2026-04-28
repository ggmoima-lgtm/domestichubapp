import { useState } from "react";
import { Phone, X, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface ChangePhoneSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhone: string;
  onChanged: (newPhone: string) => void;
}

const ChangePhoneSheet = ({ isOpen, onClose, currentPhone, onChanged }: ChangePhoneSheetProps) => {
  useEscapeKey(isOpen, onClose);
  const { user } = useAuth();
  const [step, setStep] = useState<"enter" | "verify">("enter");
  const [newPhone, setNewPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSendOtp = async () => {
    if (!newPhone || newPhone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }
    if (newPhone === currentPhone) {
      toast.error("New number must be different from current");
      return;
    }
    if (!user) return;

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms-otp", {
        body: { phone: newPhone, purpose: "phone_change" },
      });

      if (error) throw new Error(error.message || "Failed to send OTP");
      if (data?.error) throw new Error(data.error);

      setStep("verify");
      toast.success("Verification code sent to " + newPhone);
    } catch (error: any) {
      toast.error(error.message || "Failed to send verification code");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-sms-otp", {
        body: { phone: newPhone, code: otpCode, purpose: "phone_change" },
      });

      if (error) throw new Error(error.message || "Verification failed");
      if (data?.error) throw new Error(data.error);

      toast.success("Phone number updated successfully!");
      onChanged(newPhone);
      onClose();
      setStep("enter");
      setNewPhone("");
      setOtpCode("");
    } catch (error: any) {
      toast.error(error.message || "Failed to verify code");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setOtpCode("");
    await handleSendOtp();
  };

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-float animate-slide-up max-h-[70vh] overflow-y-auto">
        <div className="sticky top-0 bg-card pt-3 pb-2 flex justify-center z-10">
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-muted hover:bg-muted/80">
          <X size={18} />
        </button>

        <div className="px-5 pb-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Phone size={24} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Change Phone Number</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Current: <span className="font-semibold">{currentPhone}</span>
            </p>
          </div>

          {step === "enter" && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">New Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="+27 XX XXX XXXX"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="rounded-xl h-12"
                />
              </div>
              <div className="bg-muted/40 rounded-xl p-3 flex items-start gap-2">
                <ShieldCheck size={14} className="text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  We'll send a verification code via SMS to your new number for security.
                </p>
              </div>
              <Button className="w-full h-12 rounded-xl" onClick={handleSendOtp} disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" /> Sending...
                  </>
                ) : (
                  <>
                    Send Verification Code <ArrowRight size={16} />
                  </>
                )}
              </Button>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-4">
              <p className="text-center text-xs text-muted-foreground">
                Enter the 6-digit code sent via SMS to <span className="font-semibold text-foreground">{newPhone}</span>
              </p>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                className="rounded-xl h-14 text-center text-2xl tracking-[0.5em] font-bold"
              />
              <Button
                className="w-full h-12 rounded-xl"
                onClick={handleVerify}
                disabled={isSubmitting || otpCode.length !== 6}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" /> Verifying...
                  </>
                ) : (
                  "Verify & Update"
                )}
              </Button>
              <div className="flex justify-between">
                <button
                  onClick={() => { setStep("enter"); setOtpCode(""); }}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  Use a different number
                </button>
                <button
                  onClick={handleResend}
                  disabled={isSending}
                  className="text-xs text-primary font-semibold hover:underline disabled:opacity-50"
                >
                  {isSending ? "Sending..." : "Resend code"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangePhoneSheet;
