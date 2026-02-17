import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin, ShieldCheck, Edit3, Save, X, ChevronRight, ChevronDown,
  LogOut, Trash2, Lock, Mail, Users, CreditCard,
  Briefcase, Heart, Unlock, Star, User, Clock, FileText, Plus
} from "lucide-react";
import CreateJobSheet from "@/components/CreateJobSheet";
import { mockWorkers } from "@/data/mockWorkers";
import { getPreviewName } from "@/lib/contactMasking";

const CATEGORIES = [
  { value: "nanny", label: "Nanny" },
  { value: "housekeeper", label: "Housekeeper" },
  { value: "caregiver", label: "Caregiver" },
  { value: "all-around", label: "All-around Helper" },
];

const AVAILABILITY_OPTIONS = [
  "Full-time",
  "Part-time",
  "Weekends",
  "Live-in",
  "Live-out",
  "Flexible",
];

interface EmployerData {
  id: string;
  user_id: string;
  email: string | null;
  location: string | null;
  type_of_need: string | null;
  full_name: string | null;
  category: string | null;
  availability: string[] | null;
  custom_notes: string | null;
}

const EmployerProfile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [employer, setEmployer] = useState<EmployerData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<EmployerData>>({});
  const [loading, setLoading] = useState(true);
  const [unlockCount, setUnlockCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [showSavedHelpers, setShowSavedHelpers] = useState(false);
  const [savedHelpers, setSavedHelpers] = useState<any[]>([]);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [jobCount, setJobCount] = useState(0);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("employer_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setEmployer(data as EmployerData);
      setEditData(data as EmployerData);
    }

    const { count: unlocks } = await supabase
      .from("profile_unlocks")
      .select("*", { count: "exact", head: true })
      .eq("employer_id", user.id);

    const { count: reviews } = await supabase
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .eq("employer_id", user.id);

    setUnlockCount(unlocks || 0);
    setReviewCount(reviews || 0);

    const { data: dbSaved } = await supabase
      .from("saved_helpers")
      .select("helper_id, created_at, helpers(id, full_name, avatar_url, category, availability_status)")
      .eq("employer_id", user.id)
      .order("created_at", { ascending: false });

    const localSaved: string[] = JSON.parse(localStorage.getItem("saved_helpers") || "[]");
    const localHelpers = localSaved.map((id) => {
      const mock = mockWorkers.find((w) => w.id === id);
      return mock ? { id: mock.id, full_name: mock.name, avatar_url: mock.avatar, category: mock.role, availability_status: "available", source: "local" } : null;
    }).filter(Boolean);

    const dbHelpers = (dbSaved || []).map((s: any) => ({
      ...s.helpers,
      source: "db",
    }));

    setSavedHelpers([...dbHelpers, ...localHelpers]);

    const { count: jobs } = await supabase
      .from("job_posts")
      .select("*", { count: "exact", head: true })
      .eq("employer_id", user.id)
      .eq("status", "active");
    setJobCount(jobs || 0);

    setLoading(false);
  };

  const handleSave = async () => {
    if (!employer) return;
    const { error } = await supabase
      .from("employer_profiles")
      .update({
        full_name: editData.full_name,
        location: editData.location,
        type_of_need: editData.type_of_need,
        category: editData.category,
        availability: editData.availability || [],
        custom_notes: editData.custom_notes,
      })
      .eq("id", employer.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated!");
      setIsEditing(false);
      fetchData();
    }
  };

  const toggleAvailability = (option: string) => {
    const current = editData.availability || [];
    if (current.includes(option)) {
      setEditData({ ...editData, availability: current.filter((a) => a !== option) });
    } else {
      setEditData({ ...editData, availability: [...current, option] });
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="pb-8 space-y-4">
      {/* Header */}
      <Card variant="gradient" className="overflow-hidden">
        <div className="gradient-primary p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center text-primary-foreground text-xl font-bold">
              {(employer?.full_name || user?.email)?.charAt(0).toUpperCase() || "E"}
            </div>
            <div className="text-primary-foreground">
              <h1 className="text-xl font-bold">{employer?.full_name || user?.email?.split("@")[0] || "Employer"}</h1>
              {employer?.location && (
                <p className="text-primary-foreground/80 text-sm flex items-center gap-1">
                  <MapPin size={14} /> {employer.location}
                </p>
              )}
              <Badge variant="secondary" className="gap-1 mt-2 shadow-soft">
                <ShieldCheck size={12} /> Contact Verified
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Household Info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Household Info</CardTitle>
          {isEditing ? (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setIsEditing(false); setEditData(employer || {}); }}><X size={16} /></Button>
              <Button size="sm" onClick={handleSave}><Save size={16} /> Save</Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Edit3 size={14} /> Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><User size={14} /> Full Name</Label>
                <Input
                  value={editData.full_name || ""}
                  onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><MapPin size={14} /> Location / Area</Label>
                <Input
                  value={editData.location || ""}
                  onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                  placeholder="e.g. Sandton, Johannesburg"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Briefcase size={14} /> Category of Need</Label>
                <Select
                  value={editData.category || ""}
                  onValueChange={(val) => setEditData({ ...editData, category: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Briefcase size={14} /> Type of Work</Label>
                <Input
                  value={editData.type_of_need || ""}
                  onChange={(e) => setEditData({ ...editData, type_of_need: e.target.value })}
                  placeholder="e.g. Childcare, Cooking, Cleaning"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Clock size={14} /> Availability Needed</Label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABILITY_OPTIONS.map((option) => {
                    const isSelected = (editData.availability || []).includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleAvailability(option)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-border hover:border-primary/30"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><FileText size={14} /> Custom Notes</Label>
                <Textarea
                  value={editData.custom_notes || ""}
                  onChange={(e) => setEditData({ ...editData, custom_notes: e.target.value })}
                  placeholder="Any special requirements or additional information..."
                  rows={3}
                />
              </div>
            </>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User size={14} className="shrink-0" /> <span>{employer?.full_name || "Not set"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin size={14} className="shrink-0" /> <span>{employer?.location || "Not set"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase size={14} className="shrink-0" />
                <span>{CATEGORIES.find((c) => c.value === employer?.category)?.label || employer?.category || "Not set"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase size={14} className="shrink-0" /> <span>{employer?.type_of_need || "Not set"}</span>
              </div>
              <div className="flex items-start gap-2 text-muted-foreground">
                <Clock size={14} className="shrink-0 mt-0.5" />
                <div className="flex flex-wrap gap-1.5">
                  {employer?.availability && employer.availability.length > 0 ? (
                    employer.availability.map((a) => (
                      <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>
                    ))
                  ) : (
                    <span>Not set</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail size={14} className="shrink-0" /> <span>{employer?.email || user?.email || "Not set"}</span>
              </div>
              {employer?.custom_notes && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <FileText size={14} className="shrink-0 mt-0.5" /> <span>{employer.custom_notes}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Job Management</CardTitle>
          <Button size="sm" onClick={() => setShowCreateJob(true)} className="gap-1">
            <Plus size={14} /> Post Job
          </Button>
        </CardHeader>
        <CardContent className="space-y-1 p-2">
          <button className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors">
            <span className="flex items-center gap-3 text-sm"><Briefcase size={16} className="text-primary" /> Active Jobs</span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">{jobCount} <ChevronRight size={16} /></span>
          </button>
          <button className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors">
            <span className="flex items-center gap-3 text-sm"><Unlock size={16} className="text-primary" /> Unlocked Profiles</span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">{unlockCount} <ChevronRight size={16} /></span>
          </button>
          <button
            onClick={() => setShowSavedHelpers(!showSavedHelpers)}
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors"
          >
            <span className="flex items-center gap-3 text-sm"><Heart size={16} className="text-destructive" /> Saved Helpers</span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              {savedHelpers.length}
              {showSavedHelpers ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          </button>

          {showSavedHelpers && (
            <div className="px-3 pb-2 space-y-2">
              {savedHelpers.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No saved helpers yet. Tap the heart on a helper's card to save them.</p>
              ) : (
                savedHelpers.map((helper: any) => (
                  <div key={helper.id} className="flex items-center gap-3 p-2 rounded-xl bg-muted/50">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary-light shrink-0">
                      {helper.avatar_url ? (
                        <img src={helper.avatar_url} alt={helper.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary font-bold">
                          {helper.full_name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{getPreviewName(helper.full_name)}</p>
                      <p className="text-xs text-muted-foreground">{helper.category}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {helper.availability_status === "available" ? "🟢 Available" : "🔴 Unavailable"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          )}
          <button className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors">
            <span className="flex items-center gap-3 text-sm"><Users size={16} className="text-muted-foreground" /> Hires Made</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 p-2">
          <button className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors">
            <span className="flex items-center gap-3 text-sm"><CreditCard size={16} className="text-muted-foreground" /> Purchase History</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      {/* Reviews Given */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star size={16} className="text-primary" /> Reviews Given ({reviewCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {reviewCount > 0 ? `You've written ${reviewCount} review${reviewCount > 1 ? "s" : ""}.` : "No reviews written yet."}
          </p>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 p-2">
          <button onClick={() => navigate("/privacy")} className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors">
            <span className="flex items-center gap-3 text-sm"><Lock size={16} className="text-muted-foreground" /> Privacy</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
          <Separator className="my-2" />
          <a
            href="mailto:info@domestichub.co.za"
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors"
          >
            <span className="flex items-center gap-3 text-sm"><Mail size={16} className="text-primary" /> Support</span>
            <span className="text-xs text-muted-foreground">info@domestichub.co.za</span>
          </a>
          <Separator className="my-2" />
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-sm text-destructive"
          >
            <LogOut size={16} /> Log Out
          </button>
          <button
            onClick={async () => {
              if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
              const { error } = await supabase.auth.admin.deleteUser(user!.id).catch(() => ({ error: null }));
              await signOut();
              toast.success("Account deleted. We're sorry to see you go.");
              navigate("/auth");
            }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-destructive/10 transition-colors text-sm text-destructive"
          >
            <Trash2 size={16} /> Delete Account
          </button>
        </CardContent>
      </Card>

      {/* Create Job Sheet */}
      <CreateJobSheet
        isOpen={showCreateJob}
        onClose={() => setShowCreateJob(false)}
        onCreated={fetchData}
      />
    </div>
  );
};

export default EmployerProfile;
