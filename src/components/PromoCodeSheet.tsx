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
      const { data, error } = await supabase.rpc("redeem_promo_code", {
        p_code: code.trim(),
      });

      if (error) {
        toast.error("Failed to redeem code");
        return;
      }

      const result = data as { success: boolean; error?: string; bonus_credits?: number };

      if (!result.success) {
        toast.error(result.error || "Failed to redeem code");
        return;
      }

      setRedeemed(true);
      toast.success(`${result.bonus_credits || 0} bonus credits added!`);
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
