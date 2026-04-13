import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import LocationAutocomplete, { LocationData } from "./LocationAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { X, Plus, Briefcase } from "lucide-react";
import { maskContactInfo } from "@/lib/contactMasking";

interface CreateJobSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CATEGORIES = [
  { value: "nanny", label: "Nanny" },
  { value: "housekeeper", label: "Housekeeper" },
  { value: "caregiver", label: "Caregiver" },
  { value: "all-around", label: "All-around Helper" },
  { value: "gardener", label: "Gardener" },
];

const DOMESTIC_DUTIES = [
  "Childcare", "Cooking", "Cleaning", "Laundry", "Ironing",
  "Grocery Shopping", "Pet Care", "Elder Care", "Tutoring",
];

const GARDENING_DUTIES = [
  "Lawn Mowing", "Hedge Trimming", "Tree Pruning", "Planting",
  "Weeding", "Irrigation", "Composting", "Landscaping", "Pool Maintenance",
];

const CreateJobSheet = ({ isOpen, onClose, onCreated }: CreateJobSheetProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [jobType, setJobType] = useState("");
  const [liveInOut, setLiveInOut] = useState("");
  const [houseSize, setHouseSize] = useState("");
  const [familySize, setFamilySize] = useState("");
  const [duties, setDuties] = useState<string[]>([]);
  const [hoursPerWeek, setHoursPerWeek] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [negotiable, setNegotiable] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleDuty = (duty: string) => {
    setDuties((prev) =>
      prev.includes(duty) ? prev.filter((d) => d !== duty) : [...prev, duty]
    );
  };

  const handleSubmit = async () => {
    if (!user || !title || !category) {
      toast.error("Please fill in at least the title and category.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("job_posts").insert({
        employer_id: user.id,
        title,
        category,
        description: description || null,
        location: locationData?.formatted_address || null,
        job_type: jobType || null,
        live_in_out: liveInOut || null,
        house_size: houseSize || null,
        family_size: familySize || null,
        duties: duties.length > 0 ? duties : null,
        hours_per_week: hoursPerWeek ? parseInt(hoursPerWeek) : null,
        salary_min: salaryMin ? parseFloat(salaryMin) : null,
        salary_max: salaryMax ? parseFloat(salaryMax) : null,
        negotiable,
      });
      if (error) throw error;
      toast.success("Job posted successfully!");

      // Notify matching helpers about the new job
      supabase.functions.invoke("notify-helpers-new-job", {
        body: {
          job_id: "new",
          category,
          location: locationData?.formatted_address || null,
          title,
          employer_id: user.id,
        },
      }).catch(() => {});

      onCreated();
      onClose();
      // Reset
      setTitle(""); setCategory(""); setDescription(""); setLocationData(null);
      setJobType(""); setLiveInOut(""); setHouseSize(""); setFamilySize("");
      setDuties([]); setHoursPerWeek(""); setDaysPerWeek(""); setSalaryMin(""); setSalaryMax("");
    } catch (err: any) {
      toast.error("Failed to post job: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-float animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card pt-3 pb-2 flex justify-center z-10">
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-muted hover:bg-muted/80">
          <X size={18} />
        </button>

        <div className="px-5 pb-24 space-y-4">
          <div className="flex items-center gap-2">
            <Briefcase size={20} className="text-primary" />
            <h3 className="font-bold text-foreground text-lg">Post a Job</h3>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Job Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Full-time Nanny needed" className="rounded-xl h-12" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Description</Label>
            <Textarea value={description} onChange={(e) => {
              const raw = e.target.value;
              const masked = maskContactInfo(raw);
              if (masked !== raw) toast.error("Contact information is not allowed in job descriptions");
              setDescription(masked);
            }} placeholder="Describe the role..." rows={3} className="rounded-xl" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Location</Label>
            <LocationAutocomplete
              value={locationData}
              onChange={setLocationData}
              placeholder="e.g. Sandton, Johannesburg"
            />
          </div>

          {category !== "gardener" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Job Type</Label>
                <Select value={jobType} onValueChange={setJobType}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Living Arrangement</Label>
                <Select value={liveInOut} onValueChange={setLiveInOut}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live-in">Live-in</SelectItem>
                    <SelectItem value="live-out">Live-out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {category !== "gardener" && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">House Size</Label>
              <Input value={houseSize} onChange={(e) => setHouseSize(e.target.value)} placeholder="e.g. 3 bedroom" className="rounded-xl h-12" />
            </div>
          )}

          {category === "gardener" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Frequency</Label>
                <Select value={jobType} onValueChange={setJobType}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once-off">Once-off</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Garden Size</Label>
                <Select value={houseSize} onValueChange={setHouseSize}>
                  <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                    <SelectItem value="estate">Estate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {category === "gardener" && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
              <Label className="text-sm">Must have own tools</Label>
              <Switch checked={liveInOut === "own-tools"} onCheckedChange={(v) => setLiveInOut(v ? "own-tools" : "")} />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">{category === "gardener" ? "Services Required" : "Duties Required"}</Label>
            <div className="flex flex-wrap gap-2">
              {(category === "gardener" ? GARDENING_DUTIES : DOMESTIC_DUTIES).map((duty) => (
                <button
                  key={duty}
                  type="button"
                  onClick={() => toggleDuty(duty)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    duties.includes(duty)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/30"
                  }`}
                >
                  {duty}
                </button>
              ))}
            </div>
          </div>

          {jobType === "part-time" && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Days per Week</Label>
              <Select value={daysPerWeek} onValueChange={setDaysPerWeek}>
                <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Select days" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} {d === 1 ? "day" : "days"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {jobType !== "full-time" && jobType !== "part-time" && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Hours per Week</Label>
              <Input type="number" value={hoursPerWeek} onChange={(e) => setHoursPerWeek(e.target.value)} placeholder="e.g. 40" className="rounded-xl h-12" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Salary Min (R)</Label>
              <Input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="e.g. 3000" className="rounded-xl h-12" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Salary Max (R)</Label>
              <Input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="e.g. 5000" className="rounded-xl h-12" />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
            <Label className="text-sm">Salary Negotiable</Label>
            <Switch checked={negotiable} onCheckedChange={setNegotiable} />
          </div>

          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full h-12 rounded-xl font-semibold">
            {isSubmitting ? "Posting..." : "Post Job"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateJobSheet;
