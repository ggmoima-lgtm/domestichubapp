import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Briefcase, MapPin, Clock, Home, DollarSign, CheckCircle, XCircle, Hourglass } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Application {
  id: string;
  status: string;
  created_at: string;
  message: string | null;
  job: {
    id: string;
    title: string;
    category: string;
    location: string | null;
    job_type: string | null;
    live_in_out: string | null;
    salary_min: number | null;
    salary_max: number | null;
    negotiable: boolean | null;
    status: string;
  } | null;
}

const categoryIcons: Record<string, string> = {
  nanny: "👶",
  housekeeper: "🏠",
  caregiver: "❤️",
  "all-around": "✨",
  gardener: "🌿",
};

const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  pending: { label: "Pending", icon: <Hourglass size={12} />, className: "bg-amber-100 text-amber-700 border-amber-200" },
  accepted: { label: "Accepted", icon: <CheckCircle size={12} />, className: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "Declined", icon: <XCircle size={12} />, className: "bg-red-100 text-red-700 border-red-200" },
  shortlisted: { label: "Shortlisted", icon: <CheckCircle size={12} />, className: "bg-blue-100 text-blue-700 border-blue-200" },
};

const HelperApplicationsHub = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchApplications = async () => {
      // Get helper id
      const { data: helper } = await supabase
        .from("helpers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!helper) {
        setLoading(false);
        return;
      }

      const { data: apps } = await supabase
        .from("job_applications")
        .select("id, status, created_at, message, job_id")
        .eq("helper_id", helper.id)
        .order("created_at", { ascending: false });

      if (!apps || apps.length === 0) {
        setApplications([]);
        setLoading(false);
        return;
      }

      // Fetch job details for all applications
      const jobIds = apps.map(a => a.job_id);
      const { data: jobs } = await supabase
        .from("job_posts")
        .select("id, title, category, location, job_type, live_in_out, salary_min, salary_max, negotiable, status")
        .in("id", jobIds);

      const jobMap = new Map((jobs || []).map(j => [j.id, j]));

      setApplications(apps.map(a => ({
        ...a,
        job: jobMap.get(a.job_id) || null,
      })));
      setLoading(false);
    };

    fetchApplications();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground text-lg">
          <Briefcase size={18} className="inline mr-2 text-primary" />
          My Applications
        </h3>
        <span className="text-muted-foreground text-sm">
          {applications.length} applied
        </span>
      </div>

      <div className="space-y-3">
        {applications.map((app, index) => {
          const status = statusConfig[app.status] || statusConfig.pending;
          return (
            <div
              key={app.id}
              className="bg-card rounded-2xl p-4 shadow-soft border border-border animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">{app.job ? categoryIcons[app.job.category] || "💼" : "💼"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-foreground text-sm">
                    {app.job?.title || "Job no longer available"}
                  </h4>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.className}`}>
                      {status.icon} {status.label}
                    </span>
                    {app.job?.location && (
                      <Badge variant="outline" className="text-[10px] gap-0.5">
                        <MapPin size={10} /> {app.job.location}
                      </Badge>
                    )}
                    {app.job?.job_type && (
                      <Badge variant="outline" className="text-[10px] gap-0.5">
                        <Clock size={10} /> {app.job.job_type}
                      </Badge>
                    )}
                    {app.job?.live_in_out && (
                      <Badge variant="outline" className="text-[10px] gap-0.5">
                        <Home size={10} /> {app.job.live_in_out}
                      </Badge>
                    )}
                    {app.job && (app.job.salary_min || app.job.salary_max) && (
                      <Badge variant="outline" className="text-[10px] gap-0.5">
                        <DollarSign size={10} />
                        R{app.job.salary_min || 0} - R{app.job.salary_max || "?"}
                        {app.job.negotiable && " (neg.)"}
                      </Badge>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {new Date(app.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {applications.length === 0 && (
        <div className="text-center py-12">
          <Briefcase size={40} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">No applications yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Apply to jobs from the Home tab to see them here</p>
        </div>
      )}
    </div>
  );
};

export default HelperApplicationsHub;
