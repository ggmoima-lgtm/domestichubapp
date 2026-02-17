import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MapPin, Briefcase, Clock, Users, Search, DollarSign, Home } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const categoryIcons: Record<string, string> = {
  nanny: "👶",
  housekeeper: "🏠",
  caregiver: "❤️",
  "all-around": "✨",
};

const HelperHomeView = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [helperId, setHelperId] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
    if (user) {
      supabase.from("helpers").select("id").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (data) setHelperId(data.id);
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
    if (!helperId) {
      toast.error("Please complete your helper profile first.");
      return;
    }
    const { error } = await supabase.from("job_applications").insert({
      job_id: jobId,
      helper_id: helperId,
    });
    if (error) {
      if (error.code === "23505") toast.info("You've already applied to this job.");
      else toast.error("Failed to apply.");
    } else {
      toast.success("Application submitted!");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search jobs by title, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-2xl h-12 bg-muted/50 border-0"
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground">
          <Briefcase size={18} className="inline mr-2 text-primary" />
          Job Listings
          <span className="text-muted-foreground font-normal ml-2">({filteredJobs.length})</span>
        </h3>
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
                      <span key={d} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{d}</span>
                    ))}
                    {job.duties.length > 3 && <span className="text-[10px] text-muted-foreground">+{job.duties.length - 3}</span>}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {new Date(job.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
              </span>
            </div>
            {helperId && (
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-3 rounded-xl"
                onClick={() => handleApply(job.id)}
              >
                Apply Now
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
  );
};

export default HelperHomeView;
