import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, User, Phone, Mail, Briefcase, Clock, Globe, DollarSign } from "lucide-react";
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

const categories = [
  { id: "nanny", label: "Nanny" },
  { id: "housekeeper", label: "Housekeeper" },
  { id: "caregiver", label: "Caregiver" },
  { id: "cook", label: "Cook" },
  { id: "driver", label: "Driver" },
  { id: "tutor", label: "Tutor" },
];

const skillOptions = [
  "Childcare", "Cooking", "Cleaning", "Laundry", "First Aid", 
  "Tutoring", "Elder Care", "Pet Care", "Driving", "Organizing",
  "Medication Management", "Physical Therapy", "Arts & Crafts"
];

const languageOptions = [
  "English", "Filipino", "Mandarin", "Cantonese", "Indonesian", 
  "Thai", "Vietnamese", "Hindi", "Tamil", "Malay"
];

const availabilityOptions = [
  "Full-time", "Part-time", "Live-in", "Live-out", "Weekdays only", 
  "Weekends only", "Flexible"
];

const HelperRegistration = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    category: "",
    experience: "",
    hourlyRate: "",
    bio: "",
    availability: "",
  });
  
  const [hasWorkPermit, setHasWorkPermit] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const toggleLanguage = (language: string) => {
    setSelectedLanguages(prev => 
      prev.includes(language) 
        ? prev.filter(l => l !== language)
        : [...prev, language]
    );
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        toast.error("Video file must be less than 100MB");
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.fullName || !formData.email || !formData.phone || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (selectedSkills.length === 0) {
      toast.error("Please select at least one skill");
      return;
    }

    setIsSubmitting(true);
    
    // TODO: Submit to backend when Lovable Cloud is enabled
    setTimeout(() => {
      toast.success("Registration submitted successfully!");
      setIsSubmitting(false);
      navigate("/");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate("/")}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Helper Registration</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 pb-24 space-y-6">
        {/* Personal Information */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <User size={18} className="text-primary" />
            Personal Information
          </h2>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative mt-1">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <div className="relative mt-1">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+65 9123 4567"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Work Permit Toggle */}
        <section className="bg-muted/50 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="workPermit" className="text-base font-semibold">
                Work Permit
              </Label>
              <p className="text-sm text-muted-foreground">
                Do you have all required work permits?
              </p>
            </div>
            <Switch
              id="workPermit"
              checked={hasWorkPermit}
              onCheckedChange={setHasWorkPermit}
            />
          </div>
          {hasWorkPermit && (
            <p className="text-xs text-primary mt-2 flex items-center gap-1">
              ✓ Verified work permit holder
            </p>
          )}
        </section>

        {/* Professional Details */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Briefcase size={18} className="text-primary" />
            Professional Details
          </h2>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => handleInputChange("category", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select your category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="experience">Years of Experience</Label>
              <Input
                id="experience"
                type="number"
                placeholder="e.g., 5"
                value={formData.experience}
                onChange={(e) => handleInputChange("experience", e.target.value)}
                className="mt-1"
                min="0"
                max="50"
              />
            </div>
            
            <div>
              <Label htmlFor="hourlyRate">Hourly Rate (SGD)</Label>
              <div className="relative mt-1">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="hourlyRate"
                  type="number"
                  placeholder="e.g., 15"
                  value={formData.hourlyRate}
                  onChange={(e) => handleInputChange("hourlyRate", e.target.value)}
                  className="pl-9"
                  min="0"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Skills */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Skills *</h2>
          <div className="flex flex-wrap gap-2">
            {skillOptions.map((skill) => (
              <Badge
                key={skill}
                variant={selectedSkills.includes(skill) ? "default" : "outline"}
                className="cursor-pointer transition-all"
                onClick={() => toggleSkill(skill)}
              >
                {skill}
              </Badge>
            ))}
          </div>
        </section>

        {/* Languages */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Globe size={18} className="text-primary" />
            Languages
          </h2>
          <div className="flex flex-wrap gap-2">
            {languageOptions.map((language) => (
              <Badge
                key={language}
                variant={selectedLanguages.includes(language) ? "default" : "outline"}
                className="cursor-pointer transition-all"
                onClick={() => toggleLanguage(language)}
              >
                {language}
              </Badge>
            ))}
          </div>
        </section>

        {/* Availability */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Clock size={18} className="text-primary" />
            Availability
          </h2>
          <Select 
            value={formData.availability} 
            onValueChange={(value) => handleInputChange("availability", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your availability" />
            </SelectTrigger>
            <SelectContent>
              {availabilityOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        {/* Bio */}
        <section className="space-y-3">
          <Label htmlFor="bio">About You</Label>
          <Textarea
            id="bio"
            placeholder="Tell families about yourself, your experience, and what makes you a great helper..."
            value={formData.bio}
            onChange={(e) => handleInputChange("bio", e.target.value)}
            rows={4}
          />
        </section>

        {/* Intro Video */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Upload size={18} className="text-primary" />
            Introduction Video
          </h2>
          <p className="text-sm text-muted-foreground">
            Record a short video (max 2 min) introducing yourself to families
          </p>
          
          {videoPreview ? (
            <div className="relative rounded-2xl overflow-hidden bg-muted">
              <video 
                src={videoPreview} 
                controls 
                className="w-full aspect-video object-cover"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  setVideoFile(null);
                  setVideoPreview(null);
                }}
              >
                Remove
              </Button>
            </div>
          ) : (
            <label className="block">
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-2xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
                <Upload size={32} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">
                  Tap to upload video
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  MP4, MOV up to 100MB
                </p>
              </div>
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                className="hidden"
              />
            </label>
          )}
        </section>

        {/* Submit Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Complete Registration"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default HelperRegistration;
