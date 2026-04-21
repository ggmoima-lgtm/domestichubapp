import { useState } from "react";
import { Lock, Unlock, Users, Zap, Crown, X, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Bundle {
  id: string;
  label: string;
  profiles: number;
  price: number;
  perProfile: number;
  icon: React.ReactNode;
  popular?: boolean;
  savings?: string;
}

const bundles: Bundle[] = [
  {
    id: "bundle_3",
    label: "Starter",
    profiles: 3,
    price: 150,
    perProfile: 50,
    icon: <Users size={20} />,
  },
  {
    id: "bundle_5",
    label: "Popular",
    profiles: 5,
    price: 250,
    perProfile: 50,
    icon: <Zap size={20} />,
    popular: true,
    savings: "Best value",
  },
  {
    id: "bundle_10",
    label: "Premium",
    profiles: 10,
    price: 500,
    perProfile: 50,
    icon: <Crown size={20} />,
    savings: "Most profiles",
  },
];

interface UnlockBundleSheetProps {
  isOpen: boolean;
  onClose: () => void;
  helperName: string;
  helperId: string;
  onUnlocked: () => void;
}

const UnlockBundleSheet = ({ isOpen, onClose, helperName, helperId, onUnlocked }: UnlockBundleSheetProps) => {
  const { user } = useAuth();
  const [selectedBundle, setSelectedBundle] = useState<string>("bundle_5");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handlePurchase = async () => {
    if (!user) {
      toast.error("Please log in to unlock profiles.");
      return;
    }

    const bundle = bundles.find((b) => b.id === selectedBundle);
    if (!bundle) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("initialize-payment", {
        body: {
          email: user.email || "customer@example.com",
          amount: bundle.price,
          workerId: helperId,
          workerName: helperName,
          callbackUrl: `${window.location.origin}/home?payment=unlock&worker=${helperId}&bundle=${bundle.id}&tab=profile`,
        },
      });

      if (error) throw error;

      if (data?.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
      } else {
        throw new Error("No payment URL returned");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to initialize payment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-float animate-slide-up max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-card pt-3 pb-2 flex justify-center z-10">
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>

        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors">
          <X size={18} />
        </button>

        <div className="px-5 pb-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Unlock size={24} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Unlock Full Profile</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Get full access to contact details, work history, and more.
            </p>
          </div>

          {/* What you get */}
          <div className="bg-muted/40 rounded-2xl p-4 mb-5">
            <p className="text-xs font-bold text-foreground mb-2 uppercase tracking-wide">What's included</p>
            <div className="grid grid-cols-2 gap-2">
              {["Full name & phone", "Work history", "Intro video (full)", "Availability details", "Salary expectation", "Languages & experience"].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle size={12} className="text-primary shrink-0" />
                  <span className="text-xs text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bundle options */}
          <div className="space-y-3 mb-5">
            {bundles.map((bundle) => (
              <button
                key={bundle.id}
                onClick={() => setSelectedBundle(bundle.id)}
                className={`w-full p-4 rounded-2xl border-2 transition-all text-left relative ${
                  selectedBundle === bundle.id
                    ? "border-primary bg-primary/5 shadow-soft"
                    : "border-border hover:border-primary/30"
                }`}
              >
                {bundle.popular && (
                  <Badge className="absolute -top-2.5 right-3 bg-primary text-primary-foreground text-[10px] px-2">
                    Most Popular
                  </Badge>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      selectedBundle === bundle.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {bundle.icon}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{bundle.profiles} profiles</p>
                      <p className="text-xs text-muted-foreground">
                        R{bundle.perProfile}/profile · 30-day access
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">R{bundle.price}</p>
                    {bundle.savings && (
                      <p className="text-[10px] text-primary font-semibold">{bundle.savings}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Terms note */}
          <p className="text-[10px] text-muted-foreground text-center mb-4">
            We charge for access to candidate profile details and contact information. Access expires after 30 days.
          </p>

          <Button
            size="lg"
            className="w-full"
            onClick={handlePurchase}
            disabled={isProcessing}
          >
            <Lock size={18} />
            {isProcessing ? "Processing..." : `Unlock for R${bundles.find((b) => b.id === selectedBundle)?.price}`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UnlockBundleSheet;
