import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Phone, ArrowLeft, Shield, Lock, Mail } from "lucide-react";
import { PasswordInput } from "@/components/PasswordInput";
import CountryCodeSelect from "@/components/CountryCodeSelect";
import logo from "@/assets/logo.jpg";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
} from "@/components/ui/alert-dialog";

type SignupStep = "name" | "contact" | "password" | "verify-phone";
type UserRole = "employer" | "helper";

const STEP_PROGRESS: Record<SignupStep, number> = {
  name: 25,
  contact: 50,
  password: 75,
  "verify-phone": 100,
};

const fadeSlide = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
  transition: { duration: 0.25, ease: "easeOut" as const },
};

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { session, loading } = useAuth();
  const urlMode = searchParams.get("mode");
  const urlRole = searchParams.get("role");
  const [mode, setMode] = useState<"login" | "signup">(urlMode === "signup" ? "signup" : "login");
  const [signupStep, setSignupStep] = useState<SignupStep>("name");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(urlRole === "employer" || urlRole === "helper" ? urlRole : null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginCountryCode, setLoginCountryCode] = useState("+27");
  const [signupCountryCode, setSignupCountryCode] = useState("+27");

  // Signup
  const [fullName, setFullName] = useState("");
  const [surname, setSurname] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // OTP
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpChannel, setOtpChannel] = useState<"sms" | "email">("sms");

  // Real-time validation
  const [phoneExists, setPhoneExists] = useState<boolean | null>(null);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Welcome popup
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const isSigningUpRef = useRef(false);

  // Forgot password (phone OTP flow)
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotOtpCode, setForgotOtpCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // Debounced phone existence check via edge function
  const phoneTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!phone || phone.length < 6) { setPhoneExists(null); return; }
    setCheckingPhone(true);
    clearTimeout(phoneTimerRef.current);
    phoneTimerRef.current = setTimeout(async () => {
      try {
        const fullPhone = signupCountryCode + phone.replace(/^0+/, "");
        const { data, error } = await supabase.functions.invoke("check-user-exists", {
          body: { phone: fullPhone },
        });
        if (!error && data) {
          setPhoneExists(data.phoneExists || false);
        } else {
          setPhoneExists(null);
        }
      } catch { setPhoneExists(null); }
      setCheckingPhone(false);
    }, 600);
    return () => clearTimeout(phoneTimerRef.current);
  }, [phone, signupCountryCode]);

  // Email existence check removed - signup is phone-only

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (session && !showWelcomePopup && !isSigningUpRef.current) {
    return <Navigate to="/home" replace />;
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
      if (!identifier.includes("@")) {
        const { data, error } = await supabase.functions.invoke("phone-login", {
          body: {
            phone: identifier,
            countryCode: loginCountryCode,
            password: loginPassword,
          },
        });

        if (error) {
          // Edge function errors come with the response body in error.message or data
          const errorMsg = data?.error || error.message || "Login failed";
          throw new Error(errorMsg);
        }
        if (data?.error) throw new Error(data.error);
        if (!data?.session?.access_token || !data?.session?.refresh_token) {
          throw new Error("Invalid login response");
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (sessionError) throw sessionError;

        navigate("/splash");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: identifier, password: loginPassword });
      if (error) throw error;
      navigate("/splash");
    } catch (error: any) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
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
        body: {
          phone,
          purpose: "signup_verify",
          channel: "sms",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOtpSent(true);
      toast({
        title: "OTP sent!",
        description: "Check your phone for a 6-digit code.",
      });
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
      const otpIdentifier = phone;
      const { data, error } = await supabase.functions.invoke("verify-sms-otp", {
        body: { phone: otpIdentifier, code: otpCode, purpose: "signup_verify" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPhoneVerified(true);
      toast({ title: "Verified!" });
      setTimeout(() => {
        handleSignupComplete();
      }, 500);
    } catch (error: any) {
      toast({ title: "Verification failed", description: error.message, variant: "destructive" });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSignupComplete = async () => {
    setIsSubmitting(true);
    isSigningUpRef.current = true;
    try {
      const authEmail = signupEmail.trim() || `${phone.replace(/\D/g, "")}@helper.domestichub.co.za`;
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName, surname, phone, role: selectedRole },
        },
      });
      if (error) {
        if (error.message?.toLowerCase().includes("already registered") || error.message?.toLowerCase().includes("already been registered")) {
          toast({ title: "Account already exists", description: "This email or phone is already registered. Please log in instead.", variant: "destructive" });
          setMode("login");
          setSignupStep("name");
          isSigningUpRef.current = false;
          return;
        }
        throw error;
      }

      if (data.user) {
        await supabase.from("profiles").insert({
          user_id: data.user.id,
          full_name: fullName,
          surname,
          phone,
          email: signupEmail.trim() || null,
          role: selectedRole!,
          onboarding_completed: true,
        } as any);

        // Pre-populate role-specific profile with signup data
        if (selectedRole === "employer") {
          await supabase.from("employer_profiles").insert({
            user_id: data.user.id,
            full_name: `${fullName} ${surname}`.trim(),
            email: signupEmail.trim() || null,
          });
        }

        if (termsAccepted) {
          await supabase.from("terms_acceptances").insert({
            user_id: data.user.id,
            terms_version: "1.0",
          });
        }
      }

      setShowWelcomePopup(true);
      isSigningUpRef.current = false;
    } catch (error: any) {
      isSigningUpRef.current = false;
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoBack = () => {
    const steps: SignupStep[] = ["name", "contact", "password", "verify-phone"];
    const currentIndex = steps.indexOf(signupStep);
    if (currentIndex <= 0) {
      navigate("/");
    } else {
      setSignupStep(steps[currentIndex - 1]);
    }
  };

  // Validate before advancing to next step
  const handleNextFromName = () => {
    if (!fullName.trim()) {
      toast({ title: "Please enter your first name", variant: "destructive" });
      return;
    }
    if (!surname.trim()) {
      toast({ title: "Please enter your last name", variant: "destructive" });
      return;
    }
    setSignupStep("contact");
  };

  const handleNextFromContact = async () => {
    if (!phone || phone.length < 6) {
      toast({ title: "Please enter a valid phone number", variant: "destructive" });
      return;
    }

    // Do a fresh server-side check before advancing
    setIsSubmitting(true);
    try {
      const fullPhone = signupCountryCode + phone.replace(/^0+/, "");
      const { data, error } = await supabase.functions.invoke("check-user-exists", {
        body: { phone: fullPhone },
      });
      if (!error && data) {
        if (data.phoneExists) {
          setPhoneExists(true);
          toast({ title: "Account already exists", description: "This phone number is already registered. Please log in instead.", variant: "destructive" });
          setIsSubmitting(false);
          return;
        }
      }
    } catch {
      // If check fails, allow to proceed (will be caught at signup)
    }
    setIsSubmitting(false);
    setSignupStep("password");
  };

  const handleNextFromPassword = () => {
    if (signupPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (!termsAccepted) {
      toast({ title: "Please accept the Terms & Conditions", variant: "destructive" });
      return;
    }
    setSignupStep("verify-phone");
  };

  // ──────────── STEP 1: NAME ────────────
  const renderNameStep = () => (
    <motion.div key="name" {...fadeSlide} className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Add your name</h2>

      <div className="space-y-5">
        <div>
          <Label className="text-sm text-muted-foreground mb-1.5 block">First name*</Label>
          <Input
            placeholder="Your first name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="border-0 border-b border-border rounded-none px-0 h-11 text-base focus-visible:ring-0 focus-visible:border-primary"
            autoFocus
          />
        </div>
        <div>
          <Label className="text-sm text-muted-foreground mb-1.5 block">Last name*</Label>
          <Input
            placeholder="Your last name"
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            className="border-0 border-b border-border rounded-none px-0 h-11 text-base focus-visible:ring-0 focus-visible:border-primary"
          />
        </div>
      </div>

      <Button
        type="button"
        size="lg"
        className="w-full h-12 rounded-full font-semibold text-base"
        onClick={handleNextFromName}
      >
        Continue
      </Button>
    </motion.div>
  );

  // ──────────── STEP 2: CONTACT ────────────
  const renderContactStep = () => (
    <motion.div key="contact" {...fadeSlide} className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Add your phone number</h2>

      <div className="space-y-5">
        <div>
          <Label className="text-sm text-muted-foreground mb-1.5 block">Phone number*</Label>
          <div className={`flex border-b ${phoneExists ? 'border-destructive' : 'border-border'}`}>
            <CountryCodeSelect value={signupCountryCode} onChange={setSignupCountryCode} />
            <Input
              type="tel"
              placeholder="XX XXX XXXX"
              value={phone}
              onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ""); setPhone(val); setPhoneVerified(false); setOtpSent(false); setOtpCode(""); }}
              className="border-0 rounded-none px-0 h-11 text-base focus-visible:ring-0 flex-1"
              autoFocus
            />
          </div>
          {checkingPhone && <p className="text-xs text-muted-foreground mt-1.5">Checking...</p>}
          {phoneExists && <p className="text-xs text-destructive mt-1.5">This phone number is already registered. Please log in instead.</p>}
        </div>
      </div>

      <Button
        type="button"
        size="lg"
        className="w-full h-12 rounded-full font-semibold text-base"
        onClick={handleNextFromContact}
        disabled={isSubmitting || phoneExists === true || checkingPhone}
      >
        {isSubmitting ? "Checking..." : "Continue"}
      </Button>
    </motion.div>
  );

  // ──────────── STEP 3: PASSWORD ────────────
  const renderPasswordStep = () => (
    <motion.div key="password" {...fadeSlide} className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Set your password</h2>

      <div className="space-y-5">
        <div>
          <Label className="text-sm text-muted-foreground mb-1.5 block">Email or Phone*</Label>
          <div className="border-b border-border pb-2">
            <p className="text-base text-foreground">{signupEmail || phone}</p>
          </div>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground mb-1.5 block">Password*</Label>
          <PasswordInput
            placeholder="Create a password"
            value={signupPassword}
            onChange={(e) => setSignupPassword(e.target.value)}
            className="border-0 border-b border-border rounded-none px-0 h-11 text-base focus-visible:ring-0 focus-visible:border-primary"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-1.5">Password must be 6+ characters</p>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="w-5 h-5 rounded border-border accent-primary"
          />
          <span className="text-sm text-muted-foreground">
            I agree to the{" "}
            <a href="/terms" target="_blank" className="text-primary font-semibold hover:underline">Terms</a>
            {" & "}
            <a href="/privacy" target="_blank" className="text-primary font-semibold hover:underline">Privacy Policy</a>
          </span>
        </label>
      </div>

      <Button
        type="button"
        size="lg"
        className="w-full h-12 rounded-full font-semibold text-base"
        onClick={handleNextFromPassword}
      >
        Continue
      </Button>
    </motion.div>
  );

  // ──────────── STEP 4: PHONE VERIFICATION ────────────
  const renderPhoneVerification = () => (
    <motion.div key="verify" {...fadeSlide} className="space-y-6">
      <div className="text-center space-y-3">
        <h2 className="text-xl font-bold text-foreground">
          Verify your phone number
        </h2>
        <p className="text-sm text-muted-foreground">
          We'll send a verification code to {phone}
        </p>
      </div>

      {!otpSent ? (
        <div className="space-y-4">
          <Button
            type="button"
            size="lg"
            className="w-full h-12 rounded-full font-semibold text-base"
            onClick={handleSendOtp}
            disabled={otpLoading}
          >
            {otpLoading ? "Sending..." : "Send SMS Code"}
          </Button>
        </div>
      ) : !phoneVerified ? (
        <div className="space-y-5">
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

          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">Didn't receive the code?</p>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={otpLoading}
              className="text-sm text-primary font-semibold hover:underline"
            >
              Resend code via {otpChannel === "sms" ? "SMS" : "email"}
            </button>
          </div>

          <Button
            type="button"
            size="lg"
            className="w-full h-12 rounded-full font-semibold text-base"
            onClick={handleVerifyOtp}
            disabled={otpLoading || otpCode.length !== 6}
          >
            {otpLoading ? "Verifying..." : "Submit"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-primary">
            <Shield size={16} /> Verified successfully!
          </div>
          <Button
            type="button"
            size="lg"
            className="w-full h-12 rounded-full font-semibold text-base"
            onClick={handleSignupComplete}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating Account..." : "Create Account"}
          </Button>
        </div>
      )}
    </motion.div>
  );

  // ──────────── MAIN RENDER ────────────
  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            if (mode === "login") navigate("/");
            else handleGoBack();
          }}
          className="p-1.5 -ml-1.5 rounded-xl hover:bg-muted transition-colors mb-4"
        >
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div className="flex flex-col items-center mb-4">
          <img src={logo} alt="Domestic Hub" className="w-28 h-28 rounded-3xl shadow-lg" />
          <h1 className="text-xl font-bold text-foreground mt-3">Domestic Hub</h1>
        </div>

        {/* Progress bar for signup */}
        {mode === "signup" && (
          <div className="space-y-1.5">
            <Progress value={STEP_PROGRESS[signupStep]} className="h-1.5" />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground font-medium">
                {selectedRole === "employer" ? "Employer" : "Helper"} — Create account
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                {STEP_PROGRESS[signupStep]}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pt-4 min-h-0 overflow-y-auto pb-6">
        <div className="max-w-sm mx-auto">
          <AnimatePresence mode="wait">
            {mode === "login" && (
              <motion.div key="login" {...fadeSlide}>
                <h2 className="text-2xl font-bold text-foreground mb-6">Sign in</h2>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-1.5 block">Phone or Email</Label>
                    <div className="flex border-b border-border">
                      <CountryCodeSelect value={loginCountryCode} onChange={setLoginCountryCode} />
                      <Input
                        type="text"
                        placeholder="Phone or email"
                        value={loginIdentifier}
                        onChange={(e) => {
                          const val = e.target.value;
                          // If it looks like a phone number (no @), strip non-digits
                          if (!val.includes("@") && /^\d/.test(val.replace(/\s/g, ""))) {
                            setLoginIdentifier(val.replace(/[^0-9]/g, ""));
                          } else {
                            setLoginIdentifier(val);
                          }
                        }}
                        className="border-0 rounded-none px-0 h-11 text-base focus-visible:ring-0 flex-1"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-1.5 block">Password</Label>
                    <PasswordInput
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="border-0 border-b border-border rounded-none px-0 h-11 text-base focus-visible:ring-0 focus-visible:border-primary"
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const identifier = loginIdentifier.trim();
                        if (!identifier.includes("@")) {
                          const phoneVal = identifier.replace(/\D/g, "");
                          if (phoneVal) setForgotPhone(phoneVal);
                          setForgotMode(true);
                        } else {
                          (async () => {
                            if (!identifier) { toast({ title: "Enter your email first", variant: "destructive" }); return; }
                            const { error } = await supabase.auth.resetPasswordForEmail(identifier, { redirectTo: `${window.location.origin}/reset-password` });
                            if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
                            else { toast({ title: "Reset link sent!", description: "Check your email for a password reset link." }); }
                          })();
                        }
                      }}
                      className="text-xs text-primary font-semibold hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Button type="submit" size="lg" className="w-full h-12 rounded-full font-semibold text-base" disabled={isSubmitting}>
                    {isSubmitting ? "Logging in..." : "Sign in"}
                  </Button>

                </form>
              </motion.div>
            )}

            {mode === "signup" && signupStep === "name" && renderNameStep()}
            {mode === "signup" && signupStep === "contact" && renderContactStep()}
            {mode === "signup" && signupStep === "password" && renderPasswordStep()}
            {mode === "signup" && signupStep === "verify-phone" && renderPhoneVerification()}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 text-center shrink-0">
        <p className="text-[10px] text-muted-foreground">
          By continuing, you agree to our{" "}
          <a href="/terms" className="text-primary font-medium hover:underline">Terms</a>,{" "}
          <a href="/privacy" className="text-primary font-medium hover:underline">Privacy Policy</a>
        </p>
      </div>

      {/* Phone-based Forgot Password Dialog */}
      <AlertDialog open={forgotMode} onOpenChange={(open) => {
        if (!open) {
          setForgotMode(false);
          setForgotOtpSent(false);
          setForgotOtpCode("");
          setForgotNewPassword("");
          setForgotConfirmPassword("");
          setForgotPhone("");
        }
      }}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">Reset Password</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {!forgotOtpSent
                ? "We'll send a verification code to your phone number."
                : "Enter the code and your new password."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 mt-2">
            {!forgotOtpSent ? (
              <>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Phone Number</Label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="e.g. 0812345678"
                      value={forgotPhone}
                      onChange={(e) => setForgotPhone(e.target.value)}
                      className="pl-9 rounded-xl h-10 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setForgotMode(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 rounded-xl"
                    disabled={forgotLoading || !forgotPhone}
                    onClick={async () => {
                      setForgotLoading(true);
                      try {
                        const { data, error } = await supabase.functions.invoke("send-sms-otp", {
                          body: { phone: forgotPhone, purpose: "password_reset" },
                        });
                        if (error) throw error;
                        if (data?.error) throw new Error(data.error);
                        setForgotOtpSent(true);
                        toast({ title: "Code sent!", description: "Check your phone for a 6-digit code." });
                      } catch (err: any) {
                        toast({ title: "Failed to send code", description: err.message, variant: "destructive" });
                      } finally {
                        setForgotLoading(false);
                      }
                    }}
                  >
                    {forgotLoading ? "Sending..." : "Send Code"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Verification Code</Label>
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={forgotOtpCode} onChange={setForgotOtpCode}>
                      <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot key={i} index={i} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">New Password</Label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <PasswordInput
                      placeholder="Min 6 characters"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      className="pl-9 rounded-xl h-10 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Confirm Password</Label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <PasswordInput
                      placeholder="Confirm password"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      className="pl-9 rounded-xl h-10 text-sm"
                    />
                  </div>
                  {forgotConfirmPassword && forgotNewPassword !== forgotConfirmPassword && (
                    <p className="text-[11px] text-destructive mt-1">Passwords do not match</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => {
                    setForgotOtpSent(false);
                    setForgotOtpCode("");
                    setForgotNewPassword("");
                    setForgotConfirmPassword("");
                  }}>
                    Back
                  </Button>
                  <Button
                    className="flex-1 rounded-xl"
                    disabled={forgotLoading || forgotOtpCode.length !== 6 || !forgotNewPassword || forgotNewPassword !== forgotConfirmPassword}
                    onClick={async () => {
                      setForgotLoading(true);
                      try {
                        const { data, error } = await supabase.functions.invoke("reset-password-otp", {
                          body: { phone: forgotPhone, code: forgotOtpCode, new_password: forgotNewPassword },
                        });
                        if (error) throw error;
                        if (data?.error) throw new Error(data.error);
                        toast({ title: "Password updated!", description: "You can now log in with your new password." });
                        setForgotMode(false);
                        setForgotOtpSent(false);
                        setForgotOtpCode("");
                        setForgotNewPassword("");
                        setForgotConfirmPassword("");
                        setForgotPhone("");
                      } catch (err: any) {
                        toast({ title: "Reset failed", description: err.message, variant: "destructive" });
                      } finally {
                        setForgotLoading(false);
                      }
                    }}
                  >
                    {forgotLoading ? "Updating..." : "Reset Password"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Welcome Popup after Registration */}
      <AlertDialog open={showWelcomePopup} onOpenChange={() => {}}>
        <AlertDialogContent className="max-w-sm rounded-2xl text-center">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">
              {selectedRole === "employer"
                ? "Your next hire awaits you"
                : "Your next opportunity awaits"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {selectedRole === "employer"
                ? "Complete your profile to begin posting jobs and finding helpers."
                : "Complete your profile to start applying for jobs and getting hired."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Button
            size="lg"
            className="w-full h-12 rounded-full font-semibold text-base mt-2"
            onClick={() => {
              setShowWelcomePopup(false);
              navigate("/home?tab=profile", { replace: true });
            }}
          >
            Complete Profile
          </Button>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Auth;
