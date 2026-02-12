import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import HelperProfile from "./HelperProfile";
import EmployerProfile from "./EmployerProfile";

const ProfileTab = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          setRole(data?.role || "employer");
          setLoading(false);
        });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return role === "helper" ? <HelperProfile /> : <EmployerProfile />;
};

export default ProfileTab;
