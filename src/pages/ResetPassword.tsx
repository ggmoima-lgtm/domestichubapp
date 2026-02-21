import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.jpg";
import { motion } from "framer-motion";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });
    // Check hash for recovery token
    if (window.location.hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Password updated!", description: "You can now log in with your new password." });
      navigate("/auth");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-5">
        <div className="w-20 h-20 overflow-hidden mb-4">
          <img src={logo} alt="Domestic Hub" className="w-full h-full object-contain mix-blend-multiply" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Invalid Reset Link</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          This link is invalid or has expired. Please request a new password reset.
        </p>
        <Button onClick={() => navigate("/auth")} className="rounded-xl">
          Back to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background px-5">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-3xl shadow-card border border-border/40 p-6 max-w-sm w-full"
      >
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 overflow-hidden">
            <img src={logo} alt="Domestic Hub" className="w-full h-full object-contain mix-blend-multiply" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-foreground text-center mb-1">Set New Password</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">Enter your new password below</p>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">New Password</Label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 rounded-xl h-12 border-border/80 focus-visible:ring-primary/30"
                required
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Confirm Password</Label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 rounded-xl h-12 border-border/80 focus-visible:ring-primary/30"
                required
              />
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-[11px] text-destructive mt-1.5">Passwords do not match</p>
            )}
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl font-semibold" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : (
              <>Update Password <ArrowRight size={16} className="ml-1" /></>
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
