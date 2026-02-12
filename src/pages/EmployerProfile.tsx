import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, ShieldCheck, Edit3, Save, X, ChevronRight,
  LogOut, Trash2, Bell, Lock, Mail, Users, CreditCard,
  Briefcase, Heart, Unlock, FileText, Star
} from "lucide-react";

interface EmployerData {
  id: string;
  user_id: string;
  email: string | null;
  location: string | null;
  type_of_need: string | null;
}

const EmployerProfile = () => {
  const { user, signOut } = useAuth();
  const [employer, setEmployer] = useState<EmployerData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<EmployerData>>({});
  const [loading, setLoading] = useState(true);
  const [unlockCount, setUnlockCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

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
      setEmployer(data);
      setEditData(data);
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
    setLoading(false);
  };

  const handleSave = async () => {
    if (!employer) return;
    const { error } = await supabase
      .from("employer_profiles")
      .update({
        location: editData.location,
        type_of_need: editData.type_of_need,
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
              {user?.email?.charAt(0).toUpperCase() || "E"}
            </div>
            <div className="text-primary-foreground">
              <h1 className="text-xl font-bold">{user?.email?.split("@")[0] || "Employer"}</h1>
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
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}><X size={16} /></Button>
              <Button size="sm" onClick={handleSave}><Save size={16} /> Save</Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Edit3 size={14} /> Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label>Location / Area</Label>
                <Input value={editData.location || ""} onChange={(e) => setEditData({ ...editData, location: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Type of Need</Label>
                <Input value={editData.type_of_need || ""} onChange={(e) => setEditData({ ...editData, type_of_need: e.target.value })} placeholder="e.g. Nanny, Housekeeper" />
              </div>
            </>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin size={14} /> <span>{employer?.location || "Not set"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase size={14} /> <span>{employer?.type_of_need || "Not set"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail size={14} /> <span>{employer?.email || user?.email || "Not set"}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 p-2">
          <button className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors">
            <span className="flex items-center gap-3 text-sm"><Unlock size={16} className="text-primary" /> Unlocked Profiles</span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">{unlockCount} <ChevronRight size={16} /></span>
          </button>
          <button className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors">
            <span className="flex items-center gap-3 text-sm"><Heart size={16} className="text-muted-foreground" /> Saved Helpers</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
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
          <button className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors">
            <span className="flex items-center gap-3 text-sm"><FileText size={16} className="text-muted-foreground" /> Invoices</span>
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
          <button className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors">
            <span className="flex items-center gap-3 text-sm"><Bell size={16} className="text-muted-foreground" /> Notifications</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
          <button className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted transition-colors">
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
          <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-destructive/10 transition-colors text-sm text-destructive">
            <Trash2 size={16} /> Delete Account
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployerProfile;
