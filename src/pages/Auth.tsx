import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Phone, User, ArrowRight, ArrowLeft, Briefcase, Sparkles } from "lucide-react";
import logo from "@/assets/logo.jpg";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

type SignupStep = "role" | "details" | "otp";
type UserRole = "employer" | "helper";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signupStep, setSignupStep] = useState<SignupStep>("role");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login fields
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup fields
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
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
      // Use phone as email format for login
      const email = `${loginPhone.replace(/\D/g, "")}@phone.domestichub.app`;
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
    // Simulated OTP
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
      const email = `${phone.replace(/\D/g, "")}@phone.domestichub.app`;
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
        // Create profile
        const { error: profileError } = await supabase.from("profiles").insert({
          user_id: data.user.id,
          full_name: fullName,
          phone,
          role: selectedRole!,
          onboarding_completed: false,
        });
        if (profileError) {
          console.error("Profile creation error:", profileError);
        }
      }

      toast({ title: "Account created!", description: "Let's set up your profile." });
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
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground text-center mb-2">I am a...</h2>
      <button
        type="button"
        onClick={() => { setSelectedRole("employer"); setSignupStep("details"); }}
        className={`w-full p-5 rounded-2xl border-2 transition-all text-left flex items-center gap-4 ${
          selectedRole === "employer"
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 bg-card"
        }`}
      >
        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
          <Briefcase size={24} className="text-secondary-foreground" />
        </div>
        <div>
          <p className="font-bold text-foreground">Employer</p>
          <p className="text-sm text-muted-foreground">Hiring a helper</p>
        </div>
      </button>
      <button
        type="button"
        onClick={() => { setSelectedRole("helper"); setSignupStep("details"); }}
        className={`w-full p-5 rounded-2xl border-2 transition-all text-left flex items-center gap-4 ${
          selectedRole === "helper"
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 bg-card"
        }`}
      >
        <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
          <Sparkles size={24} className="text-accent-foreground" />
        </div>
        <div>
          <p className="font-bold text-foreground">Helper</p>
          <p className="text-sm text-muted-foreground">Looking for work</p>
        </div>
      </button>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <button type="button" onClick={() => setSignupStep("role")} className="p-1 rounded-full hover:bg-muted">
          <ArrowLeft size={18} className="text-muted-foreground" />
        </button>
        <h2 className="text-lg font-bold text-foreground">Your Details</h2>
      </div>

      <div>
        <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Full Name</Label>
        <div className="relative">
          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="pl-10 rounded-xl h-12"
            required
          />
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Phone Number</Label>
        <div className="relative">
          <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="tel"
            placeholder="+27 XX XXX XXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="pl-10 rounded-xl h-12"
            required
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">We'll send you a verification code</p>
      </div>

      <Button
        type="button"
        className="w-full h-12 rounded-xl"
        onClick={() => {
          if (!fullName || !phone) {
            toast({ title: "Please fill all fields", variant: "destructive" });
            return;
          }
          handleSendOtp();
        }}
      >
        Send Verification Code
        <ArrowRight size={16} />
      </Button>
    </div>
  );

  const renderOtpStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <button type="button" onClick={() => setSignupStep("details")} className="p-1 rounded-full hover:bg-muted">
          <ArrowLeft size={18} className="text-muted-foreground" />
        </button>
        <h2 className="text-lg font-bold text-foreground">Verify Phone</h2>
      </div>

      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Phone size={28} className="text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code sent to<br />
          <span className="font-semibold text-foreground">{phone}</span>
        </p>
      </div>

      <div>
        <Input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={otpCode}
          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
          className="rounded-xl h-14 text-center text-2xl tracking-[0.5em] font-bold"
        />
      </div>

      <Button
        type="button"
        className="w-full h-12 rounded-xl"
        onClick={handleVerifyOtpAndSignup}
        disabled={isSubmitting || otpCode.length !== 6}
      >
        {isSubmitting ? "Creating Account..." : "Verify & Create Account"}
      </Button>

      <button
        type="button"
        onClick={handleSendOtp}
        className="w-full text-sm text-primary font-semibold hover:underline"
      >
        Resend Code
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="gradient-hero pt-12 pb-8 px-6 text-center">
        <div className="flex justify-center mb-3">
          <img src={logo} alt="Domestic Hub" className="w-16 h-16 rounded-2xl object-contain bg-white shadow-button" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Domestic Hub</h1>
        <p className="text-sm text-muted-foreground mt-1">Find trusted help for your family</p>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 -mt-4">
        <div className="bg-card rounded-3xl shadow-card p-6 max-w-md mx-auto">
          {/* Tab toggle */}
          <div className="flex bg-muted rounded-2xl p-1 mb-6">
            <button
              onClick={() => { setMode("login"); setSignupStep("role"); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === "login" ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"}`}
            >
              Log In
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === "signup" ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"}`}
            >
              Sign Up
            </button>
          </div>

          {/* OAuth buttons */}
          <div className="space-y-3 mb-5">
            <Button variant="outline" className="w-full rounded-xl h-12" onClick={() => handleOAuth("google")}>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>
            <Button variant="outline" className="w-full rounded-xl h-12" onClick={() => handleOAuth("apple")}>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Continue with Apple
            </Button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Login Form */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Phone Number</Label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="+27 XX XXX XXXX"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    className="pl-10 rounded-xl h-12"
                    required
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="rounded-xl h-12"
                  required
                />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl" disabled={isSubmitting}>
                {isSubmitting ? "Logging in..." : "Log In"}
                <ArrowRight size={16} />
              </Button>
            </form>
          )}

          {/* Signup Flow */}
          {mode === "signup" && (
            <div>
              {signupStep === "role" && renderRoleSelection()}
              {signupStep === "details" && renderDetailsStep()}
              {signupStep === "otp" && renderOtpStep()}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
};

export default Auth;
