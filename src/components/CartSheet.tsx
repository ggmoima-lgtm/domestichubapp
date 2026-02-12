import { X, ShoppingCart, Trash2, Lock, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface CartSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRICE_PER_PROFILE = 50;
const MIN_CHECKOUT_AMOUNT = 150;
const MIN_PROFILES = MIN_CHECKOUT_AMOUNT / PRICE_PER_PROFILE; // 3

const CartSheet = ({ isOpen, onClose }: CartSheetProps) => {
  const { items, removeItem, clearCart, itemCount } = useCart();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const totalPrice = itemCount * PRICE_PER_PROFILE;

  const handleCheckout = async () => {
    if (!user) {
      toast.error("Please log in to unlock profiles.");
      return;
    }
    if (itemCount === 0) {
      toast.error("No helpers selected.");
      return;
    }

    setIsProcessing(true);
    try {
      const helperIds = items.map((i) => i.id).join(",");
      const { data, error } = await supabase.functions.invoke("initialize-payment", {
        body: {
          email: user.email || "customer@example.com",
          amount: totalPrice,
          workerId: helperIds,
          workerName: `${itemCount} profile${itemCount > 1 ? "s" : ""}`,
          callbackUrl: `${window.location.origin}/home?payment=unlock&worker=${helperIds}&bundle=cart_${itemCount}`,
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
          <div className="text-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <ShoppingCart size={24} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Your Helpers</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {itemCount === 0
                ? "No profiles added yet"
                : `${itemCount} profile${itemCount > 1 ? "s" : ""} selected`}
            </p>
          </div>

          {/* What you get */}
          <div className="bg-muted/40 rounded-2xl p-4 mb-5">
            <p className="text-xs font-bold text-foreground mb-2 uppercase tracking-wide">Each unlock includes</p>
            <div className="grid grid-cols-2 gap-2">
              {["Full name & details", "Intro video access", "In-app messaging", "30-day access"].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle size={12} className="text-primary shrink-0" />
                  <span className="text-xs text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cart items */}
          {items.length > 0 ? (
            <div className="space-y-2 mb-5">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-2xl">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-primary-light shrink-0">
                    <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.role}</p>
                  </div>
                  <p className="text-sm font-bold text-foreground shrink-0">R{PRICE_PER_PROFILE}</p>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 mb-5">
              <ShoppingCart size={40} className="text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Browse helpers and add them to your list to unlock their full profiles.</p>
            </div>
          )}

          {items.length > 0 && (
            <>
              {/* Total */}
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl mb-4">
                <div>
                  <p className="text-sm font-bold text-foreground">Total</p>
                  <p className="text-xs text-muted-foreground">R{PRICE_PER_PROFILE}/profile × {itemCount}</p>
                </div>
                <p className="text-2xl font-bold text-primary">R{totalPrice}</p>
              </div>

              <p className="text-[10px] text-muted-foreground text-center mb-4">
                Access to unlocked profiles expires after 30 days.
              </p>

              {totalPrice < MIN_CHECKOUT_AMOUNT && (
                <p className="text-xs text-destructive font-medium text-center mb-3">
                  Add at least {MIN_PROFILES - itemCount} more profile{MIN_PROFILES - itemCount > 1 ? "s" : ""} to checkout (minimum R{MIN_CHECKOUT_AMOUNT})
                </p>
              )}

              <Button
                size="lg"
                className="w-full mb-3"
                onClick={handleCheckout}
                disabled={isProcessing || totalPrice < MIN_CHECKOUT_AMOUNT}
              >
                <Lock size={18} />
                {isProcessing ? "Processing..." : `Pay R${totalPrice}`}
              </Button>

              <button
                onClick={clearCart}
                className="w-full text-sm text-muted-foreground hover:text-destructive font-medium transition-colors"
              >
                Clear all
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartSheet;
