import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mail } from "lucide-react";
import logo from "@/assets/logo.jpg";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const LandingPage = () => {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const { toast } = useToast();
  const [showRolePicker, setShowRolePicker] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/splash" replace />;
  }

  return (
    <div className="h-[100dvh] bg-gradient-to-b from-primary/8 via-background to-background flex flex-col">
      {/* Top half — Logo + Tagline */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <img
            src={logo}
            alt="Domestic Hub"
            className="w-24 h-24 rounded-3xl shadow-lg mx-auto"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mt-5 text-center"
        >
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Domestic Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-[260px] mx-auto leading-relaxed">
            Join a trusted community of verified helpers and employers
          </p>
        </motion.div>
      </div>

      {/* Bottom half — Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.45 }}
        className="px-6 pb-8 space-y-3 max-w-sm mx-auto w-full"
      >
        {/* Sign in with Email */}
        <Button
          size="lg"
          className="w-full h-14 rounded-full font-semibold text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
          onClick={() => navigate("/auth")}
        >
          <Mail size={18} className="mr-2.5" />
          Sign in
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Join now */}
        <AnimatePresence mode="wait">
          {!showRolePicker ? (
            <motion.p
              key="join-link"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -8 }}
              className="text-center text-sm text-muted-foreground"
            >
              New to Domestic Hub?{" "}
              <button
                onClick={() => setShowRolePicker(true)}
                className="text-primary font-bold hover:underline"
              >
                Join now
              </button>
            </motion.p>
          ) : (
            <motion.div
              key="role-picker"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-2"
            >
              <p className="text-center text-xs font-semibold text-muted-foreground mb-2">
                I want to...
              </p>
              <button
                onClick={() => navigate("/auth?role=employer&mode=signup")}
                className="w-full group flex items-center justify-between p-3.5 rounded-2xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
              >
                <div className="text-left">
                  <p className="font-bold text-sm text-foreground">Find Help</p>
                  <p className="text-xs text-muted-foreground">I'm an employer</p>
                </div>
                <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
              <button
                onClick={() => navigate("/auth?role=helper&mode=signup")}
                className="w-full group flex items-center justify-between p-3.5 rounded-2xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
              >
                <div className="text-left">
                  <p className="font-bold text-sm text-foreground">Find Work</p>
                  <p className="text-xs text-muted-foreground">I'm a helper or gardener</p>
                </div>
                <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
              <button
                onClick={() => setShowRolePicker(false)}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Terms footer */}
        <p className="text-[11px] text-center text-muted-foreground pt-2 leading-relaxed">
          By clicking Continue, you agree to Domestic Hub's{" "}
          <a href="/terms" className="text-primary font-medium hover:underline">User Agreement</a>,{" "}
          <a href="/privacy" className="text-primary font-medium hover:underline">Privacy Policy</a>,
          and <a href="/off-platform-liability" className="text-primary font-medium hover:underline">Cookie Policy</a>.
        </p>
      </motion.div>
    </div>
  );
};

export default LandingPage;
