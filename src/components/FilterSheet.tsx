import { useState } from "react";
import { X, MapPin, Briefcase, Wrench, Star, DollarSign, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";

export interface FilterState {
  locations: string[];
  jobTypes: string[];
  skills: string[];
  experienceMin: number;
  salaryRange: [number, number];
  nearMe: boolean;
}

export const defaultFilters: FilterState = {
  locations: [],
  jobTypes: [],
  skills: [],
  experienceMin: 0,
  salaryRange: [0, 15000],
  nearMe: false,
};

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
}

const LOCATIONS = ["Makati", "Quezon City", "Pasig", "Taguig", "Mandaluyong", "Parañaque", "Manila", "San Juan"];
const JOB_TYPES = ["Full-time", "Part-time", "Live-in", "Live-out", "Temporary", "Weekend only"];
const SKILLS = ["Cleaning", "Cooking", "Childcare", "Elderly care", "Laundry", "Ironing", "Babysitting", "Pet Care", "Gardening", "Driver", "First Aid", "Tutoring", "Grocery Shopping", "Organizing", "Arts & Crafts", "Baking", "Companionship", "Medication Management", "Physical Therapy", "Infant Care", "Toddler Care", "Education"];
const EXPERIENCE_OPTIONS = [
  { label: "Any", value: 0 },
  { label: "1+ yrs", value: 1 },
  { label: "2–4 yrs", value: 2 },
  { label: "5+ yrs", value: 5 },
];

const FilterSheet = ({ isOpen, onClose, filters, onApply }: FilterSheetProps) => {
  const [local, setLocal] = useState<FilterState>(filters);

  const toggle = (key: "locations" | "jobTypes" | "skills", value: string) => {
    setLocal((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));
  };

  const activeCount =
    local.locations.length +
    local.jobTypes.length +
    local.skills.length +
    (local.experienceMin > 0 ? 1 : 0) +
    (local.salaryRange[0] > 0 || local.salaryRange[1] < 300 ? 1 : 0) +
    (local.nearMe ? 1 : 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-float animate-slide-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-card pt-3 pb-2 flex justify-center z-10 rounded-t-3xl">
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3">
          <h2 className="text-lg font-bold text-foreground">Filters</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocal(defaultFilters)}
              className="text-sm text-primary font-semibold flex items-center gap-1"
            >
              <RotateCcw size={14} /> Reset
            </button>
            <button onClick={onClose} className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 px-5 pb-6 space-y-6">
          {/* Near Me Toggle */}
          <div className="flex items-center justify-between p-3 bg-primary-light rounded-2xl">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-primary" />
              <span className="font-semibold text-sm text-foreground">Near me</span>
            </div>
            <Switch
              checked={local.nearMe}
              onCheckedChange={(v) => setLocal((p) => ({ ...p, nearMe: v }))}
            />
          </div>

          {/* Location */}
          <div>
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2 text-sm">
              <MapPin size={16} className="text-primary" /> Location
            </h3>
            <div className="flex flex-wrap gap-2">
              {LOCATIONS.map((loc) => (
                <Badge
                  key={loc}
                  variant={local.locations.includes(loc) ? "default" : "outline"}
                  className="cursor-pointer transition-all"
                  onClick={() => toggle("locations", loc)}
                >
                  {loc}
                </Badge>
              ))}
            </div>
          </div>

          {/* Job Type */}
          <div>
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2 text-sm">
              <Briefcase size={16} className="text-primary" /> Job Type / Availability
            </h3>
            <div className="flex flex-wrap gap-2">
              {JOB_TYPES.map((type) => (
                <Badge
                  key={type}
                  variant={local.jobTypes.includes(type) ? "default" : "outline"}
                  className="cursor-pointer transition-all"
                  onClick={() => toggle("jobTypes", type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div>
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2 text-sm">
              <Wrench size={16} className="text-primary" /> Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {SKILLS.map((skill) => (
                <Badge
                  key={skill}
                  variant={local.skills.includes(skill) ? "default" : "outline"}
                  className="cursor-pointer transition-all"
                  onClick={() => toggle("skills", skill)}
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div>
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2 text-sm">
              <Star size={16} className="text-primary" /> Experience Level
            </h3>
            <div className="flex gap-2">
              {EXPERIENCE_OPTIONS.map((opt) => (
                <Badge
                  key={opt.value}
                  variant={local.experienceMin === opt.value ? "default" : "outline"}
                  className="cursor-pointer transition-all flex-1 justify-center"
                  onClick={() => setLocal((p) => ({ ...p, experienceMin: opt.value }))}
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Salary Range */}
          <div>
            <h3 className="font-bold text-foreground mb-2 flex items-center gap-2 text-sm">
              <DollarSign size={16} className="text-primary" /> Salary Range (ZAR/month)
            </h3>
            <div className="px-1 pt-2">
              <Slider
                min={0}
                max={15000}
                step={500}
                value={local.salaryRange}
                onValueChange={(v) => setLocal((p) => ({ ...p, salaryRange: v as [number, number] }))}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>R{local.salaryRange[0]}</span>
                <span>R{local.salaryRange[1]}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Apply Button */}
        <div className="px-5 py-4 border-t border-border bg-card">
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              onApply(local);
              onClose();
            }}
          >
            Apply Filters {activeCount > 0 && `(${activeCount})`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FilterSheet;
