import { useState, useEffect } from "react";
import { Wallet, Plus, History, ChevronRight, Coins } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface CreditBundle {
  id: string;
  credits: number;
  price: number;
  label: string;
  popular?: boolean;
}

const creditBundles: CreditBundle[] = [
  { id: "credits_3", credits: 3, price: 150, label: "3 Credits" },
  { id: "credits_5", credits: 5, price: 250, label: "5 Credits", popular: true },
  { id: "credits_10", credits: 10, price: 450, label: "10 Credits" },
];

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
  balance_after: number;
}

interface CreditWalletCardProps {
  onPurchaseComplete?: () => void;
}

const CreditWalletCard = ({ onPurchaseComplete }: CreditWalletCardProps) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showBundles, setShowBundles] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (user) fetchWallet();
  }, [user]);

  const fetchWallet = async () => {
    if (!user) return;
    const { data: wallet } = await supabase
      .from("credit_wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    setBalance(wallet?.balance || 0);

    const { data: txns } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setTransactions((txns as Transaction[]) || []);
  };

  const handlePurchase = async (bundle: CreditBundle) => {
    if (!user) return;
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("initialize-payment", {
        body: {
          email: user.email || "customer@example.com",
          amount: bundle.price,
          workerId: "credit_purchase",
          workerName: bundle.label,
          callbackUrl: `${window.location.origin}/home?payment=credits&credits=${bundle.credits}&amount=${bundle.price}&bundle=${bundle.id}`,
        },
      });
      if (error) throw error;
      if (data?.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
      } else {
        throw new Error("No payment URL returned");
      }
    } catch (error) {
      console.error("Credit purchase error:", error);
      toast.error("Failed to initialize payment.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet size={16} className="text-primary" /> Credit Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Balance Display */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Available Credits</p>
            <p className="text-3xl font-bold text-foreground">{balance}</p>
            <p className="text-xs text-muted-foreground">1 credit = 1 profile unlock</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Coins size={24} className="text-primary" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 gap-1"
            onClick={() => setShowBundles(!showBundles)}
          >
            <Plus size={14} /> Buy Credits
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History size={14} /> History
          </Button>
        </div>

        {/* Bundle Options */}
        {showBundles && (
          <div className="space-y-2 pt-2">
            {creditBundles.map((bundle) => (
              <button
                key={bundle.id}
                onClick={() => handlePurchase(bundle)}
                disabled={isProcessing}
                className="w-full p-3 rounded-xl border-2 border-border hover:border-primary/40 transition-all text-left flex items-center justify-between relative"
              >
                {bundle.popular && (
                  <Badge className="absolute -top-2 right-3 bg-primary text-primary-foreground text-[10px] px-2">
                    Popular
                  </Badge>
                )}
                <div>
                  <p className="font-bold text-foreground text-sm">{bundle.credits} Credits</p>
                  <p className="text-xs text-muted-foreground">R{(bundle.price / bundle.credits).toFixed(0)}/credit</p>
                </div>
                <p className="text-lg font-bold text-foreground">R{bundle.price}</p>
              </button>
            ))}
          </div>
        )}

        {/* Transaction History */}
        {showHistory && (
          <div className="space-y-2 pt-2 max-h-48 overflow-y-auto">
            {transactions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No transactions yet</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-2 rounded-xl bg-muted/30">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{tx.description || tx.type}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()} · Balance: {tx.balance_after}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${tx.amount > 0 ? "text-green-600" : "text-destructive"}`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {balance < 3 && (
          <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-xl p-2 text-center">
            ⚠️ Low credits — buy more to unlock helper profiles
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CreditWalletCard;
