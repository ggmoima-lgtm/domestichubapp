import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Briefcase, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Stat {
  icon: React.ReactNode;
  label: string;
  value: number;
}

const PlatformStatsTicker = () => {
  const [stats, setStats] = useState<Stat[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const [appsRes, placementsRes, jobsRes] = await Promise.all([
        supabase.from("job_applications").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
        supabase.from("placements").select("id", { count: "exact", head: true }).gte("hired_at", todayISO),
        supabase.from("job_posts").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
      ]);

      setStats([
        { icon: <Users size={14} className="text-primary" />, label: "applied today", value: appsRes.count ?? 0 },
        { icon: <CheckCircle size={14} className="text-primary" />, label: "recruited today", value: placementsRes.count ?? 0 },
        { icon: <Briefcase size={14} className="text-primary" />, label: "jobs listed today", value: jobsRes.count ?? 0 },
      ]);
    };

    fetchStats();
  }, []);

  useEffect(() => {
    if (stats.length === 0) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % stats.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [stats]);

  if (stats.length === 0) return null;

  return (
    <div className="h-8 overflow-hidden relative rounded-xl bg-primary/10 px-3 flex items-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -80, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="flex items-center gap-2 text-sm"
        >
          {stats[activeIndex].icon}
          <span>
            <span className="font-bold text-primary">{stats[activeIndex].value}</span>{" "}
            <span className="text-foreground font-medium">{stats[activeIndex].label}</span>
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default PlatformStatsTicker;
