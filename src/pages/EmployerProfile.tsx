import { useState, useEffect, useRef } from "react";
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
  LogOut, Trash2, Lock, Mail, Users, CreditCard, AlertTriangle,
  Briefcase, Heart, Unlock, Star, User, Clock, FileText, Plus, Phone, Bell, Camera
} from "lucide-react";
import CreateJobSheet from "@/components/CreateJobSheet";
import EditJobSheet from "@/components/EditJobSheet";
import CreditWalletCard from "@/components/CreditWalletCard";
import InvoiceHistory from "@/components/InvoiceHistory";
import ChangePhoneSheet from "@/components/ChangePhoneSheet";
import WorkerDetailSheet from "@/components/WorkerDetailSheet";
import ApplicationPreviewSheet from "@/components/ApplicationPreviewSheet";
import LocationAutocomplete, { type LocationData } from "@/components/LocationAutocomplete";
import { mockWorkers } from "@/data/mockWorkers";
import { getPreviewName, maskContactInfo } from "@/lib/contactMasking";

const CATEGORIES = [
  { value: "nanny", label: "Nanny" },
  { value: "housekeeper", label: "Housekeeper" },
  { value: "caregiver", label: "Caregiver" },
  { value: "all-around", label: "All-around Helper" },
  { value: "gardener", label: "Gardener" },
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
  avatar_url: string | null;
  formatted_address: string | null;
  suburb: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
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
  const [showChangePhone, setShowChangePhone] = useState(false);
  const [userPhone, setUserPhone] = useState("");
  const [showApplications, setShowApplications] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [applicationCount, setApplicationCount] = useState(0);
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null);
  const [selectedAppMeta, setSelectedAppMeta] = useState<{ jobTitle: string; date: string }>({ jobTitle: "", date: "" });
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [showHires, setShowHires] = useState(false);
  const [hires, setHires] = useState<any[]>([]);
  const [hireCount, setHireCount] = useState(0);
  const [showActiveJobs, setShowActiveJobs] = useState(false);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [showEditJob, setShowEditJob] = useState(false);
  const [showUnlockedProfiles, setShowUnlockedProfiles] = useState(false);
  const [editLocationData, setEditLocationData] = useState<LocationData | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [unlockedProfiles, setUnlockedProfiles] = useState<any[]>([]);
  const [selectedSavedHelper, setSelectedSavedHelper] = useState<any>(null);

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
      const normalizedData = {
        ...data,
        email: data.email || user.email || null,
      } as EmployerData;
      setEmployer(normalizedData);
      setEditData(normalizedData);
    } else {
      setEditData({
        email: user.email || "",
        availability: [],
      });
    }

    const { count: unlocks } = await supabase
      .from("profile_unlocks")
      .select("*", { count: "exact", head: true })
      .eq("employer_id", user.id)
      .gt("expires_at", new Date().toISOString());

    const { count: reviews } = await supabase
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .eq("employer_id", user.id);

    setUnlockCount(unlocks || 0);
    setReviewCount(reviews || 0);

    const { data: dbSaved } = await supabase
      .from("saved_helpers")
      .select("helper_id, created_at, helpers(id, full_name, avatar_url, category, availability_status, service_type)")
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

    const { data: jobsData, count: jobs } = await supabase
      .from("job_posts")
      .select("*", { count: "exact" })
      .eq("employer_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    setJobCount(jobs || 0);
    setActiveJobs(jobsData || []);

    // Fetch unlocked profiles with helper details
    const { data: unlocksData } = await supabase
      .from("profile_unlocks")
      .select("*, helpers(id, full_name, avatar_url, category, availability_status, service_type)")
      .eq("employer_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .order("unlocked_at", { ascending: false });
    setUnlockedProfiles(unlocksData || []);

    // Fetch applications for employer's jobs
    const { data: jobPosts } = await supabase
      .from("job_posts")
      .select("id, title")
      .eq("employer_id", user.id);

    // Fetch placements (hired helpers)
    const { data: placementsData } = await supabase
      .from("placements")
      .select("id, helper_id, employer_name, job_type, job_category, status, hired_at, ended_at, helpers(id, full_name, avatar_url, category, availability_status)")
      .eq("employer_id", user.id)
      .order("hired_at", { ascending: false });

    const hiredHelperIds = (placementsData || []).map((p: any) => p.helper_id);
    setHires(placementsData || []);
    setHireCount(placementsData?.length || 0);

    if (jobPosts && jobPosts.length > 0) {
      const jobIds = jobPosts.map(j => j.id);
      const { data: apps, count: appCount } = await supabase
        .from("job_applications")
        .select("*, helpers(id, user_id, full_name, avatar_url, category, phone, bio, languages, availability, intro_video_url, availability_status, available_from, skills, experience_years, hourly_rate, is_verified, email)", { count: "exact" })
        .in("job_id", jobIds)
        .order("created_at", { ascending: false });

      // Filter out helpers who have been hired (have active placements)
      const enrichedApps = (apps || []).filter(app => !hiredHelperIds.includes(app.helper_id)).map(app => ({
        ...app,
        job_title: jobPosts.find(j => j.id === app.job_id)?.title || "Unknown Job",
      }));
      setApplications(enrichedApps);
      setApplicationCount(enrichedApps.length);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("phone")
      .eq("user_id", user.id)
      .maybeSingle();
    setUserPhone(profile?.phone || "");

    setLoading(false);
  };

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || saving) return;

    const fullName = (editData.full_name || "").trim();
    const resolvedEmail = (editData.email || user.email || "").trim();

    if (!fullName) {
      toast.error("Please enter your full name");
      return;
    }

    if (!resolvedEmail || !resolvedEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSaving(true);

    try {
      const payload: any = {
        full_name: fullName,
        email: resolvedEmail,
        location: editData.location || null,
        type_of_need: editData.type_of_need || null,
        category: editData.category || null,
        availability: editData.availability || [],
        custom_notes: editData.custom_notes || null,
        formatted_address: editData.formatted_address || null,
        suburb: editData.suburb || null,
        city: editData.city || null,
        province: editData.province || null,
        country: editData.country || null,
        latitude: editData.latitude || null,
        longitude: editData.longitude || null,
        place_id: editData.place_id || null,
      };

      let error;
      if (employer) {
        ({ error } = await supabase
          .from("employer_profiles")
          .update(payload)
          .eq("user_id", user.id));
      } else {
        ({ error } = await supabase
          .from("employer_profiles")
          .insert({ ...payload, user_id: user.id }));
      }

      if (error) {
        toast.error("Failed to update profile: " + error.message);
        return;
      }

      const { error: profileSyncError } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: user.id,
            full_name: fullName,
            email: resolvedEmail,
            phone: user.phone || "",
            role: "employer",
          } as any,
          { onConflict: "user_id" },
        );

      if (profileSyncError) {
        toast.error("Profile saved, but account details did not fully sync");
      } else {
        toast.success("Profile updated!");
      }

      setIsEditing(false);
      await fetchData();
    } finally {
      setSaving(false);
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/employer-avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl + "?t=" + Date.now();

      const { error: updateError } = await supabase
        .from("employer_profiles")
        .update({ avatar_url: avatarUrl } as any)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      toast.success("Profile picture updated!");
      fetchData();
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully");
  };

  const updateApplicationStatus = async (appId: string, newStatus: string, helperUserId: string | null, jobTitle: string) => {
    const { error } = await supabase
      .from("job_applications")
      .update({ status: newStatus })
      .eq("id", appId);

    if (error) {
      toast.error("Failed to update status");
      return;
    }

    const statusLabels: Record<string, string> = {
      shortlisted: "Shortlisted",
      accepted: "Accepted",
      rejected: "Declined",
    };
    toast.success(`Application ${statusLabels[newStatus] || newStatus}`);

    // Update local state
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));

    // Notify helper
    if (helperUserId) {
      supabase.functions.invoke("send-notification", {
        body: {
          user_id: helperUserId,
          type: "hire_updates",
          title: `Application ${statusLabels[newStatus] || "Updated"}`,
          body: `Your application for "${jobTitle}" has been ${statusLabels[newStatus]?.toLowerCase() || "updated"}.`,
          data: { application_id: appId },
        },
      }).catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background gap-4">
        <img
          src={new URL("../assets/logo.jpg", import.meta.url).href}
          alt="Domestic Hub"
          className="w-24 h-24 object-contain rounded-2xl shadow-lg animate-[heartbeat_1.2s_ease-in-out_infinite]"
        />
        <p className="text-muted-foreground text-xs font-medium">Loading profile...</p>
      </div>
    );
  }

  const isProfileIncomplete = !employer?.full_name || !employer?.location || !employer?.avatar_url || !employer?.category;

  const handlePostJobClick = () => {
    if (isProfileIncomplete) {
      toast.error("Complete your profile first", {
        description: "Add a profile photo, verified location, name, and category before posting a job.",
      });
      setIsEditing(true);
      setTimeout(() => document.getElementById("household-info")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      return;
    }
    setShowCreateJob(true);
  };

  return (
    <div className="pb-28 space-y-4">
      {/* Incomplete profile banner */}
      {isProfileIncomplete && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="flex-1">
             <p className="text-sm font-semibold text-foreground">Complete your profile first</p>
            <p className="text-xs text-muted-foreground">Add a profile photo, verified location, name, and category to post jobs</p>
          </div>
          <Button size="sm" variant="outline" className="rounded-xl flex-shrink-0 border-primary text-primary" onClick={() => {
            setIsEditing(true);
            setTimeout(() => document.getElementById("household-info")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
          }}>
            Complete
          </Button>
        </div>
      )}

      {/* Header - LinkedIn style */}
      <Card variant="gradient" className="overflow-hidden">
        <div className="gradient-primary p-6 pb-8">
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="relative">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-primary-light border-[3px] border-primary-foreground/40">
                {employer?.avatar_url ? (
                  <img src={employer.avatar_url} alt={employer.full_name || ""} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-primary-foreground text-3xl font-bold">
                    {(employer?.full_name || user?.email)?.charAt(0).toUpperCase() || "E"}
                  </div>
                )}
              </div>
              <label className="absolute -bottom-1 -left-1 bg-card text-foreground rounded-full p-1.5 shadow-soft cursor-pointer">
                {avatarUploading ? (
                  <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                ) : (
                  <Camera size={14} />
                )}
                <input
                  ref={avatarInputRef}
                   type="file"
                   accept="image/*"
                   className="hidden"
                   onChange={handleAvatarUpload}
                  disabled={avatarUploading}
                />
              </label>
            </div>
            <div className="text-center text-primary-foreground">
              <h1 className="text-xl font-bold">{employer?.full_name || user?.email?.split("@")[0] || "Employer"}</h1>
              {employer?.location && (
                <p className="text-primary-foreground/80 text-sm flex items-center justify-center gap-1">
                  <MapPin size={14} /> {employer.formatted_address || employer.location}
                </p>
              )}
              <Badge variant="secondary" className="gap-1 mt-2 shadow-soft">
                <ShieldCheck size={12} /> Contact Verified
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Sticky Save Button when editing */}
      {isEditing && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-end gap-2 shadow-md">
          <Button size="sm" variant="ghost" onClick={() => { setIsEditing(false); setEditData(employer || {}); }} disabled={saving}>
            <X size={16} /> Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      )}

      {/* Household Info */}
      <Card id="household-info">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Household Info</CardTitle>
          {!isEditing && (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Edit3 size={14} /> Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={editData.full_name || ""}
                  onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Location / Area <span className="text-destructive">*</span></Label>
                <LocationAutocomplete
                  value={editLocationData}
                  onChange={(loc) => {
                    setEditLocationData(loc);
                    setEditData({
                      ...editData,
                      location: loc.formatted_address,
                      formatted_address: loc.formatted_address,
                      suburb: loc.suburb,
                      city: loc.city,
                      province: loc.province,
                      country: loc.country,
                      latitude: loc.latitude,
                      longitude: loc.longitude,
                      place_id: loc.place_id,
                    });
                  }}
                  placeholder="e.g. Sandton, Johannesburg"
                />
              </div>
              <div className="space-y-2">
                <Label>Category of Need</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const selectedCats = (editData.category || "").split(",").filter(Boolean);
                    const isSelected = selectedCats.includes(cat.value);
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => {
                          const current = (editData.category || "").split(",").filter(Boolean);
                          const updated = isSelected
                            ? current.filter((c) => c !== cat.value)
                            : [...current, cat.value];
                          setEditData({ ...editData, category: updated.join(",") });
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-border hover:border-primary/30"
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Availability Needed</Label>
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
                <Label>Email <span className="text-destructive text-xs">*</span></Label>
                <Input
                  type="email"
                  value={editData.email || ""}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Custom Notes</Label>
                <Textarea
                  value={editData.custom_notes || ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const masked = maskContactInfo(raw);
                    if (masked !== raw) {
                      toast.error("Contact information is not allowed in notes");
                    }
                    setEditData({ ...editData, custom_notes: masked });
                  }}
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
              <div className="flex items-start gap-2 text-muted-foreground">
                <Briefcase size={14} className="shrink-0 mt-0.5" />
                <div className="flex flex-wrap gap-1.5">
                  {employer?.category ? (
                    employer.category.split(",").filter(Boolean).map((c) => (
                      <Badge key={c} variant="outline" className="text-[10px]">
                        {CATEGORIES.find((cat) => cat.value === c)?.label || c}
                      </Badge>
                    ))
                  ) : (
                    <span>Not set</span>
                  )}
                </div>
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
          <Button
            size="sm"
            onClick={handlePostJobClick}
            className="gap-1"
            aria-disabled={isProfileIncomplete}
            title={isProfileIncomplete ? "Complete your profile to post jobs" : undefined}
          >
            <Plus size={14} /> Post Job
          </Button>
        </CardHeader>
        <CardContent className="space-y-1 p-2">
          <button
            onClick={() => setShowActiveJobs(!showActiveJobs)}
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors"
          >
            <span className="flex items-center gap-3 text-sm"><Briefcase size={16} className="text-primary" /> My Active Jobs</span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              {jobCount}
              {showActiveJobs ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          </button>

          {showActiveJobs && (
            <div className="px-3 pb-2 space-y-2">
              {activeJobs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No active jobs. Tap "Post Job" to create one.</p>
              ) : (
                activeJobs.map((job: any) => (
                  <div key={job.id} className="p-3 rounded-xl bg-muted/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{job.title}</p>
                        <p className="text-xs text-muted-foreground">{job.category} · {job.job_type || "Not specified"}</p>
                        {job.location && <p className="text-xs text-muted-foreground mt-0.5">📍 {job.location}</p>}
                        {(job.salary_min || job.salary_max) && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            💰 R{job.salary_min || 0} - R{job.salary_max || "Negotiable"}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingJob(job);
                            setShowEditJob(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm("Delete this job post?")) return;
                            const { error } = await supabase.from("job_posts").delete().eq("id", job.id);
                            if (error) toast.error("Failed to delete job.");
                            else {
                              toast.success("Job deleted.");
                              fetchData();
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <button
            onClick={() => setShowUnlockedProfiles(!showUnlockedProfiles)}
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors"
          >
            <span className="flex items-center gap-3 text-sm"><Unlock size={16} className="text-primary" /> Unlocked Profiles</span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              {unlockCount}
              {showUnlockedProfiles ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          </button>

          {showUnlockedProfiles && (
            <div className="px-3 pb-2 space-y-2">
              {unlockedProfiles.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No unlocked profiles yet.</p>
              ) : (
                unlockedProfiles.map((unlock: any) => (
                  <div key={unlock.id} className="flex items-center gap-3 p-2 rounded-xl bg-muted/50">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary-light shrink-0">
                      {unlock.helpers?.avatar_url ? (
                        <img src={unlock.helpers.avatar_url} alt={unlock.helpers.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary font-bold">
                          {unlock.helpers?.full_name?.charAt(0) || "?"}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{unlock.helpers?.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {unlock.helpers?.service_type === "gardening" ? "Gardener" 
                          : unlock.helpers?.service_type === "both" ? "Domestic + Gardening" 
                          : (unlock.helpers?.category || "Helper")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {unlock.helpers?.availability_status === "available" ? "Available" 
                        : unlock.helpers?.availability_status === "interviewing" ? "In Conversation"
                        : unlock.helpers?.availability_status === "hired_platform" || unlock.helpers?.availability_status === "hired_external" ? "Hired"
                        : "Unavailable"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          )}

          <button
            id="saved-helpers"
            onClick={() => setShowSavedHelpers(!showSavedHelpers)}
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors scroll-mt-20"
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
                  <div
                    key={helper.id}
                    className="flex items-center gap-3 p-2 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => {
                      setSelectedSavedHelper(helper);
                      setShowFullProfile(true);
                    }}
                  >
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
                      <p className="text-xs text-muted-foreground capitalize">
                        {helper.service_type === "gardening" ? "Gardener" 
                          : helper.service_type === "both" ? "Domestic + Gardening" 
                          : (helper.category || "Helper")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {helper.availability_status === "available" ? "Available" 
                        : helper.availability_status === "interviewing" ? "In Conversation"
                        : helper.availability_status === "hired_platform" || helper.availability_status === "hired_external" ? "Hired"
                        : "Unavailable"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          )}
          <button
            onClick={() => setShowApplications(!showApplications)}
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors"
          >
            <span className="flex items-center gap-3 text-sm">
              <FileText size={16} className="text-primary" /> Applications
              {applicationCount > 0 && (
                <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {applicationCount}
                </span>
              )}
            </span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              {applicationCount}
              {showApplications ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          </button>

          {showApplications && (
            <div className="px-3 pb-2 space-y-2">
              {applications.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No applications received yet.</p>
              ) : (
                applications.map((app: any) => (
                  <div key={app.id} className="rounded-xl bg-muted/50 overflow-hidden">
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => {
                        const h = app.helpers;
                        if (!h) return;
                        setSelectedApplicant(h);
                        setSelectedAppMeta({ jobTitle: app.job_title, date: app.created_at });
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary-light shrink-0">
                        {app.helpers?.avatar_url ? (
                          <img src={app.helpers.avatar_url} alt={app.helpers.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-primary font-bold">
                            {app.helpers?.full_name?.charAt(0) || "?"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{getPreviewName(app.helpers?.full_name || "Unknown")}</p>
                        <p className="text-xs text-muted-foreground truncate">Applied for: {app.job_title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(app.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <Badge
                        variant={app.status === "pending" ? "secondary" : app.status === "accepted" ? "default" : app.status === "shortlisted" ? "outline" : "destructive"}
                        className="text-[10px] shrink-0"
                      >
                        {app.status === "pending" ? "Pending" : app.status === "accepted" ? "Accepted" : app.status === "shortlisted" ? "Shortlisted" : app.status === "rejected" ? "Declined" : app.status}
                      </Badge>
                    </div>
                    {app.status === "pending" && (
                      <div className="flex gap-2 px-3 pb-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] rounded-lg"
                          onClick={() => updateApplicationStatus(app.id, "shortlisted", app.helpers?.user_id, app.job_title)}
                        >
                          Shortlist
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-[10px] rounded-lg"
                          onClick={() => updateApplicationStatus(app.id, "accepted", app.helpers?.user_id, app.job_title)}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] rounded-lg border-destructive text-destructive hover:bg-destructive/10"
                          onClick={() => updateApplicationStatus(app.id, "rejected", app.helpers?.user_id, app.job_title)}
                        >
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          <button
            onClick={() => setShowHires(!showHires)}
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors"
          >
            <span className="flex items-center gap-3 text-sm"><Users size={16} className="text-primary" /> Hires Made</span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              {hireCount}
              {showHires ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          </button>

          {showHires && (
            <div className="px-3 pb-2 space-y-2">
              {hires.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No hires made yet.</p>
              ) : (
                hires.map((hire: any) => (
                  <div
                    key={hire.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => {
                      const h = hire.helpers;
                      if (!h) return;
                      setSelectedApplicant(h);
                      setSelectedAppMeta({ jobTitle: hire.job_category || "General", date: hire.hired_at });
                      setShowFullProfile(true);
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary-light shrink-0">
                      {hire.helpers?.avatar_url ? (
                        <img src={hire.helpers.avatar_url} alt={hire.helpers.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary font-bold">
                          {hire.helpers?.full_name?.charAt(0) || "?"}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{hire.helpers?.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground truncate">{hire.job_category || "Helper"} · {hire.job_type || "Full-time"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Hired {new Date(hire.hired_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <Badge
                      variant={hire.status === "active" ? "default" : "outline"}
                      className="text-[10px] shrink-0"
                    >
                      {hire.status === "active" ? "✅ Active" : hire.status === "completed" ? "✓ Completed" : hire.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit Wallet */}
      <CreditWalletCard />

      {/* Invoice History */}
      <InvoiceHistory />

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
          <button onClick={() => setShowChangePhone(true)} className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors">
            <span className="flex items-center gap-3 text-sm"><Phone size={16} className="text-muted-foreground" /> Change Phone Number</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
          <button onClick={() => navigate("/privacy")} className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors">
            <span className="flex items-center gap-3 text-sm"><Lock size={16} className="text-muted-foreground" /> Privacy Policy</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
          <button onClick={() => navigate("/terms")} className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors">
            <span className="flex items-center gap-3 text-sm"><FileText size={16} className="text-muted-foreground" /> Terms & Conditions</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
          <Separator className="my-2" />
          <button
            onClick={() => navigate("/home?tab=support")}
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors"
          >
            <span className="flex items-center gap-3 text-sm"><Mail size={16} className="text-primary" /> Support & Help</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
          <Separator className="my-2" />
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-sm text-destructive"
          >
            <LogOut size={16} /> Log Out
          </button>
          <button
            onClick={() => navigate("/delete-account")}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-destructive/10 transition-colors text-sm text-destructive"
          >
            <Trash2 size={16} /> Request Account Deletion
          </button>
        </CardContent>
      </Card>

      {/* Edit Job Sheet */}
      <EditJobSheet
        isOpen={showEditJob}
        onClose={() => { setShowEditJob(false); setEditingJob(null); }}
        onUpdated={fetchData}
        job={editingJob}
      />

      {/* Create Job Sheet */}
      <CreateJobSheet
        isOpen={showCreateJob}
        onClose={() => setShowCreateJob(false)}
        onCreated={fetchData}
      />

      {/* Change Phone Sheet */}
      <ChangePhoneSheet
        isOpen={showChangePhone}
        onClose={() => setShowChangePhone(false)}
        currentPhone={userPhone}
        onChanged={(p) => setUserPhone(p)}
      />

      {/* Application Preview Sheet */}
      <ApplicationPreviewSheet
        isOpen={!!selectedApplicant && !showFullProfile}
        onClose={() => setSelectedApplicant(null)}
        helper={selectedApplicant}
        jobTitle={selectedAppMeta.jobTitle}
        applicationDate={selectedAppMeta.date}
        onViewFullProfile={() => setShowFullProfile(true)}
      />

      {/* Full Profile Sheet (after unlock) */}
      <WorkerDetailSheet
        worker={showFullProfile && selectedApplicant ? {
          id: selectedApplicant.id,
          name: selectedApplicant.full_name || "Unknown",
          role: selectedApplicant.category || "Helper",
          location: "",
          rating: 0,
          reviews: 0,
          experience: selectedApplicant.experience_years ? `${selectedApplicant.experience_years} years` : "",
          monthlyRate: selectedApplicant.hourly_rate ? `R${selectedApplicant.hourly_rate}/hr` : "",
          verified: selectedApplicant.is_verified || false,
          avatar: selectedApplicant.avatar_url || "/placeholder.svg",
          skills: selectedApplicant.skills || [],
          bio: selectedApplicant.bio || "",
          languages: selectedApplicant.languages || [],
          availability: selectedApplicant.availability || "",
          introVideo: selectedApplicant.intro_video_url || "",
          availabilityStatus: selectedApplicant.availability_status || "available",
          availableFrom: selectedApplicant.available_from || null,
        } : null}
        isOpen={showFullProfile && !!selectedApplicant}
        onClose={() => { setShowFullProfile(false); setSelectedApplicant(null); }}
        onHired={fetchData}
      />

      {/* Saved Helper Profile Sheet */}
      <WorkerDetailSheet
        worker={selectedSavedHelper ? {
          id: selectedSavedHelper.id,
          name: selectedSavedHelper.full_name || "Unknown",
          role: selectedSavedHelper.category || "Helper",
          location: "",
          rating: 0,
          reviews: 0,
          experience: selectedSavedHelper.experience_years ? `${selectedSavedHelper.experience_years} years` : "",
          monthlyRate: selectedSavedHelper.hourly_rate ? `R${selectedSavedHelper.hourly_rate}/hr` : "",
          verified: selectedSavedHelper.is_verified || false,
          avatar: selectedSavedHelper.avatar_url || "/placeholder.svg",
          skills: selectedSavedHelper.skills || [],
          bio: selectedSavedHelper.bio || "",
          languages: selectedSavedHelper.languages || [],
          availability: selectedSavedHelper.availability || "",
          introVideo: selectedSavedHelper.intro_video_url || "",
          availabilityStatus: selectedSavedHelper.availability_status || "available",
          availableFrom: selectedSavedHelper.available_from || null,
        } : null}
        isOpen={!!selectedSavedHelper}
        onClose={() => setSelectedSavedHelper(null)}
        onHired={fetchData}
      />
    </div>
  );
};

export default EmployerProfile;
