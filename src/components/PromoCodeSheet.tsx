import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { X, Gift, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface PromoCodeSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const PromoCodeSheet = ({ isOpen, onClose }: PromoCodeSheetProps) => {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [redeemed, setRedeemed] = useState(false);

  const handleRedeem = async () => {
    if (!user || !code.trim()) return;
    setLoading(true);

    try {
      // Find the promo code
      const { data: promo, error: promoError } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", code.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (promoError || !promo) {
        toast.error("Invalid or expired promo code");
        setLoading(false);
        return;
      }

      // Check expiry
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        toast.error("This promo code has expired");
        setLoading(false);
        return;
      }

      // Check max uses
      if (promo.max_uses && promo.current_uses >= promo.max_uses) {
        toast.error("This promo code has reached its usage limit");
        setLoading(false);
        return;
      }

      // Check if already redeemed by this user
      const { data: existing } = await supabase
        .from("promo_redemptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("promo_code_id", promo.id)
        .maybeSingle();

      if (existing) {
        toast.error("You've already redeemed this code");
        setLoading(false);
        return;
      }

      // Add bonus credits
      if (promo.bonus_credits > 0) {
        // Upsert wallet
        const { data: wallet } = await supabase
          .from("credit_wallets")
          .select("balance")
          .eq("user_id", user.id)
          .maybeSingle();

        const currentBalance = wallet?.balance || 0;
        const newBalance = currentBalance + promo.bonus_credits;

        await supabase.from("credit_wallets").upsert({
          user_id: user.id,
          balance: newBalance,
        }, { onConflict: "user_id" });

        await supabase.from("credit_transactions").insert({
          user_id: user.id,
          amount: promo.bonus_credits,
          type: "promo",
          description: `Promo code: ${promo.code}`,
          balance_after: newBalance,
        });
      }

      // Record redemption
      await supabase.from("promo_redemptions").insert({
        user_id: user.id,
        promo_code_id: promo.id,
      });

      // Increment usage
      await supabase.from("promo_codes").update({
        current_uses: (promo.current_uses || 0) + 1,
      }).eq("id", promo.id);

      setRedeemed(true);
      toast.success(`${promo.bonus_credits} bonus credits added!`);
    } catch (err) {
      toast.error("Failed to redeem code");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-float p-6 space-y-4 animate-slide-up">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Gift size={20} className="text-primary" /> Promo Code
          </h2>
          <button onClick={onClose} className="p-2 rounded-full bg-muted"><X size={18} /></button>
        </div>

        {redeemed ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
              <Check size={32} className="text-green-600" />
            </div>
            <p className="font-bold text-foreground">Code Redeemed!</p>
            <p className="text-sm text-muted-foreground mt-1">Credits have been added to your wallet</p>
            <Button className="mt-4 w-full" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Enter a promo code to receive bonus credits</p>
            <Input
              placeholder="Enter promo code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="text-center font-mono text-lg tracking-wider"
            />
            <Button className="w-full" size="lg" onClick={handleRedeem} disabled={loading || !code.trim()}>
              {loading ? "Redeeming..." : "Redeem Code"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default PromoCodeSheet;
