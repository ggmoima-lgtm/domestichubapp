import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  MapPin, Clock, Search, Home, X, Briefcase, User,
  Settings2, ListChecks, PenSquare, Zap, Globe, Wrench, MoreHorizontal,
  ChevronRight, CheckCircle, AlertCircle, Pencil, FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface JobPost {
  id: string;
  employer_id: string;
  title: string;
  category: string;
  description: string | null;
  location: string | null;
  job_type: string | null;
  live_in_out: string | null;
  house_size: string | null;
  family_size: string | null;
  duties: string[] | null;
  hours_per_week: number | null;
  salary_min: number | null;
  salary_max: number | null;
  negotiable: boolean | null;
  created_at: string;
}

interface HelperProfile {
  id: string;
  full_name: string;
  availability_status: string;
  avatar_url: string | null;
  is_verified: boolean | null;
  bio: string | null;
  experience_years: number | null;
  skills: string[] | null;
  languages: string[] | null;
  intro_video_url: string | null;
}

const categoryIcons: Record<string, string> = {
  nanny: "👶",
  housekeeper: "🏠",
  caregiver: "❤️",
  "all-around": "✨",
  gardener: "🌿",
};

function computeProfileStrength(helper: HelperProfile | null) {
  if (!helper) return { percent: 0, checks: [] as { label: string; done: boolean }[] };
  const checks = [
    { label: "Photo uploaded", done: Boolean(helper.avatar_url) },
    { label: "Verified", done: Boolean(helper.is_verified) },
    { label: "Add bio", done: Boolean(helper.bio && helper.bio.length > 10) },
    { label: "Add experience", done: Boolean(helper.experience_years && helper.experience_years > 0) },
    { label: "Add skills", done: Boolean(helper.skills && helper.skills.length > 0) },
  ];
  const done = checks.filter((c) => c.done).length;
  return { percent: Math.round((done / checks.length) * 100), checks };
}

const jobCollections = [
  { icon: Zap, label: "Quick Apply", color: "text-amber-600 bg-amber-100" },
  { icon: Globe, label: "Live-Out", color: "text-sky-600 bg-sky-100" },
  { icon: Wrench, label: "Full-Time", color: "text-emerald-600 bg-emerald-100" },
  { icon: MoreHorizontal, label: "More", color: "text-muted-foreground bg-muted" },
];

const HelperHomeView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [employerNames, setEmployerNames] = useState<Record<string, string>>({});
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [helperProfile, setHelperProfile] = useState<HelperProfile | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    fetchJobs();
    if (user) {
      supabase
        .from("helpers")
        .select("id, full_name, availability_status, avatar_url, is_verified, bio, experience_years, skills, languages, intro_video_url")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setHelperProfile(data);
            supabase
              .from("job_applications")
              .select("job_id")
              .eq("helper_id", data.id)
              .then(({ data: apps }) => {
                if (apps) setAppliedJobIds(new Set(apps.map((a) => a.job_id)));
              });
          }
        });
    }
  }, [user]);

   const fetchJobs = async () => {
    const { data, error } = await supabase
      .from("job_posts")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setJobs(data);
      // Fetch employer names for initials via secure RPC
      const employerIds = [...new Set(data.map((j) => j.employer_id))];
      if (employerIds.length > 0) {
        const { data: names } = await supabase.rpc("get_employer_names", {
          p_employer_ids: employerIds,
        });
        if (names) {
          const nameMap: Record<string, string> = {};
          (names as any[]).forEach((n: any) => {
            nameMap[n.user_id] = n.display_name;
          });
          setEmployerNames(nameMap);
        }
      }
    }
    setLoading(false);
  };

  const handleApply = async (jobId: string) => {
    if (!helperProfile) {
      toast.error("Please complete your helper profile first.");
      return;
    }
    const { percent } = computeProfileStrength(helperProfile);
    if (percent < 80) {
      toast.error("Your profile must be at least 80% complete to apply for jobs.");
      return;
    }
    const { error } = await supabase.from("job_applications").insert({
      job_id: jobId,
      helper_id: helperProfile.id,
    });
    if (error) {
      if (error.code === "23505") toast.info("You've already applied to this job.");
      else toast.error("Failed to apply.");
    } else {
      setAppliedJobIds((prev) => new Set(prev).add(jobId));
      toast.success("Application submitted!");

      const job = jobs.find((j) => j.id === jobId);
      if (job) {
        supabase.functions
          .invoke("send-notification", {
            body: {
              user_id: job.employer_id,
              type: "hire_updates",
              title: "New Application!",
              body: `${helperProfile.full_name || "A helper"} applied to your job "${job.title}"`,
              data: { job_id: jobId },
            },
          })
          .catch(console.error);
      }
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (dismissedIds.has(job.id)) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      job.title.toLowerCase().includes(q) ||
      job.category.toLowerCase().includes(q) ||
      (job.location || "").toLowerCase().includes(q) ||
      (job.description || "").toLowerCase().includes(q)
    );
  });

  const { percent, checks } = computeProfileStrength(helperProfile);
  const firstName = helperProfile?.full_name?.split(" ")[0] || "there";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* ─── LinkedIn-style Search Bar ─── */}
      <div className="flex items-center gap-3 mb-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={async (e) => {
            if (!user || !helperProfile || !e.target.files?.[0]) return;
            const file = e.target.files[0];
            if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
            if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
            setAvatarUploading(true);
            try {
              const ext = file.name.split(".").pop() || "jpg";
              const filePath = `${user.id}/${Date.now()}.${ext}`;
              const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
              if (uploadError) throw uploadError;
              const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
              const { error: updateError } = await supabase.from("helpers").update({ avatar_url: urlData.publicUrl }).eq("id", helperProfile.id);
              if (updateError) throw updateError;
              setHelperProfile({ ...helperProfile, avatar_url: urlData.publicUrl });
              toast.success("Profile photo updated!");
            } catch (err: any) {
              toast.error("Failed to upload photo: " + (err.message || "Unknown error"));
            } finally {
              setAvatarUploading(false);
              e.target.value = "";
            }
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="relative flex-shrink-0"
          disabled={avatarUploading}
        >
          <div className={`w-14 h-14 rounded-full overflow-hidden bg-muted border-[3px] ${
            helperProfile?.availability_status === "available" 
              ? "border-green-500" 
              : "border-destructive"
          }`}>
            {avatarUploading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : helperProfile?.avatar_url ? (
              <img src={helperProfile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-lg font-bold text-muted-foreground">{firstName[0]}</span>
              </div>
            )}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card ${
            helperProfile?.availability_status === "available" ? "bg-green-500" : "bg-destructive"
          }`} />
        </button>
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search jobs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-muted/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* ─── Filter Pills (LinkedIn-style) ─── */}
      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
        <button
          onClick={() => navigate("/home?tab=profile#notification-preferences")}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-border text-sm font-medium text-foreground whitespace-nowrap hover:bg-muted transition-colors"
        >
          <Settings2 size={14} /> Preferences
        </button>
        <button
          onClick={() => navigate("/home?tab=hub")}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-border text-sm font-medium text-foreground whitespace-nowrap hover:bg-muted transition-colors"
        >
          <ListChecks size={14} /> Job tracker
        </button>
        <button
          onClick={() => navigate("/home?tab=profile")}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-border text-sm font-medium text-foreground whitespace-nowrap hover:bg-muted transition-colors"
        >
          <Pencil size={14} /> Edit Profile
        </button>
      </div>

      {/* ─── Profile Strength (compact LinkedIn-style) ─── */}
      {helperProfile && percent < 100 && (
        <div className="bg-card border border-border rounded-lg p-4 mb-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground">
              Profile strength: {percent}%
            </p>
            <Button
              size="sm"
              variant="link"
              className="text-primary text-xs h-auto p-0"
              onClick={() => navigate("/home?tab=profile")}
            >
              Complete <ChevronRight size={12} />
            </Button>
          </div>
          <Progress value={percent} className="h-1.5 mb-2" />
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {checks.map((c) => (
              <div key={c.label} className="flex items-center gap-1 text-xs">
                {c.done ? (
                  <CheckCircle size={12} className="text-primary" />
                ) : (
                  <AlertCircle size={12} className="text-muted-foreground" />
                )}
                <span className={c.done ? "text-muted-foreground" : "text-foreground"}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Divider ─── */}
      <div className="h-2 bg-muted/50 -mx-4" />

      {/* ─── Top Job Picks Section ─── */}
      <div className="pt-4">
        <h2 className="text-lg font-bold text-foreground">Top job picks for you</h2>
        <p className="text-xs text-muted-foreground mt-0.5 mb-4">
          Based on your profile, preferences, and activity like applies, searches, and saves
        </p>

        <div className="divide-y divide-border">
          {filteredJobs.map((job) => {
            const isApplied = appliedJobIds.has(job.id);
            const daysSincePosted = Math.floor(
              (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)
            );

            return (
              <div key={job.id} className="py-3 first:pt-0">
                <div className="flex items-start gap-3">
                  {/* Employer Initials */}
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E6EAF0' }}>
                    <User size={22} style={{ color: '#6B7280' }} />
                  </div>

                  {/* Job Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground leading-tight">
                      {job.title}
                      {isApplied && (
                        <span className="ml-1.5 inline-flex items-center text-[10px] text-primary font-medium">✓ Applied</span>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{job.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.location || "South Africa"}
                      {job.job_type && ` (${job.job_type})`}
                    </p>

                    {/* Salary & Meta */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {(job.salary_min || job.salary_max) && (
                        <span className="text-[11px] text-muted-foreground">
                          R{job.salary_min || 0} – R{job.salary_max || "?"}
                          {job.negotiable && " (neg.)"}
                        </span>
                      )}
                      {job.live_in_out && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                          <Home size={10} /> {job.live_in_out}
                        </span>
                      )}
                    </div>

                    {/* Actively reviewing / Posted date */}
                    {daysSincePosted <= 3 && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                          <Zap size={10} className="text-primary" />
                        </div>
                        <span className="text-[11px] text-primary font-medium">Actively reviewing applicants</span>
                      </div>
                    )}

                    <p className="text-[11px] text-muted-foreground mt-1">
                      {daysSincePosted === 0 ? "Today" : daysSincePosted === 1 ? "1 day ago" : `${daysSincePosted} days ago`}
                    </p>

                    {/* Apply Button */}
                    {helperProfile && percent >= 80 ? (
                      <Button
                        size="sm"
                        variant={isApplied ? "outline" : "default"}
                        className="mt-2 rounded-full h-8 text-xs px-5"
                        onClick={() => handleApply(job.id)}
                        disabled={isApplied}
                      >
                        {isApplied ? "Applied" : "Easy Apply"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 rounded-full h-8 text-xs px-5"
                        onClick={() => {
                          if (!helperProfile) {
                            toast.error("Complete your profile first.");
                            navigate("/register/helper");
                          } else {
                            toast.error("Profile must be ≥80% to apply.");
                            navigate("/home?tab=profile");
                          }
                        }}
                      >
                        Complete Profile to Apply
                      </Button>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>

        {filteredJobs.length > 0 && (
          <button
            className="flex items-center justify-center gap-1 w-full py-3 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors border-t border-border mt-1"
            onClick={() => {
              setDismissedIds(new Set());
              setSearchQuery("");
            }}
          >
            Show all <ChevronRight size={16} />
          </button>
        )}

        {filteredJobs.length === 0 && (
          <div className="text-center py-12">
            <Briefcase size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">No jobs posted yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Check back soon for new opportunities</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default HelperHomeView;
