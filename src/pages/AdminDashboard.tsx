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
  TrendingUp, UserCheck, Unlock, BarChart3, FileText,
  DollarSign, Gift, Activity
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Stats {
  totalHelpers: number;
  totalEmployers: number;
  totalUnlocks: number;
  totalReviews: number;
  totalReports: number;
  activeJobs: number;
  totalCredits: number;
  totalRevenue: number;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [stats, setStats] = useState<Stats>({ totalHelpers: 0, totalEmployers: 0, totalUnlocks: 0, totalReviews: 0, totalReports: 0, activeJobs: 0, totalCredits: 0, totalRevenue: 0 });
  const [helpers, setHelpers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newPromo, setNewPromo] = useState({ code: "", bonus_credits: "5", max_uses: "100" });

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      setIsAdmin(!!data);
      if (data) fetchStats();
    });
  }, [user]);

  const fetchStats = async () => {
    const [h, e, u, r, rep, j, inv] = await Promise.all([
      supabase.from("helpers").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "employer"),
      supabase.from("profile_unlocks").select("*", { count: "exact", head: true }),
      supabase.from("reviews").select("*", { count: "exact", head: true }),
      supabase.from("user_reports").select("*", { count: "exact", head: true }),
      supabase.from("job_posts").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("invoices").select("total").eq("status", "paid"),
    ]);
    const totalRevenue = (inv.data || []).reduce((sum: number, i: any) => sum + (i.total || 0), 0);
    setStats({
      totalHelpers: h.count || 0,
      totalEmployers: e.count || 0,
      totalUnlocks: u.count || 0,
      totalReviews: r.count || 0,
      totalReports: rep.count || 0,
      activeJobs: j.count || 0,
      totalCredits: 0,
      totalRevenue: totalRevenue,
    });
  };

  const fetchHelpers = async () => {
    const { data } = await supabase.from("helpers").select("id, full_name, email, phone, category, availability_status, is_verified, created_at, id_document_url, video_moderation_status, age, gender, nationality").order("created_at", { ascending: false }).limit(50);
    setHelpers(data || []);
  };

  const fetchReports = async () => {
    const { data } = await supabase.from("user_reports").select("*").order("created_at", { ascending: false }).limit(50);
    setReports(data || []);
  };

  const fetchTransactions = async () => {
    const { data } = await supabase.from("invoices").select("*").order("created_at", { ascending: false }).limit(50);
    setTransactions(data || []);
  };

  const fetchPromoCodes = async () => {
    const { data } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
    setPromoCodes(data || []);
  };

  useEffect(() => {
    if (!isAdmin) return;
    if (activeSection === "helpers") fetchHelpers();
    if (activeSection === "reports") fetchReports();
    if (activeSection === "revenue") fetchTransactions();
    if (activeSection === "promos") fetchPromoCodes();
  }, [isAdmin, activeSection]);

  const handleVerifyHelper = async (helperId: string, verified: boolean) => {
    await supabase.from("helpers").update({ is_verified: verified }).eq("id", helperId);
    toast.success(verified ? "Helper verified" : "Verification removed");
    fetchHelpers();
  };

  const handleCreatePromo = async () => {
    if (!newPromo.code) { toast.error("Enter a promo code"); return; }
    const { error } = await supabase.from("promo_codes").insert({
      code: newPromo.code.toUpperCase(),
      bonus_credits: parseInt(newPromo.bonus_credits) || 5,
      max_uses: parseInt(newPromo.max_uses) || 100,
    } as any);
    if (error) toast.error("Failed to create promo code");
    else { toast.success("Promo code created!"); setNewPromo({ code: "", bonus_credits: "5", max_uses: "100" }); fetchPromoCodes(); }
  };

  const handleResolveReport = async (reportId: string) => {
    await supabase.from("user_reports").update({ status: "resolved" } as any).eq("id", reportId);
    toast.success("Report resolved");
    fetchReports();
  };

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
    { id: "revenue", label: "Revenue", icon: DollarSign },
    { id: "promos", label: "Promos", icon: Gift },
  ];

  const filteredHelpers = helpers.filter((h) =>
    !searchQuery || h.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || h.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/home")}><ArrowLeft size={18} /></Button>
            <div>
              <h1 className="font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">Manage your platform</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1"><Shield size={12} /> Admin</Badge>
        </div>
      </header>

      <div className="sticky top-[57px] z-30 bg-card border-b border-border">
        <div className="flex gap-1 px-4 py-2 max-w-4xl mx-auto overflow-x-auto">
          {sections.map((s) => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeSection === s.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
              <s.icon size={14} />{s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Overview */}
        {activeSection === "overview" && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Users, value: stats.totalHelpers, label: "Helpers", color: "text-primary" },
              { icon: UserCheck, value: stats.totalEmployers, label: "Employers", color: "text-primary" },
              { icon: Unlock, value: stats.totalUnlocks, label: "Unlocks", color: "text-primary" },
              { icon: Star, value: stats.totalReviews, label: "Reviews", color: "text-amber-500" },
              { icon: Briefcase, value: stats.activeJobs, label: "Active Jobs", color: "text-primary" },
              { icon: Flag, value: stats.totalReports, label: "Reports", color: "text-destructive" },
              { icon: DollarSign, value: `R${stats.totalRevenue.toLocaleString()}`, label: "Revenue", color: "text-green-600" },
              { icon: Activity, value: Math.round((stats.totalUnlocks / Math.max(stats.totalEmployers, 1)) * 100) + "%", label: "Conversion", color: "text-primary" },
            ].map(({ icon: Icon, value, label, color }) => (
              <Card key={label}>
                <CardContent className="pt-4 text-center">
                  <Icon size={24} className={`mx-auto ${color} mb-1`} />
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Helpers Management */}
        {activeSection === "helpers" && (
          <>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search helpers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-xl h-12" />
            </div>
            <div className="space-y-2">
              {filteredHelpers.map((h) => (
                <Card key={h.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{h.full_name}</p>
                        <p className="text-xs text-muted-foreground">{h.email} · {h.category}</p>
                        <p className="text-xs text-muted-foreground">{h.age ? `${h.age}y` : ''} {h.gender || ''} {h.nationality || ''}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="text-[10px]">{h.availability_status}</Badge>
                        {h.is_verified && <Badge variant="secondary" className="text-[10px] gap-0.5"><CheckCircle size={8} /> Verified</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant={h.is_verified ? "outline" : "default"} className="flex-1 text-xs h-7"
                        onClick={() => handleVerifyHelper(h.id, !h.is_verified)}>
                        {h.is_verified ? "Unverify" : "Verify"}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive text-xs h-7"
                        onClick={async () => {
                          const newStatus = h.availability_status === "suspended" ? "available" : "suspended";
                          await supabase.from("helpers").update({ availability_status: newStatus }).eq("id", h.id);
                          toast.success(`Helper ${newStatus === "suspended" ? "suspended" : "unsuspended"}`);
                          fetchHelpers();
                        }}>
                        {h.availability_status === "suspended" ? <CheckCircle size={14} /> : <Ban size={14} />}
                        {h.availability_status === "suspended" ? " Unsuspend" : " Suspend"}
                      </Button>
                      {h.id_document_url && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => window.open(h.id_document_url, '_blank')}>
                          <FileText size={12} /> ID
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredHelpers.length === 0 && <p className="text-center text-muted-foreground py-8">No helpers found.</p>}
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
                    <Badge variant={r.status === "pending" ? "destructive" : "outline"} className="text-[10px]">{r.status}</Badge>
                    <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm font-semibold">{r.reason}</p>
                  {r.details && <p className="text-xs text-muted-foreground mt-1">{r.details}</p>}
                  {r.status === "pending" && (
                    <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={() => handleResolveReport(r.id)}>
                      <CheckCircle size={12} /> Resolve
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
            {reports.length === 0 && <p className="text-center text-muted-foreground py-8">No reports yet.</p>}
          </div>
        )}

        {/* Revenue */}
        {activeSection === "revenue" && (
          <div className="space-y-3">
            <Card>
              <CardContent className="pt-4 text-center">
                <DollarSign size={28} className="mx-auto text-green-600 mb-1" />
                <p className="text-3xl font-bold">R{stats.totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </CardContent>
            </Card>
            <h3 className="font-bold text-sm text-foreground">Recent Invoices</h3>
            {transactions.map((t) => (
              <Card key={t.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{t.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">{t.credits_purchased} credits · {new Date(t.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">R{t.total?.toFixed(2)}</p>
                    <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {transactions.length === 0 && <p className="text-center text-muted-foreground py-8">No invoices yet.</p>}
          </div>
        )}

        {/* Promo Codes */}
        {activeSection === "promos" && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Create Promo Code</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="PROMO CODE" value={newPromo.code} onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })} className="font-mono" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Bonus Credits</label>
                    <Input type="number" value={newPromo.bonus_credits} onChange={(e) => setNewPromo({ ...newPromo, bonus_credits: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Max Uses</label>
                    <Input type="number" value={newPromo.max_uses} onChange={(e) => setNewPromo({ ...newPromo, max_uses: e.target.value })} />
                  </div>
                </div>
                <Button className="w-full" onClick={handleCreatePromo}>Create Promo Code</Button>
              </CardContent>
            </Card>

            <h3 className="font-bold text-sm text-foreground">Existing Codes</h3>
            {promoCodes.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-mono font-bold text-sm">{p.code}</p>
                    <p className="text-xs text-muted-foreground">{p.bonus_credits} credits · {p.current_uses}/{p.max_uses || '∞'} uses</p>
                  </div>
                  <Badge variant={p.is_active ? "default" : "outline"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                </CardContent>
              </Card>
            ))}
            {promoCodes.length === 0 && <p className="text-center text-muted-foreground py-8">No promo codes yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
