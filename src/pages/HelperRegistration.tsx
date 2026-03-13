import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import LocationAutocomplete, { LocationData } from "@/components/LocationAutocomplete";
import { ArrowLeft, Upload, User, Phone, Mail, Briefcase, Clock, Globe, DollarSign, Home, Camera, Users, Save, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const categories = [
  { id: "nanny", label: "Nanny" },
  { id: "housekeeper", label: "Housekeeper" },
  { id: "caregiver", label: "Caregiver" },
  { id: "all-around", label: "All-around" },
];

const skillOptions = [
  "Childcare", "Cooking", "Cleaning", "Laundry", "First Aid", 
  "Tutoring", "Elder Care", "Pet Care", "Driving", "Organizing",
  "Medication Management", "Physical Therapy", "Arts & Crafts"
];

const languageOptions = [
  "English", "Afrikaans", "isiZulu", "isiXhosa", "Sesotho", 
  "Setswana", "Sepedi", "Xitsonga", "siSwati", "Tshivenda", "isiNdebele"
];

const availabilityOptions = [
  "Full-time", "Part-time", "Weekdays only", "Weekends only", "Flexible"
];

const livingArrangementOptions = [
  "Live-in", "Live-out", "Either"
];

const genderOptions = ["Female", "Male", "Non-binary", "Prefer not to say"];
const nationalityOptions = ["South African", "Zimbabwean", "Mozambican", "Malawian", "Lesotho", "Swazi", "Other"];

const DRAFT_KEY = "helper_registration_draft";

const HelperRegistration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: "",
    surname: "",
    email: "",
    phone: "",
    category: [] as string[],
    experience: "",
    monthlyRate: "",
    bio: "",
    availability: "",
    livingArrangement: "",
    age: "",
    gender: "",
    nationality: "",
    city: "",
    area: "",
  });
  const [isPlaceholderEmail, setIsPlaceholderEmail] = useState(false);
  
  const [hasWorkPermit, setHasWorkPermit] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [references] = useState<{ name: string; phone: string; relationship: string }[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Phone is already verified during signup — no re-verification needed
  const phoneVerified = true;

  // Auto-fill from authenticated user
  useEffect(() => {
    if (user) {
      // Check if email is a placeholder
      const emailIsPlaceholder = user.email?.endsWith("@helper.domestichub.app") ?? false;
      setIsPlaceholderEmail(emailIsPlaceholder);
      if (!emailIsPlaceholder && user.email) {
        setFormData(prev => ({ ...prev, email: user.email! }));
      }
      // Fetch phone and name from profiles table
      supabase.from("profiles").select("phone, full_name, surname").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (data) {
          setFormData(prev => ({
            ...prev,
            phone: data.phone || prev.phone,
            fullName: data.full_name || prev.fullName,
            surname: (data as any).surname || prev.surname,
          }));
        }
      });
    }
  }, [user]);

  // Load draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.formData) setFormData(prev => ({ ...prev, ...draft.formData, email: prev.email }));
        if (draft.hasWorkPermit) setHasWorkPermit(draft.hasWorkPermit);
        if (draft.selectedSkills) setSelectedSkills(draft.selectedSkills);
        if (draft.selectedLanguages) setSelectedLanguages(draft.selectedLanguages);
        toast.info("Draft restored from your last session");
      }
    } catch {}
  }, []);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      saveDraft();
    }, 30000);
    return () => clearInterval(timer);
  }, [formData, hasWorkPermit, selectedSkills, selectedLanguages, references]);

  // No longer needed — phone verified at signup

  const saveDraft = useCallback(() => {
    try {
      const draft = { formData, hasWorkPermit, selectedSkills, selectedLanguages, references, savedAt: new Date().toISOString() };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    } catch {}
  }, [formData, hasWorkPermit, selectedSkills, selectedLanguages, references]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
  };

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const toggleLanguage = (language: string) => {
    setSelectedLanguages(prev => 
      prev.includes(language) ? prev.filter(l => l !== language) : [...prev, language]
    );
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) { toast.error("Video must be less than 100MB"); return; }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast.error("Photo must be less than 5MB"); return; }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // Phone OTP removed — already verified at signup

  const uploadFile = async (userId: string, file: File, bucket: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) { console.error(`Upload error (${bucket}):`, error); return null; }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.surname || !formData.phone || formData.category.length === 0) {
      toast.error("Please fill in all required fields"); return;
    }
    if (!formData.age) { toast.error("Please enter your age"); return; }
    if (!formData.gender) { toast.error("Please select your gender"); return; }
    if (!formData.nationality) { toast.error("Please select your nationality"); return; }
    if (!formData.availability) { toast.error("Please select your availability"); return; }
    if (!formData.bio) { toast.error("Please write something about yourself"); return; }
    if (!formData.experience) { toast.error("Please enter your years of experience"); return; }
    if (selectedLanguages.length === 0) { toast.error("Please select at least one language"); return; }
    if (!avatarFile) { toast.error("Please upload a profile photo"); return; }
    if (selectedSkills.length === 0) { toast.error("Please select at least one skill"); return; }
    if (!videoFile) { toast.error("Please upload an intro video"); return; }
    if (!acceptedTerms) { toast.error("Please accept the Terms & Conditions"); return; }

    if (!user) {
      toast.error("You must be logged in to register as a helper"); return;
    }

    setIsSubmitting(true);

    try {
      const userId = user.id;

      // Upload files in parallel
      const [videoUrl, avatarUrl] = await Promise.all([
        videoFile ? uploadFile(userId, videoFile, 'helper-videos') : Promise.resolve(null),
        avatarFile ? uploadFile(userId, avatarFile, 'avatars') : Promise.resolve(null),
      ]);

      // Upsert profiles row
      const { error: profilesError } = await supabase.from('profiles').upsert({
        user_id: userId,
        full_name: formData.fullName,
        surname: formData.surname,
        phone: formData.phone,
        role: 'helper',
        onboarding_completed: true,
        city: formData.city || null,
        area: formData.area || null,
      } as any, { onConflict: 'user_id' });
      if (profilesError) console.error('Profiles row error:', profilesError);

      // Create helper profile
      const { error: profileError } = await supabase.from('helpers').insert({
        user_id: userId,
        full_name: `${formData.fullName} ${formData.surname}`.trim(),
        email: formData.email || `${formData.phone.replace(/\D/g, "")}@helper.domestichub.app`,
        phone: formData.phone,
        category: formData.category.join(", "),
        experience_years: formData.experience ? parseInt(formData.experience) : 0,
        hourly_rate: formData.monthlyRate ? parseFloat(formData.monthlyRate) : null,
        bio: formData.bio || null,
        availability: formData.availability || null,
        skills: selectedSkills,
        languages: selectedLanguages,
        has_work_permit: hasWorkPermit,
        intro_video_url: videoUrl,
        avatar_url: avatarUrl,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender || null,
        nationality: formData.nationality || null,
        living_arrangement: formData.livingArrangement || null,
      } as any);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        toast.error("Failed to create profile. Please try again.");
        setIsSubmitting(false); return;
      }

      // Terms acceptance
      await supabase.from('terms_acceptances').insert({
        user_id: userId,
        terms_version: '1.0',
      });

      // Trigger video moderation
      if (videoUrl) {
        supabase.functions.invoke("moderate-video", {
          body: { helperId: userId },
        }).catch(err => console.error("Video moderation trigger failed:", err));
      }

      toast.success("Registration successful! Welcome aboard!");
      clearDraft();
      navigate("/");
    } catch (error) {
      console.error('Registration error:', error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
              <ArrowLeft size={20} className="text-foreground" />
            </button>
            <h1 className="text-lg font-bold text-foreground">Helper Registration</h1>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={saveDraft} className="gap-1.5 text-xs">
            <Save size={14} />
            {draftSaved ? "Saved!" : "Save Draft"}
          </Button>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 pb-24 space-y-6">
        {/* Profile Photo */}
        <section className="flex flex-col items-center gap-3">
          <label className="relative cursor-pointer">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-muted border-2 border-dashed border-primary/30 flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <Camera size={32} className="text-muted-foreground" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow-soft">
              <Camera size={12} />
            </div>
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </label>
          <p className="text-xs text-muted-foreground">Upload profile photo <span className="text-destructive">*</span></p>
        </section>

        {/* Account Information */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <User size={18} className="text-primary" /> Account Information
          </h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="fullName">First Name *</Label>
              <Input id="fullName" placeholder="Enter your first name" value={formData.fullName} onChange={(e) => handleInputChange("fullName", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="surname">Surname *</Label>
              <Input id="surname" placeholder="Enter your surname" value={formData.surname} onChange={(e) => handleInputChange("surname", e.target.value)} className="mt-1" />
            </div>
            {!isPlaceholderEmail && (
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative mt-1">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" value={formData.email} disabled className="pl-9 bg-muted/50" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">From your signup account</p>
              </div>
            )}

            {/* Phone Number — already verified at signup */}
            <div>
              <Label htmlFor="phone">Phone Number * <span className="text-green-600 font-normal text-xs ml-1">✓ Verified</span></Label>
              <div className="relative mt-1">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  className="pl-9 bg-muted/50"
                  disabled
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Verified during signup</p>
            </div>
          </div>
        </section>

        {/* Personal Details */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Users size={18} className="text-primary" /> Personal Details
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="age">Age *</Label>
              <Input id="age" type="number" placeholder="e.g., 28" value={formData.age} onChange={(e) => handleInputChange("age", e.target.value)} className="mt-1" min="18" max="70" />
            </div>
            <div>
              <Label>Gender *</Label>
              <Select value={formData.gender} onValueChange={(v) => handleInputChange("gender", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {genderOptions.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Nationality *</Label>
            <Select value={formData.nationality} onValueChange={(v) => handleInputChange("nationality", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select nationality" /></SelectTrigger>
              <SelectContent>
                {nationalityOptions.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Location *</Label>
            <div className="mt-1">
              <LocationAutocomplete
                value={null}
                onChange={(loc: LocationData) => {
                  handleInputChange("city", loc.city || loc.suburb || "");
                  handleInputChange("area", loc.suburb || loc.city || "");
                }}
                placeholder="Search your city or area..."
              />
            </div>
          </div>
        </section>

        {/* Work Documentation Toggle */}
        <section className="bg-muted/50 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="workPermit" className="text-base font-semibold">Work Documentation</Label>
              <p className="text-sm text-muted-foreground">Do you have all required work documentation?</p>
            </div>
            <Switch id="workPermit" checked={hasWorkPermit} onCheckedChange={setHasWorkPermit} />
          </div>
        </section>

        {/* Professional Details */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Briefcase size={18} className="text-primary" /> Professional Details
          </h2>
          <div className="space-y-3">
            <div>
              <Label>Category * <span className="text-xs text-muted-foreground">(select all that apply)</span></Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {categories.map((cat) => {
                  const isChecked = formData.category.includes(cat.id);
                  return (
                    <label
                      key={cat.id}
                      className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                        isChecked
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-card text-foreground hover:border-primary/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const updated = isChecked
                            ? formData.category.filter((c: string) => c !== cat.id)
                            : [...formData.category, cat.id];
                          handleInputChange("category", updated);
                        }}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                        isChecked ? "border-primary bg-primary" : "border-muted-foreground"
                      }`}>
                        {isChecked && <span className="text-primary-foreground text-xs">✓</span>}
                      </div>
                      <span className="text-sm font-medium">{cat.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <Label htmlFor="experience">Years of Experience *</Label>
              <Input id="experience" type="number" placeholder="e.g., 5" value={formData.experience} onChange={(e) => handleInputChange("experience", e.target.value)} className="mt-1" min="0" max="50" />
            </div>
            <div>
              <Label htmlFor="monthlyRate">Monthly Rate (ZAR)</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">R</span>
                <Input id="monthlyRate" type="number" placeholder="e.g., 3500" value={formData.monthlyRate} onChange={(e) => handleInputChange("monthlyRate", e.target.value)} className="pl-9" min="0" />
              </div>
            </div>
          </div>
        </section>

        {/* Skills */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Skills *</h2>
          <div className="flex flex-wrap gap-2">
            {skillOptions.map((skill) => (
              <Badge key={skill} variant={selectedSkills.includes(skill) ? "default" : "outline"} className="cursor-pointer transition-all" onClick={() => toggleSkill(skill)}>
                {skill}
              </Badge>
            ))}
          </div>
        </section>

        {/* Languages */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Globe size={18} className="text-primary" /> Languages *
          </h2>
          <div className="flex flex-wrap gap-2">
            {languageOptions.map((language) => (
              <Badge key={language} variant={selectedLanguages.includes(language) ? "default" : "outline"} className="cursor-pointer transition-all" onClick={() => toggleLanguage(language)}>
                {language}
              </Badge>
            ))}
          </div>
        </section>

        {/* Availability */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Clock size={18} className="text-primary" /> Availability
          </h2>
          <Select value={formData.availability} onValueChange={(value) => handleInputChange("availability", value)}>
            <SelectTrigger><SelectValue placeholder="Select your availability" /></SelectTrigger>
            <SelectContent>
              {availabilityOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
            </SelectContent>
          </Select>
        </section>

        {/* Living Arrangement */}
        {formData.availability === "Full-time" && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Home size={18} className="text-primary" /> Living Arrangement
            </h2>
            <Select value={formData.livingArrangement} onValueChange={(value) => handleInputChange("livingArrangement", value)}>
              <SelectTrigger><SelectValue placeholder="Live-in or Live-out?" /></SelectTrigger>
              <SelectContent>
                {livingArrangementOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
              </SelectContent>
            </Select>
          </section>
        )}

        {/* Bio */}
        <section className="space-y-3">
          <Label htmlFor="bio">About You *</Label>
          <Textarea id="bio" placeholder="Tell families about yourself, your experience, and what makes you a great helper..." value={formData.bio} onChange={(e) => handleInputChange("bio", e.target.value)} rows={4} />
        </section>

        {/* ID Verification Notice */}
        <section className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-primary" /> Identity Verification
          </h2>
          <p className="text-sm text-muted-foreground">
            After registration, you can verify your identity through our secure 3rd-party verification partner (SimplyID). 
            No documents are stored in our app — verification is handled externally.
          </p>
        </section>

        {/* Intro Video */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Upload size={18} className="text-primary" /> Introduction Video *
          </h2>
          <p className="text-sm text-muted-foreground">Record a short video (max 2 min) introducing yourself to families</p>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mt-2">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">⚠️ Important Rule</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              Do <strong>not</strong> share any contact details in your video — no phone numbers, email, WhatsApp, or social media handles. Videos with contact info will be automatically rejected.
            </p>
          </div>
          {videoPreview ? (
            <div className="relative rounded-2xl overflow-hidden bg-muted">
              <video src={videoPreview} controls className="w-full aspect-video object-cover" />
              <Button type="button" variant="secondary" size="sm" className="absolute top-2 right-2" onClick={() => { setVideoFile(null); setVideoPreview(null); }}>Remove</Button>
            </div>
          ) : (
            <label className="block">
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-2xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
                <Upload size={32} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">Tap to upload video</p>
                <p className="text-xs text-muted-foreground mt-1">MP4, MOV up to 100MB</p>
              </div>
              <input type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />
            </label>
          )}
        </section>

        {/* Terms & Conditions */}
        <section className="bg-muted/50 rounded-2xl p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-1 h-4 w-4 rounded border-input accent-primary" />
            <span className="text-sm text-foreground">
              I agree to the{" "}
              <a href="/terms" target="_blank" className="text-primary underline">Terms & Conditions</a>
              {" "}and{" "}
              <a href="/privacy" target="_blank" className="text-primary underline">Privacy Policy</a> *
            </span>
          </label>
        </section>

        {/* Submit Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Creating Account..." : "Complete Registration"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default HelperRegistration;
