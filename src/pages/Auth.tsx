import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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

  // Phone OTP
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

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

  // Debounced phone existence check
  const phoneTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!phone || phone.length < 6) { setPhoneExists(null); return; }
    setCheckingPhone(true);
    clearTimeout(phoneTimerRef.current);
    phoneTimerRef.current = setTimeout(async () => {
      try {
        const phoneDigits = phone.replace(/\D/g, "");
        const { data } = await supabase.rpc("lookup_email_by_phone", { p_phone: phoneDigits });
        setPhoneExists(!!data);
      } catch { setPhoneExists(null); }
      setCheckingPhone(false);
    }, 600);
    return () => clearTimeout(phoneTimerRef.current);
  }, [phone]);

  // Debounced email existence check
  const emailTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!signupEmail || !signupEmail.includes("@")) { setEmailExists(null); return; }
    setCheckingEmail(true);
    clearTimeout(emailTimerRef.current);
    emailTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await supabase.from("profiles").select("id").eq("email", signupEmail.trim()).maybeSingle();
        setEmailExists(!!data);
      } catch { setEmailExists(null); }
      setCheckingEmail(false);
    }, 600);
    return () => clearTimeout(emailTimerRef.current);
  }, [signupEmail]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (session && !showWelcomePopup && !isSigningUpRef.current) {
    return <Navigate to="/splash" replace />;
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
      const authEmail = signupEmail.trim() || `${phone.replace(/\D/g, "")}@helper.domestichub.app`;
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
    if (selectedRole === "employer" && (!signupEmail || !signupEmail.includes("@"))) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    if (!phone || phone.length < 6) {
      toast({ title: "Please enter a valid phone number", variant: "destructive" });
      return;
    }
    if (signupEmail && !signupEmail.includes("@")) {
      toast({ title: "Please enter a valid email", variant: "destructive" });
      return;
    }
    if (phoneExists) {
      toast({ title: "Account already exists", description: "This phone number is already registered. Please log in instead.", variant: "destructive" });
      return;
    }
    if (emailExists) {
      toast({ title: "Account already exists", description: "This email is already registered. Please log in instead.", variant: "destructive" });
      return;
    }
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
      <h2 className="text-2xl font-bold text-foreground">Add your email or phone</h2>

      <div className="space-y-5">
        {selectedRole === "employer" ? (
          <div>
            <Label className="text-sm text-muted-foreground mb-1.5 block">Email*</Label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              className={`border-0 border-b rounded-none px-0 h-11 text-base focus-visible:ring-0 focus-visible:border-primary ${emailExists || (signupEmail && !signupEmail.includes("@")) ? 'border-destructive' : 'border-border'}`}
              autoFocus
            />
            {checkingEmail && <p className="text-xs text-muted-foreground mt-1.5">Checking...</p>}
            {signupEmail && !signupEmail.includes("@") && <p className="text-xs text-destructive mt-1.5">Email must contain @</p>}
            {emailExists && <p className="text-xs text-destructive mt-1.5">This email is already registered. Please log in instead.</p>}
            {!emailExists && !checkingEmail && signupEmail.includes("@") && <p className="text-xs text-muted-foreground mt-1.5">Required for invoices and notifications</p>}
          </div>
        ) : (
          <div>
            <Label className="text-sm text-muted-foreground mb-1.5 block">Email (optional)</Label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              className={`border-0 border-b rounded-none px-0 h-11 text-base focus-visible:ring-0 focus-visible:border-primary ${emailExists || (signupEmail && !signupEmail.includes("@")) ? 'border-destructive' : 'border-border'}`}
              autoFocus
            />
            {checkingEmail && <p className="text-xs text-muted-foreground mt-1.5">Checking...</p>}
            {signupEmail && !signupEmail.includes("@") && <p className="text-xs text-destructive mt-1.5">Email must contain @</p>}
            {emailExists && <p className="text-xs text-destructive mt-1.5">This email is already registered. Please log in instead.</p>}
          </div>
        )}

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
        disabled={isSubmitting || phoneExists === true || emailExists === true || checkingPhone || checkingEmail}
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
          Enter the code that was sent to your mobile phone.
        </h2>
        <p className="text-sm text-muted-foreground">
          To finish registering, please enter the verification code we gave you.
          It might take a few minutes to receive your code.
        </p>
      </div>

      {!otpSent ? (
        <Button
          type="button"
          size="lg"
          className="w-full h-12 rounded-full font-semibold text-base"
          onClick={handleSendOtp}
          disabled={otpLoading}
        >
          {otpLoading ? "Sending..." : "Send Verification Code"}
        </Button>
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
              Resend code by SMS
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
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-green-600">
            <Shield size={16} /> Phone verified successfully!
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
        <div className="flex items-center gap-3 mb-3">
          <button
            type="button"
            onClick={() => {
              if (mode === "login") navigate("/");
              else handleGoBack();
            }}
            className="p-1.5 -ml-1.5 rounded-xl hover:bg-muted transition-colors"
          >
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <img src={logo} alt="Domestic Hub" className="w-8 h-8 rounded-lg" />
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

                {/* OAuth */}
                <div className="space-y-2.5 mb-5">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full h-12 rounded-full font-semibold text-sm border-border hover:border-primary/40 hover:bg-primary/5"
                    onClick={() => lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })}
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
                    size="lg"
                    className="w-full h-12 rounded-full font-semibold text-sm border-border hover:border-primary/40 hover:bg-primary/5"
                    onClick={() => lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin })}
                  >
                    <svg className="w-5 h-5 mr-2.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                    Continue with Apple
                  </Button>
                </div>

                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground font-medium">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

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
