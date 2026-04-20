import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Switch } from "./ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Prefs {
  messages: boolean;
  profile_unlocks: boolean;
  hire_updates: boolean;
  credits: boolean;
  interviews: boolean;
}

const defaultPrefs: Prefs = {
  messages: true,
  profile_unlocks: true,
  hire_updates: true,
  credits: true,
  interviews: true,
};

const labels: Record<keyof Prefs, string> = {
  messages: "New Messages",
  profile_unlocks: "Profile Unlocked",
  hire_updates: "Hire Updates",
  credits: "Credit Alerts",
  interviews: "New Applications",
};

const helperHiddenKeys: (keyof Prefs)[] = ["credits", "profile_unlocks", "interviews"];

interface NotificationPreferencesProps {
  userRole?: string;
}

const NotificationPreferences = ({ userRole }: NotificationPreferencesProps) => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [hasExistingRow, setHasExistingRow] = useState(false);
  const [savingKey, setSavingKey] = useState<keyof Prefs | null>(null);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          toast.error("Failed to load preferences");
          return;
        }

        if (data) {
          setHasExistingRow(true);
          setPrefs({
            messages: data.messages,
            profile_unlocks: data.profile_unlocks,
            hire_updates: data.hire_updates,
            credits: data.credits,
            interviews: data.interviews,
          });
        } else {
          setHasExistingRow(false);
          setPrefs(defaultPrefs);
        }
      });
  }, [user]);

  const togglePref = async (key: keyof Prefs) => {
    if (!user || savingKey) return;

    const previousPrefs = prefs;
    const nextPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(nextPrefs);
    setSavingKey(key);

    const query = hasExistingRow
      ? supabase.from("notification_preferences").update(nextPrefs).eq("user_id", user.id)
      : supabase.from("notification_preferences").insert({ user_id: user.id, ...nextPrefs });

    const { error } = await query;

    if (error) {
      setPrefs(previousPrefs);
      toast.error("Failed to update preferences");
    } else if (!hasExistingRow) {
      setHasExistingRow(true);
    }

    setSavingKey(null);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell size={16} className="text-primary" /> Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(Object.keys(labels) as (keyof Prefs)[])
          .filter((key) => !(userRole === "helper" && helperHiddenKeys.includes(key)))
          .map((key) => (
            <div key={key} className="flex items-center justify-between px-1 py-1.5">
              <span className="text-sm text-foreground">{labels[key]}</span>
              <Switch checked={prefs[key]} disabled={savingKey !== null} onCheckedChange={() => togglePref(key)} />
            </div>
          ))}
      </CardContent>
    </Card>
  );
};

export default NotificationPreferences;
