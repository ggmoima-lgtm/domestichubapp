import { useState, useEffect } from "react";
import { Lock, Unlock, Coins, X, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface UnlockConfirmSheetProps {
  isOpen: boolean;
  onClose: () => void;
  helperName: string;
  helperId: string;
  onUnlocked: () => void;
  onBuyCredits: () => void;
}

const UnlockConfirmSheet = ({ isOpen, onClose, helperName, helperId, onUnlocked, onBuyCredits }: UnlockConfirmSheetProps) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      supabase
        .from("credit_wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          setBalance(data?.balance ?? 0);
        });
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const hasCredits = (balance ?? 0) >= 1;

  const handleUnlock = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc("deduct_credits_for_unlock", {
        p_employer_id: user.id,
        p_helper_id: helperId,
        p_credits: 1,
      });
      if (error) throw error;
      if (data === false) {
        toast.error("Insufficient credits.");
        return;
      }
      toast.success(`${helperName}'s full profile unlocked for 30 days!`);
      onUnlocked();
    } catch (err: any) {
      console.error("Unlock error:", err);
      toast.error("Failed to unlock profile. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-float animate-slide-up">
        <div className="sticky top-0 bg-card pt-3 pb-2 flex justify-center z-10">
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>

        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors">
          <X size={18} />
        </button>

        <div className="px-5 pb-8">
          <div className="text-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              {hasCredits ? <Unlock size={24} className="text-primary" /> : <Coins size={24} className="text-primary" />}
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {hasCredits ? "Unlock Full Profile" : "Credits Needed"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {hasCredits
                ? `Use 1 credit to view ${helperName}'s full profile for 30 days.`
                : "You don't have enough credits to unlock this profile."}
            </p>
          </div>

          {/* Current balance */}
          <div className="flex items-center justify-between bg-muted/40 rounded-2xl p-4 mb-5">
            <div className="flex items-center gap-2">
              <Coins size={18} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">Your Balance</span>
            </div>
            <span className="text-lg font-bold text-foreground">{balance ?? 0} credits</span>
          </div>

          {hasCredits && (
            <>
              {/* What you get */}
              <div className="bg-muted/40 rounded-2xl p-4 mb-5">
                <p className="text-xs font-bold text-foreground mb-2 uppercase tracking-wide">What you'll unlock</p>
                <div className="grid grid-cols-2 gap-2">
                  {["Phone number", "Intro video", "Work history & references", "Reviews", "Direct messaging", "30-day access"].map((item) => (
                    <div key={item} className="flex items-center gap-1.5">
                      <CheckCircle size={12} className="text-primary shrink-0" />
                      <span className="text-xs text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button size="lg" className="w-full" onClick={handleUnlock} disabled={isProcessing}>
                <Unlock size={18} />
                {isProcessing ? "Unlocking..." : "Use 1 Credit to Unlock"}
              </Button>
            </>
          )}

          {!hasCredits && (
            <Button size="lg" className="w-full" onClick={onBuyCredits}>
              <Coins size={18} />
              Buy Credits
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnlockConfirmSheet;
