import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Briefcase } from "lucide-react";

interface EditJobSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  job: any;
}

const CATEGORIES = [
  { value: "nanny", label: "Nanny" },
  { value: "housekeeper", label: "Housekeeper" },
  { value: "caregiver", label: "Caregiver" },
  { value: "all-around", label: "All-around Helper" },
];

const DUTY_OPTIONS = [
  "Childcare", "Cooking", "Cleaning", "Laundry", "Ironing",
  "Grocery Shopping", "Pet Care", "Elder Care", "Tutoring", "Gardening",
];

const EditJobSheet = ({ isOpen, onClose, onUpdated, job }: EditJobSheetProps) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [jobType, setJobType] = useState("");
  const [liveInOut, setLiveInOut] = useState("");
  const [houseSize, setHouseSize] = useState("");
  const [familySize, setFamilySize] = useState("");
  const [duties, setDuties] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [negotiable, setNegotiable] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (job && isOpen) {
      setTitle(job.title || "");
      setCategory(job.category || "");
      setDescription(job.description || "");
      setJobType(job.job_type || "");
      setLiveInOut(job.live_in_out || "");
      setHouseSize(job.house_size || "");
      setFamilySize(job.family_size || "");
      setDuties(job.duties || []);
      setSalaryMin(job.salary_min?.toString() || "");
      setSalaryMax(job.salary_max?.toString() || "");
      setNegotiable(job.negotiable ?? true);
    }
  }, [job, isOpen]);

  if (!isOpen || !job) return null;

  const toggleDuty = (duty: string) => {
    setDuties((prev) =>
      prev.includes(duty) ? prev.filter((d) => d !== duty) : [...prev, duty]
    );
  };

  const handleUpdate = async () => {
    if (!title || !category) {
      toast.error("Please fill in at least the title and category.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("job_posts").update({
        title,
        category,
        description: description || null,
        job_type: jobType || null,
        live_in_out: liveInOut || null,
        house_size: houseSize || null,
        family_size: familySize || null,
        duties: duties.length > 0 ? duties : null,
        salary_min: salaryMin ? parseFloat(salaryMin) : null,
        salary_max: salaryMax ? parseFloat(salaryMax) : null,
        negotiable,
      }).eq("id", job.id);
      if (error) throw error;
      toast.success("Job updated!");
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error("Failed to update: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-float animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card pt-3 pb-2 flex justify-center z-20">
          <div className="w-10 h-1 bg-muted rounded-full" />
          <button onClick={onClose} className="absolute top-3 right-4 p-2 rounded-full bg-muted hover:bg-muted/80">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-24 space-y-4">
          <div className="flex items-center gap-2">
            <Briefcase size={20} className="text-primary" />
            <h3 className="font-bold text-foreground text-lg">Edit Job</h3>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Job Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl h-12" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="rounded-xl" />
          </div>

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

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Duties</Label>
            <div className="flex flex-wrap gap-2">
              {DUTY_OPTIONS.map((duty) => (
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Salary Min (R)</Label>
              <Input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} className="rounded-xl h-12" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Salary Max (R)</Label>
              <Input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} className="rounded-xl h-12" />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
            <Label className="text-sm">Salary Negotiable</Label>
            <Switch checked={negotiable} onCheckedChange={setNegotiable} />
          </div>

          <Button onClick={handleUpdate} disabled={isSubmitting} className="w-full h-12 rounded-xl font-semibold">
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditJobSheet;
