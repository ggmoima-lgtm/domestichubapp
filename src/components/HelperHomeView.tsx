import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  MapPin, Briefcase, Clock, Users, Search, DollarSign, Home,
  AlertTriangle, Pencil, FileText, CheckCircle, AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import PlatformStatsTicker from "@/components/PlatformStatsTicker";

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

const statusConfig: Record<string, { label: string; emoji: string; color: string }> = {
  available: { label: "Available", emoji: "🟢", color: "text-primary" },
  interviewing: { label: "In Conversation", emoji: "🟡", color: "text-secondary" },
  hired: { label: "Hired", emoji: "🔴", color: "text-destructive" },
};

function computeProfileStrength(helper: HelperProfile | null): { percent: number; checks: { label: string; done: boolean }[] } {
  if (!helper) return { percent: 0, checks: [] };

  const checks = [
    { label: "Photo uploaded", done: Boolean(helper.avatar_url) },
    { label: "Verified", done: Boolean(helper.is_verified) },
    { label: "Add bio", done: Boolean(helper.bio && helper.bio.length > 10) },
    { label: "Add more experience", done: Boolean(helper.experience_years && helper.experience_years > 0) },
    { label: "Add skills", done: Boolean(helper.skills && helper.skills.length > 0) },
  ];
  const done = checks.filter((c) => c.done).length;
  return { percent: Math.round((done / checks.length) * 100), checks };
}

const HelperHomeView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [helperProfile, setHelperProfile] = useState<HelperProfile | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

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
    if (!error && data) setJobs(data);
    setLoading(false);
  };

  const handleApply = async (jobId: string) => {
    if (!helperProfile) {
      toast.error("Please complete your helper profile first.");
      return;
    }
    const { percent: currentStrength } = computeProfileStrength(helperProfile);
    if (currentStrength < 80) {
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
  const status = statusConfig[helperProfile?.availability_status || "available"] || statusConfig.available;
  const firstName = helperProfile?.full_name?.split(" ")[0] || "there";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ─── Welcome Card ─── */}
      <Card className="p-5">
        <p className="text-lg font-bold text-foreground">
          👋 Welcome, {firstName}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Status: {status.emoji}{" "}
          <span className={status.color + " font-semibold"}>{status.label}</span>
        </p>
        <div className="mt-2">
          <PlatformStatsTicker />
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 rounded-xl gap-1.5"
            onClick={() => navigate("/home?tab=profile")}
          >
            <Pencil size={14} /> Edit Profile
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 rounded-xl gap-1.5"
            onClick={() => navigate("/home?tab=hub")}
          >
            <FileText size={14} /> View Applications
          </Button>
        </div>
      </Card>

      {/* ─── Profile Live Banner ─── */}
      {helperProfile && percent < 100 && (
        <Card className="p-5 border-primary/30 bg-primary/5">
          <p className="text-base font-bold text-foreground">🎉 Your profile is live!</p>
          <p className="text-sm text-muted-foreground mt-1">Employers can now find you.</p>
          <p className="text-xs text-muted-foreground mt-0.5">Complete your profile to increase your chances.</p>
          <Button
            size="sm"
            className="mt-3 rounded-xl w-full"
            onClick={() => navigate("/home?tab=profile")}
          >
            Complete Profile
          </Button>
        </Card>
      )}

      {/* ─── Incomplete profile banner ─── */}
      {!helperProfile && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Complete your profile first</p>
            <p className="text-xs text-muted-foreground">You need a complete profile to apply for jobs</p>
          </div>
          <Button size="sm" variant="outline" className="rounded-xl flex-shrink-0" onClick={() => navigate("/register/helper")}>
            Complete
          </Button>
        </div>
      )}

      {/* ─── Profile Strength ─── */}
      {helperProfile && (
        <Card className="p-5">
          <p className="text-sm font-bold text-foreground mb-2">
            📊 Your Profile Strength: {percent}%
          </p>
          <Progress value={percent} className="h-2 mb-3" />
          <div className="space-y-1.5">
            {checks.map((c) => (
              <div key={c.label} className="flex items-center gap-2 text-xs">
                {c.done ? (
                  <CheckCircle size={14} className="text-primary flex-shrink-0" />
                ) : (
                  <AlertCircle size={14} className="text-secondary flex-shrink-0" />
                )}
                <span className={c.done ? "text-muted-foreground" : "text-foreground font-medium"}>
                  {c.label}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Separator />

      {/* ─── Job Opportunities ─── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground text-sm">
            📩 New Job Opportunities
            <span className="text-muted-foreground font-normal ml-1">({filteredJobs.length})</span>
          </h3>
        </div>

        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search jobs by title, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-2xl h-11 bg-muted/50 border-0"
          />
        </div>

        <div className="space-y-3">
          {filteredJobs.map((job, index) => (
            <div
              key={job.id}
              className="bg-card rounded-2xl p-4 shadow-soft border border-border animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">{categoryIcons[job.category] || "💼"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-foreground text-sm">{job.title}</h4>
                  {job.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{job.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {job.location && (
                      <Badge variant="outline" className="text-[10px] gap-0.5">
                        <MapPin size={10} /> {job.location}
                      </Badge>
                    )}
                    {job.job_type && (
                      <Badge variant="outline" className="text-[10px] gap-0.5">
                        <Clock size={10} /> {job.job_type}
                      </Badge>
                    )}
                    {job.live_in_out && (
                      <Badge variant="outline" className="text-[10px] gap-0.5">
                        <Home size={10} /> {job.live_in_out}
                      </Badge>
                    )}
                    {(job.salary_min || job.salary_max) && (
                      <Badge variant="outline" className="text-[10px] gap-0.5">
                        <DollarSign size={10} />
                        R{job.salary_min || 0} - R{job.salary_max || "?"}
                        {job.negotiable && " (neg.)"}
                      </Badge>
                    )}
                  </div>
                  {job.duties && job.duties.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {job.duties.slice(0, 3).map((d) => (
                        <span key={d} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                          {d}
                        </span>
                      ))}
                      {job.duties.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{job.duties.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {new Date(job.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                </span>
              </div>
              {helperProfile && percent >= 80 ? (
                <Button
                  size="sm"
                  variant={appliedJobIds.has(job.id) ? "secondary" : "outline"}
                  className="w-full mt-3 rounded-xl"
                  onClick={() => handleApply(job.id)}
                  disabled={appliedJobIds.has(job.id)}
                >
                  {appliedJobIds.has(job.id) ? "Already Applied ✓" : "Apply Now"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-3 rounded-xl"
                  onClick={() => {
                    if (!helperProfile) {
                      toast.error("Complete your profile first to apply for jobs.");
                      navigate("/register/helper");
                    } else {
                      toast.error("Your profile must be at least 80% complete to apply.");
                      navigate("/home?tab=profile");
                    }
                  }}
                >
                  {!helperProfile ? "Complete Profile to Apply" : `Complete Profile (${percent}%) to Apply`}
                </Button>
              )}
            </div>
          ))}
        </div>

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
