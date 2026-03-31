import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format, differenceInYears } from "date-fns";
import LocationAutocomplete, { LocationData } from "@/components/LocationAutocomplete";
import { ArrowLeft, Upload, User, Phone, Mail, Briefcase, Clock, Globe, DollarSign, Home, Camera, Users, Save, CheckCircle, CalendarIcon, Sprout } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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

const serviceTypeOptions = [
  { id: "domestic", label: "Domestic Work", icon: "domestic" },
  { id: "gardening", label: "Gardening", icon: "gardening" },
  { id: "both", label: "Both", icon: "both" },
];

const categories = [
  { id: "nanny", label: "Nanny" },
  { id: "housekeeper", label: "Housekeeper" },
  { id: "caregiver", label: "Caregiver" },
  { id: "all-around", label: "All-around" },
];

const domesticSkillOptions = [
  "Cleaning", "Childcare", "Cooking", "Laundry"
];

const gardeningSkillOptions = [
  "Lawn Mowing", "Hedge Trimming", "Garden Cleaning", "Landscaping"
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
  
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  const [serviceType, setServiceType] = useState<string>("");
  const [selectedDomesticSkills, setSelectedDomesticSkills] = useState<string[]>([]);
  const [selectedGardeningSkills, setSelectedGardeningSkills] = useState<string[]>([]);
  const [hasTools, setHasTools] = useState(false);
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
  const [locationData, setLocationData] = useState<LocationData | null>(null);
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
      const emailIsPlaceholder = user.email?.endsWith("const emailIsPlaceholder = user.email?.endsWith("@helper.domestichub.co.za") ?? false;
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
        if (draft.locationData) setLocationData(draft.locationData);
        if (draft.hasWorkPermit) setHasWorkPermit(draft.hasWorkPermit);
        if (draft.selectedSkills) setSelectedSkills(draft.selectedSkills);
        if (draft.selectedLanguages) setSelectedLanguages(draft.selectedLanguages);
        if (draft.dateOfBirth) setDateOfBirth(new Date(draft.dateOfBirth));
        if (draft.serviceType) setServiceType(draft.serviceType);
        if (draft.selectedDomesticSkills) setSelectedDomesticSkills(draft.selectedDomesticSkills);
        if (draft.selectedGardeningSkills) setSelectedGardeningSkills(draft.selectedGardeningSkills);
        if (draft.hasTools) setHasTools(draft.hasTools);
        if (draft.acceptedTerms) setAcceptedTerms(draft.acceptedTerms);
        toast.info("Draft restored from your last session");
      }
    } catch {}
  }, []);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      saveDraft(false);
    }, 30000);
    return () => clearInterval(timer);
  }, [formData, hasWorkPermit, locationData, selectedSkills, selectedLanguages, references, dateOfBirth, serviceType, selectedDomesticSkills, selectedGardeningSkills, hasTools, acceptedTerms]);

  // No longer needed — phone verified at signup

  const saveDraft = useCallback((navigateBack = false) => {
    try {
      const draft = {
        formData, hasWorkPermit, locationData, selectedSkills, selectedLanguages, references,
        dateOfBirth: dateOfBirth?.toISOString() || null,
        serviceType, selectedDomesticSkills, selectedGardeningSkills, hasTools, acceptedTerms,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
      if (navigateBack) {
        toast.success("Draft saved successfully");
        navigate("/home?tab=profile");
      }
    } catch {}
  }, [formData, hasWorkPermit, selectedSkills, selectedLanguages, references, dateOfBirth, serviceType, selectedDomesticSkills, selectedGardeningSkills, hasTools, acceptedTerms, navigate]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
  };

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // toggleSkill removed — additional skills section removed

  const toggleLanguage = (language: string) => {
    setSelectedLanguages(prev => 
      prev.includes(language) ? prev.filter(l => l !== language) : [...prev, language]
    );
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
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
    
    if (!serviceType) {
      toast.error("Please select your service type"); return;
    }
    if (!formData.fullName || !formData.surname || !formData.phone) {
      toast.error("Please fill in all required fields"); return;
    }
    if (!dateOfBirth) { toast.error("Please select your date of birth"); return; }
    const calculatedAge = differenceInYears(new Date(), dateOfBirth);
    if (calculatedAge < 18) { toast.error("You must be at least 18 years old to register"); return; }
    if (!formData.gender) { toast.error("Please select your gender"); return; }
    if (!formData.nationality) { toast.error("Please select your nationality"); return; }
    if (!locationData && !formData.city && !formData.area) { toast.error("Please select your location"); return; }
    if (!formData.availability) { toast.error("Please select your availability"); return; }
    if (!formData.bio) { toast.error("Please write something about yourself"); return; }
    if (!formData.experience) { toast.error("Please enter your years of experience"); return; }
    if (selectedLanguages.length === 0) { toast.error("Please select at least one language"); return; }
    if (!avatarFile) { toast.error("Please upload a profile photo"); return; }
    const allSkillsSelected = [...selectedSkills, ...selectedDomesticSkills, ...selectedGardeningSkills];
    if (allSkillsSelected.length === 0) { toast.error("Please select at least one skill"); return; }
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

      // Upsert profiles row (non-blocking)
      supabase.from('profiles').upsert({
        user_id: userId,
        full_name: formData.fullName,
        surname: formData.surname,
        phone: formData.phone,
        role: 'helper',
        onboarding_completed: true,
        city: formData.city || null,
        area: formData.area || null,
      } as any, { onConflict: 'user_id' }).then(({ error }) => {
        if (error) console.error('Profiles row error:', error);
      });

      // Determine category based on service type
      const resolvedCategory = serviceType === "gardening" ? "gardener" 
        : serviceType === "both" ? [...formData.category, "gardener"].join(", ")
        : formData.category.join(", ") || "all-around";

      // Merge all skills
      const allSkills = [...selectedSkills, ...selectedDomesticSkills, ...selectedGardeningSkills];

      // Create helper profile
      const { error: profileError } = await supabase.from('helpers').insert({
        user_id: userId,
        full_name: `${formData.fullName} ${formData.surname}`.trim(),
        email: formData.email || `${formData.phone.replace(/\D/g, "")}@helper.domestichub.app`,
        phone: formData.phone,
        category: resolvedCategory,
        experience_years: formData.experience ? parseInt(formData.experience) : 0,
        hourly_rate: formData.monthlyRate ? parseFloat(formData.monthlyRate) : null,
        bio: formData.bio || null,
        availability: formData.availability || null,
        skills: allSkills,
        languages: selectedLanguages,
        has_work_permit: hasWorkPermit,
        intro_video_url: videoUrl,
        avatar_url: avatarUrl,
        age: calculatedAge,
        gender: formData.gender || null,
        nationality: formData.nationality || null,
        living_arrangement: formData.livingArrangement || null,
        service_type: serviceType,
        skills_domestic: selectedDomesticSkills,
        skills_gardening: selectedGardeningSkills,
        has_tools: hasTools,
        location: locationData?.formatted_address || [formData.area, formData.city].filter(Boolean).join(", ") || null,
      } as any);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        toast.error("Failed to create profile. Please try again.");
        setIsSubmitting(false); return;
      }

      // Terms acceptance (non-blocking)
      supabase.from('terms_acceptances').insert({
        user_id: userId,
        terms_version: '1.0',
      }).then(() => {});

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
            <h1 className="text-lg font-bold text-foreground">Registration</h1>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => saveDraft(true)} className="gap-1.5 text-xs">
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
              <Label>Date of Birth *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full mt-1 justify-start text-left font-normal",
                      !dateOfBirth && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateOfBirth ? format(dateOfBirth, "dd MMM yyyy") : <span>Select</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={4}>
                  <Calendar
                    mode="single"
                    selected={dateOfBirth}
                    onSelect={setDateOfBirth}
                    disabled={(date) => date > new Date() || date < new Date("1940-01-01")}
                    initialFocus
                    captionLayout="dropdown-buttons"
                    fromYear={1940}
                    toYear={new Date().getFullYear() - 18}
                    className={cn("p-4 pointer-events-auto min-w-[300px]")}
                  />
                </PopoverContent>
              </Popover>
              {dateOfBirth && differenceInYears(new Date(), dateOfBirth) < 18 && (
                <p className="text-xs text-destructive mt-1">Must be 18 or older</p>
              )}
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
                value={locationData}
                onChange={(loc: LocationData) => {
                  setLocationData(loc);
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

        {/* Service Type Selection (Mandatory) */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Briefcase size={18} className="text-primary" /> What type of work do you do? *
          </h2>
          <div className="flex gap-2">
            {serviceTypeOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setServiceType(opt.id)}
                className={`flex-1 py-3 px-2 rounded-xl border-2 text-center text-xs sm:text-sm font-semibold transition-colors ${
                  serviceType === opt.id
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Domestic category selection */}
        {(serviceType === "domestic" || serviceType === "both") && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">🏠 Domestic Category *</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const isChecked = formData.category.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      const updated = isChecked
                        ? formData.category.filter((c: string) => c !== cat.id)
                        : [...formData.category, cat.id];
                      handleInputChange("category", updated);
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      isChecked
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground hover:border-primary/40"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Domestic Skills */}
        {(serviceType === "domestic" || serviceType === "both") && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">🏠 Domestic Skills *</h2>
            <div className="flex flex-wrap gap-2">
              {domesticSkillOptions.map((skill) => (
                <Badge
                  key={skill}
                  variant={selectedDomesticSkills.includes(skill) ? "default" : "outline"}
                  className="cursor-pointer transition-all"
                  onClick={() => setSelectedDomesticSkills(prev => 
                    prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
                  )}
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* Gardening Skills */}
        {(serviceType === "gardening" || serviceType === "both") && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">🌱 Gardening Services *</h2>
            <div className="flex flex-wrap gap-2">
              {gardeningSkillOptions.map((skill) => (
                <Badge
                  key={skill}
                  variant={selectedGardeningSkills.includes(skill) ? "default" : "outline"}
                  className="cursor-pointer transition-all"
                  onClick={() => setSelectedGardeningSkills(prev => 
                    prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
                  )}
                >
                  {skill}
                </Badge>
              ))}
            </div>
            <div className="mt-3 bg-muted/50 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Do you have your own tools?</Label>
                <Switch checked={hasTools} onCheckedChange={setHasTools} />
              </div>
            </div>
          </section>
        )}

        {/* Additional Skills — shown for domestic or both (not pure gardening) */}
        {(serviceType === "domestic" || serviceType === "both") && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Additional Skills</h2>
            <div className="flex flex-wrap gap-2">
              {skillOptions.map((skill) => (
                <Badge key={skill} variant={selectedSkills.includes(skill) ? "default" : "outline"} className="cursor-pointer transition-all" onClick={() => toggleSkill(skill)}>
                  {skill}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* Experience & Rate */}
        <section className="space-y-3">
          <div>
            <Label htmlFor="experience">Years of Experience *</Label>
            <Input id="experience" type="number" placeholder="e.g., 5" value={formData.experience} onChange={(e) => handleInputChange("experience", e.target.value)} className="mt-1" min="0" max="50" />
          </div>
          <div>
            <Label htmlFor="monthlyRate">{serviceType === "gardening" ? "Rate (ZAR)" : "Monthly Rate (ZAR)"}</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">R</span>
              <Input id="monthlyRate" type="number" placeholder={serviceType === "gardening" ? "e.g., 250" : "e.g., 3500"} value={formData.monthlyRate} onChange={(e) => handleInputChange("monthlyRate", e.target.value)} className="pl-9" min="0" />
            </div>
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

        {/* Availability — multi-select */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Clock size={18} className="text-primary" /> Availability *
          </h2>
          <div className="flex flex-wrap gap-2">
            {availabilityOptions.map((option) => {
              const selected = formData.availability.split(", ").filter(Boolean).includes(option);
              return (
                <Badge
                  key={option}
                  variant={selected ? "default" : "outline"}
                  className="cursor-pointer transition-all text-sm py-1.5 px-3"
                  onClick={() => {
                    const current = formData.availability.split(", ").filter(Boolean);
                    const updated = selected
                      ? current.filter(a => a !== option)
                      : [...current, option];
                    handleInputChange("availability", updated.join(", "));
                  }}
                >
                  {option}
                </Badge>
              );
            })}
          </div>
        </section>

        {/* Living Arrangement */}
        {formData.availability.includes("Full-time") && (
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
