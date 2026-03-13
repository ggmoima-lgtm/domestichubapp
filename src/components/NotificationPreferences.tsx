import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Prefs {
  messages: boolean;
  interviews: boolean;
  profile_unlocks: boolean;
  hire_updates: boolean;
  reviews: boolean;
  credits: boolean;
  admin_actions: boolean;
}

const defaultPrefs: Prefs = {
  messages: true,
  interviews: true,
  profile_unlocks: true,
  hire_updates: true,
  reviews: true,
  credits: true,
  admin_actions: true,
};

const labels: Record<keyof Prefs, string> = {
  messages: "New Messages",
  interviews: "Interview Requests",
  profile_unlocks: "Profile Unlocked",
  hire_updates: "Hire Updates",
  reviews: "Review Requests",
  credits: "Credit Alerts",
  admin_actions: "Admin Actions",
};

// Keys to hide for helpers (credits are employer-only)
const helperHiddenKeys: (keyof Prefs)[] = ["credits", "profile_unlocks", "admin_actions"];

interface NotificationPreferencesProps {
  userRole?: string;
}

const NotificationPreferences = ({ userRole }: NotificationPreferencesProps) => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  useEffect(() => {
    if (user) {
      supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setPrefs({
              messages: data.messages,
              interviews: data.interviews,
              profile_unlocks: data.profile_unlocks,
              hire_updates: data.hire_updates,
              reviews: data.reviews,
              credits: data.credits,
              admin_actions: data.admin_actions,
            });
          }
        });
    }
  }, [user]);

  const togglePref = async (key: keyof Prefs) => {
    if (!user) return;
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);

    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.id, ...newPrefs }, { onConflict: "user_id" });

    if (error) {
      toast.error("Failed to update preferences");
      setPrefs(prefs);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell size={16} className="text-primary" /> Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Per-category toggles */}
        {(Object.keys(labels) as (keyof Prefs)[])
          .filter((key) => !(userRole === "helper" && helperHiddenKeys.includes(key)))
          .map((key) => (
          <div key={key} className="flex items-center justify-between px-1 py-1.5">
            <span className="text-sm text-foreground">{labels[key]}</span>
            <Switch checked={prefs[key]} onCheckedChange={() => togglePref(key)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default NotificationPreferences;
