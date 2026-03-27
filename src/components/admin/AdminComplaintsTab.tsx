import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter_name?: string;
  reported_name?: string;
}

const AdminComplaintsTab = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");

  const fetchReports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (data && data.length > 0) {
      // Fetch reporter and reported user names
      const userIds = [...new Set(data.flatMap(r => [r.reporter_id, r.reported_user_id]))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

      setReports(data.map(r => ({
        ...r,
        reporter_name: nameMap.get(r.reporter_id) || "Unknown",
        reported_name: nameMap.get(r.reported_user_id) || "Unknown",
      })));
    } else {
      setReports([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, []);

  const handleResolve = async (reportId: string) => {
    const { error } = await supabase.from("user_reports").update({ status: "resolved" } as any).eq("id", reportId);
    if (error) { toast.error("Failed to resolve report"); return; }
    toast.success("Report resolved");
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: "resolved" } : r));
  };

  const handleDismiss = async (reportId: string) => {
    const { error } = await supabase.from("user_reports").update({ status: "dismissed" } as any).eq("id", reportId);
    if (error) { toast.error("Failed to dismiss report"); return; }
    toast.success("Report dismissed");
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: "dismissed" } : r));
  };

  const filtered = reports.filter(r => filter === "all" || r.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["all", "pending", "resolved"] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="text-xs capitalize rounded-xl" onClick={() => setFilter(f)}>
            {f} {f !== "all" && `(${reports.filter(r => f === "pending" ? r.status === "pending" : r.status === "resolved").length})`}
            {f === "all" && ` (${reports.length})`}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <Card key={r.id} className={r.status === "pending" ? "border-destructive/30" : ""}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={r.status === "pending" ? "destructive" : r.status === "dismissed" ? "outline" : "secondary"} className="text-[10px] capitalize">
                    {r.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>

                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-destructive" /> {r.reason}
                  </p>
                  {r.details && <p className="text-xs text-muted-foreground mt-1">{r.details}</p>}
                </div>

                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Reporter: <strong className="text-foreground">{r.reporter_name}</strong></span>
                  <span>Reported: <strong className="text-foreground">{r.reported_name}</strong></span>
                </div>

                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" className="flex-1 text-xs h-7" onClick={() => handleResolve(r.id)}>
                      <CheckCircle size={12} /> Resolve
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => handleDismiss(r.id)}>
                      <XCircle size={12} /> Dismiss
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No complaints found.</p>}
        </div>
      )}
    </div>
  );
};

export default AdminComplaintsTab;
