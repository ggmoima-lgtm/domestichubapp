import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LowCreditBannerProps {
  onBuyCredits?: () => void;
}

const LowCreditBanner = ({ onBuyCredits }: LowCreditBannerProps) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("credit_wallets").select("balance").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setBalance(data?.balance ?? 0));
  }, [user]);

  if (dismissed || balance === null || balance > 2) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-3 mx-4 mb-3 flex items-center gap-3">
      <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          {balance === 0 ? "No credits remaining" : `Only ${balance} credit${balance === 1 ? '' : 's'} left`}
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400">Buy credits to unlock helper profiles</p>
      </div>
      <Button size="sm" variant="outline" className="flex-shrink-0 text-xs gap-1 border-amber-300" onClick={onBuyCredits}>
        <CreditCard size={12} /> Buy
      </Button>
    </div>
  );
};

export default LowCreditBanner;
