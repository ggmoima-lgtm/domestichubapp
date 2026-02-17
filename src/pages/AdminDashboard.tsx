import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Users, Briefcase, Star, CreditCard, Shield, Search,
  Ban, CheckCircle, XCircle, ArrowLeft, Flag, Eye,
  TrendingUp, UserCheck, Unlock, BarChart3
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Stats {
  totalHelpers: number;
  totalEmployers: number;
  totalUnlocks: number;
  totalReviews: number;
  totalReports: number;
  activeJobs: number;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [stats, setStats] = useState<Stats>({ totalHelpers: 0, totalEmployers: 0, totalUnlocks: 0, totalReviews: 0, totalReports: 0, activeJobs: 0 });
  const [helpers, setHelpers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    // Check admin role
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      setIsAdmin(!!data);
      if (data) fetchStats();
    });
  }, [user]);

  const fetchStats = async () => {
    const [h, e, u, r, rep, j] = await Promise.all([
      supabase.from("helpers").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "employer"),
      supabase.from("profile_unlocks").select("*", { count: "exact", head: true }),
      supabase.from("reviews").select("*", { count: "exact", head: true }),
      supabase.from("user_reports").select("*", { count: "exact", head: true }),
      supabase.from("job_posts").select("*", { count: "exact", head: true }).eq("status", "active"),
    ]);
    setStats({
      totalHelpers: h.count || 0,
      totalEmployers: e.count || 0,
      totalUnlocks: u.count || 0,
      totalReviews: r.count || 0,
      totalReports: rep.count || 0,
      activeJobs: j.count || 0,
    });
  };

  const fetchHelpers = async () => {
    const { data } = await supabase.from("helpers").select("id, full_name, email, phone, category, availability_status, is_verified, created_at").order("created_at", { ascending: false }).limit(50);
    setHelpers(data || []);
  };

  const fetchReports = async () => {
    const { data } = await supabase.from("user_reports").select("*").order("created_at", { ascending: false }).limit(50);
    setReports(data || []);
  };

  useEffect(() => {
    if (isAdmin && activeSection === "helpers") fetchHelpers();
    if (isAdmin && activeSection === "reports") fetchReports();
  }, [isAdmin, activeSection]);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-8 pb-6">
            <Shield size={48} className="mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground text-sm mb-4">You don't have admin privileges.</p>
            <Button onClick={() => navigate("/home")} variant="outline">
              <ArrowLeft size={16} /> Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sections = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "helpers", label: "Helpers", icon: Users },
    { id: "reports", label: "Reports", icon: Flag },
  ];

  const filteredHelpers = helpers.filter((h) =>
    !searchQuery || h.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || h.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/home")}>
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">Manage your platform</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <Shield size={12} /> Admin
          </Badge>
        </div>
      </header>

      {/* Nav Tabs */}
      <div className="sticky top-[57px] z-30 bg-card border-b border-border">
        <div className="flex gap-1 px-4 py-2 max-w-4xl mx-auto overflow-x-auto">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeSection === s.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <s.icon size={14} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Overview */}
        {activeSection === "overview" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Card><CardContent className="pt-4 text-center">
                <Users size={24} className="mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{stats.totalHelpers}</p>
                <p className="text-xs text-muted-foreground">Helpers</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <UserCheck size={24} className="mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{stats.totalEmployers}</p>
                <p className="text-xs text-muted-foreground">Employers</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <Unlock size={24} className="mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{stats.totalUnlocks}</p>
                <p className="text-xs text-muted-foreground">Unlocks</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <Star size={24} className="mx-auto text-amber-500 mb-1" />
                <p className="text-2xl font-bold">{stats.totalReviews}</p>
                <p className="text-xs text-muted-foreground">Reviews</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <Briefcase size={24} className="mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{stats.activeJobs}</p>
                <p className="text-xs text-muted-foreground">Active Jobs</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <Flag size={24} className="mx-auto text-destructive mb-1" />
                <p className="text-2xl font-bold">{stats.totalReports}</p>
                <p className="text-xs text-muted-foreground">Reports</p>
              </CardContent></Card>
            </div>
          </>
        )}

        {/* Helpers Management */}
        {activeSection === "helpers" && (
          <>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search helpers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl h-12"
              />
            </div>
            <div className="space-y-2">
              {filteredHelpers.map((h) => (
                <Card key={h.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{h.full_name}</p>
                      <p className="text-xs text-muted-foreground">{h.email} · {h.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {h.availability_status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={async () => {
                          const newStatus = h.availability_status === "suspended" ? "available" : "suspended";
                          await supabase.from("helpers").update({ availability_status: newStatus }).eq("id", h.id);
                          toast.success(`Helper ${newStatus === "suspended" ? "suspended" : "unsuspended"}`);
                          fetchHelpers();
                        }}
                      >
                        {h.availability_status === "suspended" ? <CheckCircle size={16} /> : <Ban size={16} />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredHelpers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No helpers found.</p>
              )}
            </div>
          </>
        )}

        {/* Reports */}
        {activeSection === "reports" && (
          <div className="space-y-2">
            {reports.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant={r.status === "pending" ? "destructive" : "outline"} className="text-[10px]">
                      {r.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm font-semibold">{r.reason}</p>
                  {r.details && <p className="text-xs text-muted-foreground mt-1">{r.details}</p>}
                </CardContent>
              </Card>
            ))}
            {reports.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No reports yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
