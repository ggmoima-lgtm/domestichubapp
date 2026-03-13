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
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const metadataRole = user.user_metadata?.role;
      const fallbackRole = metadataRole === "helper" || metadataRole === "employer" ? metadataRole : "employer";
      setRole(data?.role || fallbackRole);
      setLoading(false);
    };

    fetchRole();
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
