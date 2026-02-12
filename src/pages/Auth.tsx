import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Phone, User, ArrowRight, ArrowLeft, Briefcase, Sparkles, Shield, Lock, Mail, MapPin } from "lucide-react";
import logo from "@/assets/logo.jpg";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

type SignupStep = "role" | "details" | "otp";
type UserRole = "employer" | "helper";

const fadeSlide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.25, ease: "easeOut" as const },
};

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signupStep, setSignupStep] = useState<SignupStep>("role");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const identifier = loginIdentifier.trim();
      const email = identifier.includes("@")
        ? identifier
        : `${identifier.replace(/\D/g, "")}@phone.domestichub.app`;
      const { error } = await supabase.auth.signInWithPassword({ email, password: loginPassword });
      if (error) throw error;
      navigate("/");
    } catch (error: any) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtp = () => {
    if (!phone) {
      toast({ title: "Please enter your phone number", variant: "destructive" });
      return;
    }
    setOtpSent(true);
    setSignupStep("otp");
    toast({ title: "OTP Sent!", description: "Use code 123456 to verify (simulated)." });
  };

  const handleVerifyOtpAndSignup = async () => {
    if (otpCode !== "123456") {
      toast({ title: "Invalid OTP", description: "Please enter 123456 (simulated).", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const email = signupEmail.trim();
      const password = `phone_${phone.replace(/\D/g, "")}_secure`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName, phone, role: selectedRole },
        },
      });
      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").insert({
          user_id: data.user.id,
          full_name: fullName,
          phone,
          email: signupEmail.trim(),
          city,
          area,
          role: selectedRole!,
          onboarding_completed: false,
        });
        if (profileError) {
          console.error("Profile creation error:", profileError);
        }
      }

      toast({ title: "Account created!", description: "Please check your email to verify your account." });
      navigate("/");
    } catch (error: any) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    const { error } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({ title: "OAuth error", description: String(error), variant: "destructive" });
    }
  };

  const renderRoleSelection = () => (
    <motion.div {...fadeSlide} className="space-y-3">
      <p className="text-center text-sm font-semibold text-muted-foreground mb-1">I am a...</p>
      <button
        type="button"
        onClick={() => { setSelectedRole("employer"); setSignupStep("details"); }}
        className="w-full group relative p-4 rounded-2xl border-2 border-border bg-card hover:border-primary/60 hover:shadow-soft transition-all text-left flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary to-secondary/60 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
          <Briefcase size={22} className="text-secondary-foreground" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-foreground">Employer</p>
          <p className="text-xs text-muted-foreground">Hiring a helper</p>
        </div>
        <ArrowRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
      <button
        type="button"
        onClick={() => { setSelectedRole("helper"); setSignupStep("details"); }}
        className="w-full group relative p-4 rounded-2xl border-2 border-border bg-card hover:border-primary/60 hover:shadow-soft transition-all text-left flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
          <Sparkles size={22} className="text-accent-foreground" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-foreground">Helper</p>
          <p className="text-xs text-muted-foreground">Looking for work</p>
        </div>
        <ArrowRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    </motion.div>
  );

  const renderDetailsStep = () => (
    <motion.div {...fadeSlide} className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <button type="button" onClick={() => setSignupStep("role")} className="p-1.5 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft size={16} className="text-muted-foreground" />
        </button>
        <h2 className="text-sm font-bold text-foreground">Your Details</h2>
      </div>

      <div>
        <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Full Name</Label>
        <div className="relative">
          <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="pl-10 rounded-xl h-12 border-border/80 focus-visible:ring-primary/30"
            required
          />
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Email Address</Label>
        <div className="relative">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="email"
            placeholder="you@example.com"
            value={signupEmail}
            onChange={(e) => setSignupEmail(e.target.value)}
            className="pl-10 rounded-xl h-12 border-border/80 focus-visible:ring-primary/30"
            required
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
          <Shield size={10} /> We'll send a verification link
        </p>
      </div>

      <div>
        <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Phone Number</Label>
        <div className="relative">
          <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="tel"
            placeholder="+27 XX XXX XXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="pl-10 rounded-xl h-12 border-border/80 focus-visible:ring-primary/30"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">City</Label>
          <div className="relative">
            <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="e.g. Johannesburg"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="pl-10 rounded-xl h-12 border-border/80 focus-visible:ring-primary/30"
              required
            />
          </div>
        </div>
        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Area</Label>
          <Input
            placeholder="e.g. Sandton"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="rounded-xl h-12 border-border/80 focus-visible:ring-primary/30"
            required
          />
        </div>
      </div>

      <Button
        type="button"
        className="w-full h-12 rounded-xl font-semibold"
        onClick={() => {
          if (!fullName || !signupEmail || !phone || !city || !area) {
            toast({ title: "Please fill all fields", variant: "destructive" });
            return;
          }
          if (!signupEmail.includes("@")) {
            toast({ title: "Please enter a valid email", variant: "destructive" });
            return;
          }
          handleSendOtp();
        }}
      >
        Send Verification Code
        <ArrowRight size={16} className="ml-1" />
      </Button>
    </motion.div>
  );

  const renderOtpStep = () => (
    <motion.div {...fadeSlide} className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <button type="button" onClick={() => setSignupStep("details")} className="p-1.5 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft size={16} className="text-muted-foreground" />
        </button>
        <h2 className="text-sm font-bold text-foreground">Verify Phone</h2>
      </div>

      <div className="text-center py-3">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Phone size={24} className="text-primary" />
        </div>
        <p className="text-xs text-muted-foreground">
          Enter the 6-digit code sent to<br />
          <span className="font-semibold text-foreground">{phone}</span>
        </p>
      </div>

      <Input
        type="text"
        inputMode="numeric"
        maxLength={6}
        placeholder="000000"
        value={otpCode}
        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
        className="rounded-xl h-14 text-center text-2xl tracking-[0.5em] font-bold border-border/80"
      />

      <Button
        type="button"
        className="w-full h-12 rounded-xl font-semibold"
        onClick={handleVerifyOtpAndSignup}
        disabled={isSubmitting || otpCode.length !== 6}
      >
        {isSubmitting ? "Creating Account..." : "Verify & Create Account"}
      </Button>

      <button
        type="button"
        onClick={handleSendOtp}
        className="w-full text-xs text-primary font-semibold hover:underline"
      >
        Resend Code
      </button>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex flex-col">
      {/* Header with logo */}
      <div className="pt-14 pb-6 px-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex justify-center mb-4"
        >
          <div className="relative">
            <div className="w-20 h-20 rounded-[1.25rem] overflow-hidden bg-card shadow-card border border-border/50">
              <img src={logo} alt="Domestic Hub" className="w-full h-full object-contain" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-sm">
              <Shield size={12} className="text-primary-foreground" />
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
        >
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Domestic Hub</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Find trusted help for your family</p>
        </motion.div>
      </div>

      {/* Main card */}
      <div className="flex-1 px-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-card rounded-3xl shadow-card border border-border/40 p-6 max-w-sm mx-auto"
        >
          {/* Tab toggle */}
          <div className="flex bg-muted/60 rounded-2xl p-1 mb-6">
            <button
              onClick={() => { setMode("login"); setSignupStep("role"); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                mode === "login"
                  ? "bg-card shadow-soft text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                mode === "signup"
                  ? "bg-card shadow-soft text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* OAuth buttons */}
          <div className="space-y-2.5 mb-5">
            <Button
              variant="outline"
              className="w-full rounded-xl h-12 border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-all font-medium"
              onClick={() => handleOAuth("google")}
            >
              <svg className="w-5 h-5 mr-2.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl h-12 border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-all font-medium"
              onClick={() => handleOAuth("apple")}
            >
              <svg className="w-5 h-5 mr-2.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Continue with Apple
            </Button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          {/* Login Form */}
          <AnimatePresence mode="wait">
            {mode === "login" && (
              <motion.form key="login" {...fadeSlide} onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Phone or Email</Label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Phone or email address"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="pl-10 rounded-xl h-12 border-border/80 focus-visible:ring-primary/30"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Password</Label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 rounded-xl h-12 border-border/80 focus-visible:ring-primary/30"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl font-semibold shadow-sm" disabled={isSubmitting}>
                  {isSubmitting ? "Logging in..." : (
                    <>Log In <ArrowRight size={16} className="ml-1" /></>
                  )}
                </Button>
              </motion.form>
            )}

            {/* Signup Flow */}
            {mode === "signup" && (
              <div key="signup">
                {signupStep === "role" && renderRoleSelection()}
                {signupStep === "details" && renderDetailsStep()}
                {signupStep === "otp" && renderOtpStep()}
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="px-5 py-6 text-center">
        <p className="text-[11px] text-muted-foreground">
          By continuing, you agree to our{" "}
          <span className="text-primary font-medium cursor-pointer hover:underline">Terms of Service</span>
        </p>
      </div>
    </div>
  );
};

export default Auth;
