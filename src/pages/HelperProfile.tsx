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
  Star, Phone, ShieldCheck, Award, Edit3, Save, X, Camera,
  Video, MapPin, Briefcase, Clock, Globe, MessageCircle,
  Heart, ChevronRight, LogOut, Trash2, Bell, Lock, Mail,
  FileText, Calendar, DollarSign, Users
} from "lucide-react";

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
    if (!helper) return;
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
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated!");
      setIsEditing(false);
      fetchHelperData();
    }
  };

  const toggleAvailability = async () => {
    if (!helper) return;
    const newStatus = helper.availability_status === "available" ? "unavailable" : "available";
    await supabase.from("helpers").update({ availability_status: newStatus }).eq("id", helper.id);
    setHelper({ ...helper, availability_status: newStatus });
    toast.success(`Status: ${newStatus === "available" ? "Available" : "Not Available"}`);
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

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

  if (!helper) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground mb-4">No helper profile found. Register as a helper first.</p>
        <Button onClick={() => window.location.href = "/register/helper"}>Register as Helper</Button>
      </div>
    );
  }

  return (
    <div className="pb-8 space-y-4">
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
              <button className="absolute -bottom-1 -right-1 bg-card text-foreground rounded-full p-1.5 shadow-soft">
                <Camera size={12} />
              </button>
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
            {helper.bio && helper.skills && helper.skills.length > 0 && (
              <Badge variant="secondary" className="gap-1 shadow-soft">
                <ShieldCheck size={12} /> Profile Complete
              </Badge>
            )}
          </div>
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

      {/* Account Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 p-2">
          <button className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors">
            <span className="flex items-center gap-3 text-sm"><Bell size={16} className="text-muted-foreground" /> Notifications</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
          <button onClick={() => navigate("/privacy")} className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors">
            <span className="flex items-center gap-3 text-sm"><Lock size={16} className="text-muted-foreground" /> Privacy Settings</span>
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
          <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-destructive/10 transition-colors text-sm text-destructive">
            <Trash2 size={16} /> Delete Account
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default HelperProfile;
