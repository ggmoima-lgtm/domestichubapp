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
const helperHiddenKeys: (keyof Prefs)[] = ["credits", "profile_unlocks"];

interface NotificationPreferencesProps {
  userRole?: string;
}

const NotificationPreferences = () => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [pushEnabled, setPushEnabled] = useState(false);

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

      // Check push permission
      if ("Notification" in window) {
        setPushEnabled(Notification.permission === "granted");
      }
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

  const enablePush = async () => {
    if (!("Notification" in window)) {
      toast.error("Push notifications not supported on this device");
      return;
    }
    const permission = await Notification.requestPermission();
    setPushEnabled(permission === "granted");
    if (permission === "granted") {
      toast.success("Push notifications enabled!");
    } else {
      toast.error("Push notification permission denied");
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
        {/* Push toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
          <div className="flex items-center gap-2">
            {pushEnabled ? <Bell size={16} className="text-primary" /> : <BellOff size={16} className="text-muted-foreground" />}
            <div>
              <p className="text-sm font-semibold text-foreground">Push Notifications</p>
              <p className="text-[10px] text-muted-foreground">
                {pushEnabled ? "Enabled" : "Tap to enable"}
              </p>
            </div>
          </div>
          {!pushEnabled ? (
            <Button size="sm" variant="outline" onClick={enablePush}>Enable</Button>
          ) : (
            <span className="text-xs text-primary font-semibold">Active</span>
          )}
        </div>

        {/* Per-category toggles */}
        {(Object.keys(labels) as (keyof Prefs)[]).map((key) => (
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
