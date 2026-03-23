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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Star, Phone, ShieldCheck, Award, Edit3, Save, X, Camera,
  Video, MapPin, Briefcase, Clock, Globe, MessageCircle,
  Heart, ChevronRight, LogOut, Trash2, Bell, Lock, Mail,
  FileText, Calendar, DollarSign, Users, Shield
} from "lucide-react";
import ChangePhoneSheet from "@/components/ChangePhoneSheet";
import NotificationPreferences from "@/components/NotificationPreferences";

const startShuftiVerification = async (userId: string, helperId: string) => {
  const { data, error } = await supabase.functions.invoke("shufti-verify", {
    body: { user_id: userId, helper_id: helperId },
  });
  if (error) throw error;
  return data;
};

interface HelperData {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  category: string;
  bio: string | null;
  avatar_url: string | null;
  skills: string[] | null;
  languages: string[] | null;
  experience_years: number | null;
  hourly_rate: number | null;
  availability: string | null;
  availability_status: string;
  available_from: string | null;
  is_verified: boolean | null;
  intro_video_url: string | null;
  has_work_permit: boolean | null;
  age: number | null;
  gender: string | null;
  nationality: string | null;
  living_arrangement: string | null;
  verification_status?: string;
  verification_date?: string | null;
}

interface ReviewData {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  employer_id: string;
}

const HelperProfile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [helper, setHelper] = useState<HelperData | null>(null);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<HelperData>>({});
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("profile");
  const [showChangePhone, setShowChangePhone] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (user) fetchHelperData();
  }, [user]);

  const fetchHelperData = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("helpers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setHelper(data);
      setEditData(data);
    }

    const { data: reviewData } = await supabase
      .from("reviews")
      .select("*")
      .eq("helper_id", data?.id || "")
      .order("created_at", { ascending: false });

    if (reviewData) setReviews(reviewData);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!helper) {
      toast.error("No helper profile found");
      return;
    }
    try {
      const { error } = await supabase
        .from("helpers")
        .update({
          full_name: editData.full_name,
          bio: editData.bio,
          skills: editData.skills,
          languages: editData.languages,
          experience_years: editData.experience_years,
          hourly_rate: editData.hourly_rate,
          availability: editData.availability,
          has_work_permit: editData.has_work_permit,
        })
        .eq("id", helper.id);

      if (error) {
        console.error("Helper save error:", error);
        toast.error("Failed to update profile: " + error.message);
      } else {
        toast.success("Profile updated!");
        setIsEditing(false);
        fetchHelperData();
      }
    } catch (err: any) {
      console.error("Helper save exception:", err);
      toast.error("Failed to update: " + err.message);
    }
  };

  const [showAvailConfirm, setShowAvailConfirm] = useState(false);

  const toggleAvailability = async () => {
    if (!helper) return;
    const wasHired = helper.availability_status === "unavailable";
    const newStatus = helper.availability_status === "available" ? "unavailable" : "available";

    // If hired and switching to available, show confirmation first
    if (wasHired && newStatus === "available") {
      // Check if there's an active placement
      const { data: activePlacement } = await supabase
        .from("placements")
        .select("id")
        .eq("helper_id", helper.id)
        .eq("status", "active")
        .maybeSingle();

      if (activePlacement) {
        setShowAvailConfirm(true);
        return;
      }
    }

    await executeToggleAvailability(newStatus);
  };

  const executeToggleAvailability = async (newStatus: string) => {
    if (!helper) return;
    await supabase.from("helpers").update({ availability_status: newStatus }).eq("id", helper.id);
    setHelper({ ...helper, availability_status: newStatus });
    toast.success(`Status: ${newStatus === "available" ? "Available" : "Not Available"}`);

    // If switching to available and was hired, notify employer
    if (newStatus === "available" && helper.id) {
      const { data: activePlacement } = await supabase
        .from("placements")
        .select("employer_id, id")
        .eq("helper_id", helper.id)
        .eq("status", "active")
        .maybeSingle();

      if (activePlacement) {
        await supabase
          .from("placements")
          .update({ status: "completed", ended_at: new Date().toISOString() })
          .eq("id", activePlacement.id);

        await supabase.from("messages").insert({
          sender_id: user!.id,
          receiver_id: activePlacement.employer_id,
          helper_id: helper.id,
          content: `⚠️ ${helper.full_name} has changed their status back to Available and is no longer marked as hired.`,
        });

        supabase.functions.invoke("send-notification", {
          body: {
            user_id: activePlacement.employer_id,
            type: "hire_update",
            title: "Helper Status Changed",
            body: `${helper.full_name} has marked themselves as Available again.`,
          },
        }).catch(() => {});
      }
    }
    setShowAvailConfirm(false);
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !helper || !e.target.files?.[0]) return;
    const file = e.target.files[0];

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Video must be under 50MB");
      return;
    }

    setVideoUploading(true);
    try {
      const filePath = `${user.id}/${Date.now()}.mp4`;
      const { error: uploadError } = await supabase.storage
        .from("helper-videos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("helper-videos")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("helpers")
        .update({ intro_video_url: urlData.publicUrl, video_moderation_status: "pending" })
        .eq("id", helper.id);

      if (updateError) throw updateError;

      toast.success("Video updated! It will be reviewed shortly.");
      fetchHelperData();

      // Trigger video moderation
      supabase.functions.invoke("moderate-video", {
        body: { helper_id: helper.id, video_url: urlData.publicUrl },
      }).catch(console.error);
    } catch (err: any) {
      toast.error("Failed to upload video: " + (err.message || "Unknown error"));
    } finally {
      setVideoUploading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !helper || !e.target.files?.[0]) return;
    const file = e.target.files[0];

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
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("helpers")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", helper.id);

      if (updateError) throw updateError;

      toast.success("Profile photo updated!");
      fetchHelperData();
    } catch (err: any) {
      toast.error("Failed to upload photo: " + (err.message || "Unknown error"));
    } finally {
      setAvatarUploading(false);
    }
  };


  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully");
  };

  const handleVerifyClick = () => {
    if (!user || !helper) return;
    if (helper.verification_status === "pending_review") {
      toast.info("Your verification is already in progress. Please wait for the result.");
      return;
    }
    setShowVerifyDialog(true);
  };

  const handleConfirmVerification = async () => {
    setShowVerifyDialog(false);
    if (!user || !helper) return;
    setVerifyLoading(true);
    try {
      const data = await startShuftiVerification(user.id, helper.id);
      if (data?.verification_url) {
        window.open(data.verification_url, "_blank");
        toast.success("Verification started! Complete it in the new tab.");
        fetchHelperData();
      } else {
        toast.error("Could not start verification. Please try again.");
      }
    } catch (err: any) {
      toast.error("Verification failed: " + (err.message || "Unknown error"));
    } finally {
      setVerifyLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  if (!helper) {
    return (
      <div className="pb-28 space-y-4">
        {/* Incomplete Profile Alert */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700 rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
              <Shield size={24} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-bold text-foreground">Profile Incomplete</h2>
                <Badge variant="destructive" className="text-[10px] px-2 py-0.5 gap-1">
                  <X size={10} /> Incomplete
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Complete your helper profile to start applying for jobs and getting matched with employers.
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/register/helper")} className="w-full rounded-xl h-12 font-semibold gap-2">
            Complete Profile Now <ChevronRight size={16} />
          </Button>
        </div>

        {/* What you're missing */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-foreground">What you need to complete:</h3>
            <div className="space-y-2">
              {[
                { icon: <Briefcase size={14} />, label: "Skills & experience" },
                { icon: <Camera size={14} />, label: "Profile photo" },
                { icon: <Video size={14} />, label: "Intro video" },
                { icon: <Globe size={14} />, label: "Languages & availability" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  {item.label}
                </div>
              ))}
            </div>
          </CardContent>
      </Card>

        {/* Account Controls for incomplete profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
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
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-sm text-destructive"
            >
              <LogOut size={16} /> Log Out
            </button>
            <button
              onClick={async () => {
                if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
                await signOut();
                toast.success("Account deletion requested. We're sorry to see you go.");
                navigate("/auth");
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-destructive/10 transition-colors text-sm text-destructive"
            >
              <Trash2 size={16} /> Delete Account
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="pb-28 space-y-4">
      {/* Profile Header */}
      <Card variant="gradient" className="overflow-hidden">
        <div className="gradient-primary p-6 pb-8">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-primary-light border-2 border-primary-foreground/20">
                {helper.avatar_url ? (
                  <img src={helper.avatar_url} alt={helper.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-primary-foreground text-2xl font-bold">
                    {helper.full_name.charAt(0)}
                  </div>
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 bg-card text-foreground rounded-full p-1.5 shadow-soft cursor-pointer">
                {avatarUploading ? (
                  <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                ) : (
                  <Camera size={12} />
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleAvatarChange}
                  disabled={avatarUploading}
                />
              </label>
            </div>
            <div className="flex-1 text-primary-foreground">
              <h1 className="text-xl font-bold">{helper.full_name}</h1>
              <p className="text-primary-foreground/80 text-sm flex items-center gap-1">
                <MapPin size={14} /> {helper.category}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Star size={14} className="fill-current" />
                <span className="font-semibold">{avgRating}</span>
                <span className="text-primary-foreground/70 text-xs">({reviews.length} reviews)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="px-4 -mt-4">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary" className="gap-1 shadow-soft">
              <Phone size={12} /> Phone Verified
            </Badge>
            {reviews.length >= 5 && parseFloat(avgRating) >= 4.5 && (
              <Badge variant="secondary" className="gap-1 shadow-soft">
                <Award size={12} /> Highly Rated
              </Badge>
            )}
            {helper.is_verified && helper.bio && helper.skills && helper.skills.length > 0 && (
              <Badge variant="secondary" className="gap-1 shadow-soft">
                <ShieldCheck size={12} /> Profile Complete
              </Badge>
            )}
          </div>
        </div>

        {/* Identity Verification */}
        <div className="px-4 py-3">
          {helper.verification_status === "verified" ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl">
              <ShieldCheck size={18} className="text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">Identity Verified</p>
                <p className="text-xs text-green-700 dark:text-green-400">
                  Verified on {helper.verification_date ? new Date(helper.verification_date).toLocaleDateString() : "N/A"}
                </p>
              </div>
            </div>
          ) : helper.verification_status === "failed" ? (
            <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-destructive">Verification Failed</p>
                <p className="text-xs text-muted-foreground">Your verification was unsuccessful</p>
              </div>
            </div>
          ) : helper.verification_status === "pending_review" ? (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
              <Clock size={18} className="text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Verification In Progress</p>
                <p className="text-xs text-amber-700 dark:text-amber-400">Your identity is being reviewed. This may take some time.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-xl">
              <div>
                <p className="text-sm font-semibold text-foreground">Verify Your Identity</p>
                <p className="text-xs text-muted-foreground">Get the ID Verified badge</p>
              </div>
              <Button size="sm" onClick={handleVerifyClick} disabled={verifyLoading} className="gap-1.5">
                <ShieldCheck size={14} />
                {verifyLoading ? "Starting..." : "Verify Now"}
              </Button>
            </div>
          )}
        </div>

        {/* Availability Toggle */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${helper.availability_status === "available" ? "bg-green-500" : "bg-destructive"}`} />
            <span className="text-sm font-medium">
              {helper.availability_status === "available" ? "Available" : "Not Available"}
            </span>
          </div>
          <Switch
            checked={helper.availability_status === "available"}
            onCheckedChange={toggleAvailability}
          />
        </div>
      </Card>

      {/* Profile Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Profile Details</CardTitle>
          {isEditing ? (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}><X size={16} /></Button>
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
                <Label>Full Name</Label>
                <Input value={editData.full_name || ""} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>About Me</Label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editData.bio || ""}
                  onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                  placeholder="Tell employers about yourself..."
                />
              </div>
              <div className="space-y-2">
                <Label>Skills (comma-separated)</Label>
                <Input
                  value={(editData.skills || []).join(", ")}
                  onChange={(e) => setEditData({ ...editData, skills: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Languages (comma-separated)</Label>
                <Input
                  value={(editData.languages || []).join(", ")}
                  onChange={(e) => setEditData({ ...editData, languages: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Experience (years)</Label>
                  <Input type="number" value={editData.experience_years || ""} onChange={(e) => setEditData({ ...editData, experience_years: parseInt(e.target.value) || null })} />
                </div>
                <div className="space-y-2">
                  <Label>Expected Salary (R)</Label>
                  <Input type="number" value={editData.hourly_rate || ""} onChange={(e) => setEditData({ ...editData, hourly_rate: parseInt(e.target.value) || null })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Availability</Label>
                <Input value={editData.availability || ""} onChange={(e) => setEditData({ ...editData, availability: e.target.value })} placeholder="e.g. Full-time, Mon-Sat" />
              </div>
              <div className="flex items-center justify-between">
                <Label>Has Work Permit</Label>
                <Switch checked={editData.has_work_permit || false} onCheckedChange={(v) => setEditData({ ...editData, has_work_permit: v })} />
              </div>
              {/* Video Upload */}
              <div className="space-y-2">
                <Label>Intro Video</Label>
                {helper.intro_video_url && (
                  <video
                    src={helper.intro_video_url}
                    controls
                    className="w-full rounded-xl max-h-48 bg-black"
                  />
                )}
                <label className="flex items-center justify-center gap-2 w-full h-12 rounded-xl border-2 border-dashed border-primary/30 text-primary text-sm font-medium cursor-pointer hover:bg-primary/5 transition-colors">
                  <Video size={16} />
                  {videoUploading ? "Uploading..." : helper.intro_video_url ? "Replace Video" : "Upload Video"}
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/*"
                    className="hidden"
                    onChange={handleVideoChange}
                    disabled={videoUploading}
                  />
                </label>
                <p className="text-[10px] text-muted-foreground">Max 50MB. Video will be reviewed for compliance.</p>
              </div>
            </>
          ) : (
            <>
              {helper.bio && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">About Me</p>
                  <p className="text-sm">{helper.bio}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase size={14} /> <span>{helper.category}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock size={14} /> <span>{helper.experience_years ? `${helper.experience_years} yrs` : "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign size={14} /> <span>{helper.hourly_rate ? `R${helper.hourly_rate}` : "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar size={14} /> <span>{helper.availability || "N/A"}</span>
                </div>
              </div>
              {helper.skills && helper.skills.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {helper.skills.map((skill) => (
                      <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {helper.languages && helper.languages.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Languages</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Globe size={14} className="text-muted-foreground" />
                    {helper.languages.join(", ")}
                  </div>
                </div>
              )}
              {helper.intro_video_url && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Intro Video</p>
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Video size={14} /> Video uploaded
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Reviews Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star size={16} className="text-primary" /> Reviews ({reviews.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            <div className="space-y-3">
              {/* Rating Breakdown */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl font-bold">{avgRating}</span>
                <div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        className={s <= Math.round(parseFloat(avgRating)) ? "fill-primary text-primary" : "text-muted-foreground/30"}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{reviews.length} reviews</p>
                </div>
              </div>
              <Separator />
              {reviews.slice(0, 5).map((review) => (
                <div key={review.id} className="py-2">
                  <div className="flex items-center gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={10} className={s <= review.rating ? "fill-primary text-primary" : "text-muted-foreground/30"} />
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.comment && <p className="text-sm">{review.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <NotificationPreferences userRole="helper" />

      {/* Account Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
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
          <button onClick={() => navigate("/popia")} className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors">
            <span className="flex items-center gap-3 text-sm"><Shield size={16} className="text-muted-foreground" /> POPIA Compliance</span>
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
              await signOut();
              toast.success("Account deletion requested. We're sorry to see you go.");
              navigate("/auth");
            }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-destructive/10 transition-colors text-sm text-destructive"
          >
            <Trash2 size={16} /> Delete Account
          </button>
        </CardContent>
      </Card>

      {/* Change Phone Sheet */}
      <ChangePhoneSheet
        isOpen={showChangePhone}
        onClose={() => setShowChangePhone(false)}
        currentPhone={helper?.phone || ""}
        onChanged={() => fetchHelperData()}
      />

      {/* Availability Change Confirmation */}
      {showAvailConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setShowAvailConfirm(false)} />
          <div className="relative bg-card rounded-2xl shadow-float p-6 mx-6 max-w-sm w-full z-[71]">
            <h3 className="font-bold text-foreground text-base mb-2">Change Status to Available?</h3>
            <p className="text-sm text-muted-foreground mb-5">
              You are currently marked as hired. Changing to Available will end your current placement and notify your employer.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAvailConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => executeToggleAvailability("available")}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Identity Verification</AlertDialogTitle>
            <AlertDialogDescription>
              You will be redirected to our secure verification partner to confirm your identity. 
              Please have your ID document ready. This process can only be done once per profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmVerification}>
              Continue to Verification
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HelperProfile;
