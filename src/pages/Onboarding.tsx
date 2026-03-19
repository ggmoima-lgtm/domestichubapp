import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Home, ArrowRight, CheckCircle2, Mail, CalendarIcon } from "lucide-react";
import logo from "@/assets/logo.jpg";
import LocationAutocomplete, { type LocationData } from "@/components/LocationAutocomplete";
import { format, differenceInYears } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const needTypes = [
  { id: "full-time", label: "Full-time", desc: "Monday to Friday, all day" },
  { id: "part-time", label: "Part-time", desc: "A few hours or days per week" },
  { id: "live-in", label: "Live-in", desc: "Helper lives with you" },
  { id: "live-out", label: "Live-out", desc: "Helper commutes daily" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<string | null>(null);
  const [needsProfileCreation, setNeedsProfileCreation] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Employer fields
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [typeOfNeed, setTypeOfNeed] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("role, onboarding_completed")
        .eq("user_id", user.id)
        .single()
        .then(async ({ data }) => {
          if (data) {
            setRole(data.role);
            if (data.onboarding_completed) {
              navigate("/home", { replace: true });
            }
          } else {
            // OAuth user with no profile yet — check localStorage for pre-selected role
            const pendingRole = localStorage.getItem("pending_oauth_role");
            if (pendingRole === "employer" || pendingRole === "helper") {
              localStorage.removeItem("pending_oauth_role");
              await handleRoleSelect(pendingRole);
            } else {
              setNeedsProfileCreation(true);
            }
          }
          setProfileLoading(false);
        });
    }
  }, [user, navigate]);

  // Redirect unauthenticated users to login
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const handleRoleSelect = async (selectedRole: "employer" | "helper") => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const fullName = user.user_metadata?.full_name || user.email || "User";
      const phone = user.user_metadata?.phone || user.phone || "";
      const { error } = await supabase.from("profiles").insert({
        user_id: user.id,
        full_name: fullName,
        phone,
        role: selectedRole,
        onboarding_completed: false,
      });
      if (error) throw error;
      setRole(selectedRole);
      setNeedsProfileCreation(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmployerComplete = async () => {
    if (!locationData) {
      toast({ title: "Please select your location", variant: "destructive" });
      return;
    }
    if (!typeOfNeed) {
      toast({ title: "Please select your type of need", variant: "destructive" });
      return;
    }
    if (!email || !email.includes("@")) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    if (!dateOfBirth) {
      toast({ title: "Please select your date of birth", variant: "destructive" });
      return;
    }
    const calculatedAge = differenceInYears(new Date(), dateOfBirth);
    if (calculatedAge < 18) {
      toast({ title: "You must be at least 18 years old to register", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      // Get full_name from profiles
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", user!.id)
        .maybeSingle();

      const { error: empError } = await supabase.from("employer_profiles").insert({
        user_id: user!.id,
        full_name: profileData?.full_name || user!.user_metadata?.full_name || null,
        email: email,
        location: locationData.formatted_address,
        type_of_need: typeOfNeed,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        suburb: locationData.suburb,
        city: locationData.city,
        province: locationData.province,
        country: locationData.country,
        formatted_address: locationData.formatted_address,
        place_id: locationData.place_id,
      });
      if (empError) throw empError;

      // Mark onboarding complete
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("user_id", user!.id);
      if (profileError) throw profileError;

      toast({ title: "Profile complete!", description: "Welcome to Domestic Hub." });
      navigate("/home", { replace: true });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHelperSkip = async () => {
    // Helpers will complete profile via the existing HelperRegistration page
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("user_id", user!.id);
      if (error) throw error;
      navigate("/register/helper", { replace: true });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // OAuth user needs to pick a role first
  if (needsProfileCreation || !role) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="gradient-hero pt-12 pb-8 px-6 text-center">
           <img src={logo} alt="Domestic Hub" className="w-24 h-24 rounded-2xl object-contain bg-white shadow-button mx-auto mb-3" />
          <h1 className="text-xl font-bold text-foreground">Welcome!</h1>
          <p className="text-sm text-muted-foreground mt-1">Tell us who you are to get started</p>
        </div>
        <div className="flex-1 px-5 -mt-4">
          <div className="bg-card rounded-3xl shadow-card p-6 max-w-md mx-auto space-y-3">
            <h2 className="text-lg font-bold text-foreground text-center mb-2">I am a...</h2>
            <button
              type="button"
              onClick={() => handleRoleSelect("employer")}
              disabled={isSubmitting}
              className="w-full p-5 rounded-2xl border-2 border-border hover:border-primary/50 bg-card transition-all text-left flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <span className="text-2xl">💼</span>
              </div>
              <div>
                <p className="font-bold text-foreground">Employer</p>
                <p className="text-sm text-muted-foreground">Hiring a helper</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect("helper")}
              disabled={isSubmitting}
              className="w-full p-5 rounded-2xl border-2 border-border hover:border-primary/50 bg-card transition-all text-left flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                <span className="text-2xl">✨</span>
              </div>
              <div>
                <p className="font-bold text-foreground">Helper</p>
                <p className="text-sm text-muted-foreground">Looking for work</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Helper onboarding - redirect to helper registration
  if (role === "helper") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="gradient-hero pt-12 pb-8 px-6 text-center">
           <img src={logo} alt="Domestic Hub" className="w-24 h-24 rounded-2xl object-contain bg-white shadow-button mx-auto mb-3" />
          <h1 className="text-xl font-bold text-foreground">Welcome!</h1>
          <p className="text-sm text-muted-foreground mt-1">Let's set up your helper profile</p>
        </div>
        <div className="flex-1 px-5 -mt-4">
          <div className="bg-card rounded-3xl shadow-card p-6 max-w-md mx-auto text-center space-y-4">
            <h2 className="text-lg font-bold text-foreground">Complete Your Helper Profile</h2>
            <p className="text-sm text-muted-foreground">
              Add your skills, experience, and availability to start getting matched with employers.
            </p>
            <Button className="w-full h-12 rounded-xl" onClick={handleHelperSkip} disabled={isSubmitting}>
              {isSubmitting ? "Setting up..." : "Set Up Profile"}
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Employer onboarding
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="gradient-hero pt-12 pb-6 px-6 text-center">
        <img src={logo} alt="Domestic Hub" className="w-24 h-24 rounded-2xl object-contain bg-white shadow-button mx-auto mb-3" />
        <h1 className="text-xl font-bold text-foreground">Almost There!</h1>
        <p className="text-sm text-muted-foreground mt-1">Tell us what you're looking for</p>
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-4">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                s <= step ? "bg-primary w-6" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 px-5 -mt-2">
        <div className="bg-card rounded-3xl shadow-card p-6 max-w-md mx-auto">
          {/* Step 1: Location */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <MapPin size={24} className="text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Where are you located?</h2>
                <p className="text-sm text-muted-foreground">This helps us find helpers near you</p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Area / Neighborhood</Label>
                <LocationAutocomplete
                  value={locationData}
                  onChange={setLocationData}
                  placeholder="e.g., Sandton, Johannesburg"
                />
              </div>
              <Button
                className="w-full h-12 rounded-xl"
                onClick={() => {
                  if (!locationData) {
                    toast({ title: "Please select your location", variant: "destructive" });
                    return;
                  }
                  setStep(2);
                }}
              >
                Continue <ArrowRight size={16} />
              </Button>
            </div>
          )}

          {/* Step 2: Type of Need */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <img src={logo} alt="Domestic Hub" className="w-28 h-28 rounded-2xl object-contain mx-auto mb-3 mix-blend-multiply" />
                <h2 className="text-lg font-bold text-foreground">What type of help?</h2>
                <p className="text-sm text-muted-foreground">Select what best fits your needs</p>
              </div>
              <div className="space-y-2.5">
                {needTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setTypeOfNeed(type.id)}
                    className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-3 ${
                      typeOfNeed === type.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-foreground text-sm">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.desc}</p>
                    </div>
                    {typeOfNeed === type.id && (
                      <CheckCircle2 size={20} className="text-primary" />
                    )}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Mail size={14} /> Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
                <p className="text-[10px] text-muted-foreground">Required for invoices and account communication</p>
              </div>
              <Button
                className="w-full h-12 rounded-xl"
                onClick={() => {
                  if (!typeOfNeed) {
                    toast({ title: "Please select a type", variant: "destructive" });
                    return;
                  }
                  handleEmployerComplete();
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Finishing..." : "Complete Setup"}
                <ArrowRight size={16} />
              </Button>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};

export default Onboarding;
