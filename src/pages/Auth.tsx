import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Phone, User, ArrowRight, ArrowLeft, Shield, Lock, Mail } from "lucide-react";
import { PasswordInput } from "@/components/PasswordInput";
import CountryCodeSelect from "@/components/CountryCodeSelect";
import logo from "@/assets/logo.jpg";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type SignupStep = "role" | "details" | "verify-phone";
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

  // Login
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginCountryCode, setLoginCountryCode] = useState("+27");
  const [signupCountryCode, setSignupCountryCode] = useState("+27");

  // Signup
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState("");
  const [surname, setSurname] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Phone OTP
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

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
      if (!identifier) {
        toast({ title: "Please enter your email or phone", variant: "destructive" });
        return;
      }
      let email = identifier;
      if (!identifier.includes("@")) {
        const phoneDigits = identifier.replace(/\D/g, "");
        const { data: foundEmail, error: lookupError } = await supabase.rpc("lookup_email_by_phone", { p_phone: phoneDigits });
        if (lookupError || !foundEmail) {
          toast({ title: "Phone number not found", variant: "destructive" });
          return;
        }
        email = foundEmail as string;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password: loginPassword });
      if (error) throw error;
      navigate("/");
    } catch (error: any) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    if (!selectedRole) {
      toast({ title: "Please select your role first", description: "Are you an employer or helper?", variant: "destructive" });
      return;
    }
    // Store role in localStorage so onboarding can use it after OAuth redirect
    localStorage.setItem("pending_oauth_role", selectedRole);
    const { error } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({ title: "OAuth error", description: String(error), variant: "destructive" });
    }
  };

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      toast({ title: "Please enter a valid phone number", variant: "destructive" });
      return;
    }
    setOtpLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms-otp", {
        body: { phone, purpose: "signup_verify" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOtpSent(true);
      toast({ title: "OTP sent!", description: "Check your phone for a 6-digit code." });
    } catch (error: any) {
      toast({ title: "Failed to send OTP", description: error.message, variant: "destructive" });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    setOtpLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-sms-otp", {
        body: { phone, code: otpCode, purpose: "signup_verify" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPhoneVerified(true);
      toast({ title: "Phone verified!" });
    } catch (error: any) {
      toast({ title: "Verification failed", description: error.message, variant: "destructive" });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSignupComplete = async () => {
    setIsSubmitting(true);
    try {
      // For helpers without email, generate a placeholder for auth
      const authEmail = signupEmail.trim() || `${phone.replace(/\D/g, "")}@helper.domestichub.app`;
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName, surname, phone, role: selectedRole },
        },
      });
      if (error) throw error;

      if (data.user) {
        await supabase.from("profiles").insert({
          user_id: data.user.id,
          full_name: fullName,
          surname,
          phone,
          email: signupEmail.trim() || null,
          role: selectedRole!,
          onboarding_completed: false,
        } as any);
        if (termsAccepted) {
          await supabase.from("terms_acceptances").insert({
            user_id: data.user.id,
            terms_version: "1.0",
          });
        }
      }

      toast({ title: "Account created!", description: "You are now logged in." });
      navigate("/");
    } catch (error: any) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ──────────── ROLE SELECTION (shown for both signup form AND before OAuth) ────────────
  const renderRoleSelection = () => (
    <motion.div {...fadeSlide} className="space-y-3">
      <p className="text-center text-sm font-semibold text-muted-foreground mb-1">I am a...</p>
      <button
        type="button"
        onClick={() => { setSelectedRole("employer"); setSignupStep("details"); }}
        className="w-full group relative p-4 rounded-2xl border-2 border-border bg-card hover:border-primary/60 hover:shadow-soft transition-all text-left flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
          <span className="text-2xl">💼</span>
        </div>
        <div className="flex-1">
          <p className="font-bold text-foreground">Employer</p>
          <p className="text-xs text-muted-foreground">Looking for help</p>
        </div>
        <ArrowRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
      <button
        type="button"
        onClick={() => { setSelectedRole("helper"); setSignupStep("details"); }}
        className="w-full group relative p-4 rounded-2xl border-2 border-border bg-card hover:border-primary/60 hover:shadow-soft transition-all text-left flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
          <span className="text-2xl">✨</span>
        </div>
        <div className="flex-1">
          <p className="font-bold text-foreground">Helper</p>
          <p className="text-xs text-muted-foreground">Looking for work</p>
        </div>
        <ArrowRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

    </motion.div>
  );

  // ──────────── DETAILS STEP ────────────
  const renderDetailsStep = () => (
    <motion.div {...fadeSlide} className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <button type="button" onClick={() => { setSignupStep("role"); setPhoneVerified(false); setOtpSent(false); setOtpCode(""); }} className="p-1.5 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft size={16} className="text-muted-foreground" />
        </button>
        <h2 className="text-sm font-bold text-foreground">
          {selectedRole === "employer" ? "Employer" : "Helper"} Sign Up
        </h2>
      </div>

      <div>
        <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">First Name <span className="text-destructive">*</span></Label>
        <div className="relative">
          <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Your first name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 rounded-xl h-12 border-border/80 focus-visible:ring-primary/30" required />
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Surname <span className="text-destructive">*</span></Label>
        <div className="relative">
          <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Your surname" value={surname} onChange={(e) => setSurname(e.target.value)} className="pl-10 rounded-xl h-12 border-border/80 focus-visible:ring-primary/30" required />
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
          Email Address {selectedRole === "employer" && <span className="text-destructive">*</span>}
        </Label>
        <div className="relative">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input type="email" placeholder={selectedRole === "helper" ? "you@example.com (optional)" : "you@example.com"} value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="pl-10 rounded-xl h-12 border-border/80 focus-visible:ring-primary/30" required={selectedRole === "employer"} />
        </div>
        {selectedRole === "employer" && (
          <p className="text-[10px] text-muted-foreground mt-1">Required for invoices and notifications</p>
        )}
      </div>

      <div>
        <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
          Phone Number <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="tel"
            placeholder="+27 XX XXX XXXX"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setPhoneVerified(false); setOtpSent(false); setOtpCode(""); }}
            className="pl-10 rounded-xl h-12 border-border/80 focus-visible:ring-primary/30"
            required
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
          <Shield size={10} /> We'll verify via SMS OTP
        </p>
      </div>

      <div>
        <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Password</Label>
        <div className="relative">
          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <PasswordInput placeholder="Create a password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="pl-10 rounded-xl h-12 border-border/80 focus-visible:ring-primary/30" required />
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Confirm Password</Label>
        <div className="relative">
          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <PasswordInput placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 rounded-xl h-12 border-border/80 focus-visible:ring-primary/30" required />
        </div>
        {confirmPassword && signupPassword !== confirmPassword && (
          <p className="text-[11px] text-destructive mt-1.5">Passwords do not match</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1 rounded border-border accent-primary" />
          <span className="text-xs text-muted-foreground">
            I agree to the{" "}
            <a href="/terms" target="_blank" className="text-primary font-semibold hover:underline">Terms & Conditions</a>
            {" "}and{" "}
            <a href="/privacy" target="_blank" className="text-primary font-semibold hover:underline">Privacy Policy</a>
          </span>
        </label>
      </div>

      <Button
        type="button"
        className="w-full h-12 rounded-xl font-semibold"
        disabled={isSubmitting}
        onClick={async () => {
          if (!fullName || !surname || !phone || !signupPassword) {
            toast({ title: "Please fill all required fields", variant: "destructive" });
            return;
          }
          if (selectedRole === "employer" && (!signupEmail || !signupEmail.includes("@"))) {
            toast({ title: "Please enter a valid email address", variant: "destructive" });
            return;
          }
          if (signupEmail && !signupEmail.includes("@")) {
            toast({ title: "Please enter a valid email", variant: "destructive" });
            return;
          }
          if (signupPassword.length < 6) {
            toast({ title: "Password must be at least 6 characters", variant: "destructive" });
            return;
          }
          if (signupPassword !== confirmPassword) {
            toast({ title: "Passwords do not match", variant: "destructive" });
            return;
          }
          if (!termsAccepted) {
            toast({ title: "Please accept the Terms & Conditions", variant: "destructive" });
            return;
          }

          // Check if phone or email already exists
          setIsSubmitting(true);
          try {
            const phoneDigits = phone.replace(/\D/g, "");
            const { data: existingEmail } = await supabase.rpc("lookup_email_by_phone", { p_phone: phoneDigits });
            if (existingEmail) {
              toast({ title: "Account already exists", description: "This phone number is already registered. Please log in instead.", variant: "destructive" });
              setIsSubmitting(false);
              return;
            }

            if (signupEmail) {
              const authEmail = signupEmail.trim();
              const { data: emailCheck } = await supabase.from("profiles").select("id").eq("email", authEmail).maybeSingle();
              if (emailCheck) {
                toast({ title: "Account already exists", description: "This email address is already registered. Please log in instead.", variant: "destructive" });
                setIsSubmitting(false);
                return;
              }
            }

            setSignupStep("verify-phone");
          } catch (err) {
            // Allow proceeding if check fails
            setSignupStep("verify-phone");
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        Continue <ArrowRight size={16} className="ml-1" />
      </Button>
    </motion.div>
  );

  // ──────────── PHONE VERIFICATION STEP ────────────
  const renderPhoneVerification = () => (
    <motion.div {...fadeSlide} className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <button type="button" onClick={() => setSignupStep("details")} className="p-1.5 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft size={16} className="text-muted-foreground" />
        </button>
        <h2 className="text-sm font-bold text-foreground">Verify Your Phone</h2>
      </div>

      <div className="text-center py-2">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Phone size={24} className="text-primary" />
        </div>
        <p className="text-xs text-muted-foreground">
          We'll send a 6-digit code to<br />
          <span className="font-semibold text-foreground">{phone}</span>
        </p>
      </div>

      {!otpSent ? (
        <Button type="button" className="w-full h-12 rounded-xl font-semibold" onClick={handleSendOtp} disabled={otpLoading}>
          {otpLoading ? "Sending..." : "Send Verification Code"}
        </Button>
      ) : !phoneVerified ? (
        <div className="space-y-4">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button type="button" className="w-full h-12 rounded-xl font-semibold" onClick={handleVerifyOtp} disabled={otpLoading || otpCode.length !== 6}>
            {otpLoading ? "Verifying..." : "Verify Code"}
          </Button>
          <button type="button" onClick={handleSendOtp} disabled={otpLoading} className="w-full text-xs text-primary font-semibold hover:underline">
            Resend code
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-green-600">
            <Shield size={16} /> Phone verified successfully!
          </div>
          <Button type="button" className="w-full h-12 rounded-xl font-semibold" onClick={handleSignupComplete} disabled={isSubmitting}>
            {isSubmitting ? "Creating Account..." : <>Create Account <ArrowRight size={16} className="ml-1" /></>}
          </Button>
        </div>
      )}

      <button type="button" onClick={() => setSignupStep("details")} className="w-full text-xs text-primary font-semibold hover:underline">
        Go back and edit details
      </button>
    </motion.div>
  );

  // ──────────── MAIN RENDER ────────────
  return (
    <div className="h-[100dvh] bg-gradient-to-b from-primary/5 via-background to-background flex flex-col overflow-hidden">
      <div className="pt-4 pb-1 px-6 text-center shrink-0">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease: "easeOut" }} className="flex justify-center mb-1">
          <div className="w-20 h-20 overflow-hidden rounded-2xl bg-white shadow-soft">
            <img src={logo} alt="Domestic Hub" className="w-full h-full object-contain" />
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.35 }}>
          <h1 className="text-lg font-bold text-foreground tracking-tight">Domestic Hub</h1>
          <p className="text-xs text-muted-foreground">Connecting homes with trusted hands</p>
        </motion.div>
      </div>

      <div className="flex-1 px-5 min-h-0 overflow-hidden">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }} className="bg-card rounded-2xl shadow-card border border-border/40 p-4 max-w-sm mx-auto h-full flex flex-col">
          {/* Tab toggle */}
          <div className="flex bg-muted/60 rounded-xl p-1 mb-3 shrink-0">
            <button
              onClick={() => { setMode("login"); setSignupStep("role"); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === "login" ? "bg-card shadow-soft text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Log In
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === "signup" ? "bg-card shadow-soft text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Sign Up
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <AnimatePresence mode="wait">
              {mode === "login" && (
                <motion.div key="login" {...fadeSlide}>
                  {/* OAuth for login */}
                  <div className="space-y-2 mb-4">
                    <Button variant="outline" className="w-full rounded-xl h-11 border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-all font-medium text-sm" onClick={() => {
                      lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
                    }}>
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Continue with Google
                    </Button>
                    <Button variant="outline" className="w-full rounded-xl h-11 border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-all font-medium text-sm" onClick={() => {
                      lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin });
                    }}>
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                      </svg>
                      Continue with Apple
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-border/60" />
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">or</span>
                    <div className="flex-1 h-px bg-border/60" />
                  </div>
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Phone or Email</Label>
                      <div className="relative flex">
                        <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-border/80 bg-muted text-muted-foreground text-sm">+27</span>
                        <Input type="text" placeholder="Phone or email" value={loginIdentifier} onChange={(e) => setLoginIdentifier(e.target.value)} className="rounded-l-none rounded-r-xl h-10 text-sm border-border/80 focus-visible:ring-primary/30" required />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Password</Label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <PasswordInput placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="pl-9 rounded-xl h-10 text-sm border-border/80 focus-visible:ring-primary/30" required />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={async () => {
                          const identifier = loginIdentifier.trim();
                          if (!identifier) { toast({ title: "Enter your phone number or email first", variant: "destructive" }); return; }
                          let email = identifier;
                          if (!identifier.includes("@")) {
                            const p = identifier.replace(/\D/g, "");
                            const { data: foundEmail, error: lookupError } = await supabase.rpc("lookup_email_by_phone", { p_phone: p });
                            if (lookupError || !foundEmail) { toast({ title: "Phone number not found", variant: "destructive" }); return; }
                            email = foundEmail as string;
                          }
                          const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
                          if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
                          else { toast({ title: "Reset link sent!", description: "Check your email for a password reset link." }); }
                        }}
                        className="text-xs text-primary font-semibold hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Button type="submit" className="w-full h-11 rounded-xl font-semibold shadow-sm" disabled={isSubmitting}>
                      {isSubmitting ? "Logging in..." : <>Log In <ArrowRight size={16} className="ml-1" /></>}
                    </Button>
                  </form>
                </motion.div>
              )}

              {mode === "signup" && (
                <div key="signup">
                  {signupStep === "role" && renderRoleSelection()}
                  {signupStep === "details" && renderDetailsStep()}
                  {signupStep === "verify-phone" && renderPhoneVerification()}
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <div className="px-5 py-2 text-center shrink-0">
        <p className="text-[10px] text-muted-foreground">
          By continuing, you agree to our{" "}
          <span className="text-primary font-medium cursor-pointer hover:underline">Terms of Service</span>
        </p>
      </div>
    </div>
  );
};

export default Auth;
