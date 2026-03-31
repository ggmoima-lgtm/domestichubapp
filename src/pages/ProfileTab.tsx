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
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-primary gap-4 rounded-2xl mx-2">
        <img src="/lovable-uploads/domestic-hub-logo.jpg" alt="Domestic Hub" className="w-24 h-24 object-contain rounded-2xl shadow-lg animate-[heartbeat_1.2s_ease-in-out_infinite]" />
        <p className="text-primary-foreground/80 text-xs font-medium">Loading profile...</p>
      </div>
    );
  }

  return role === "helper" ? <HelperProfile /> : <EmployerProfile />;
};

export default ProfileTab;
