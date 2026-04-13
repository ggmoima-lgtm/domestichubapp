import { useState, useEffect } from "react";
import { Heart, MapPin, Star, ShieldCheck, Phone, ChevronRight, Clock } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { getPreviewName } from "@/lib/contactMasking";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type HelperStatus = "available" | "interviewing" | "hired_platform" | "hired_external" | "unavailable" | "suspended";

const statusConfig: Record<HelperStatus, { label: string; badgeClass: string; dotClass: string }> = {
  available: { label: "Open for Work", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200", dotClass: "bg-emerald-500" },
  interviewing: { label: "In Conversation", badgeClass: "bg-blue-50 text-blue-700 border-blue-200", dotClass: "bg-blue-500" },
  hired_platform: { label: "Currently Hired", badgeClass: "bg-amber-50 text-amber-700 border-amber-200", dotClass: "bg-amber-500" },
  hired_external: { label: "Currently Employed", badgeClass: "bg-amber-50 text-amber-700 border-amber-200", dotClass: "bg-amber-500" },
  unavailable: { label: "Unavailable", badgeClass: "bg-red-50 text-red-700 border-red-200", dotClass: "bg-red-500" },
  suspended: { label: "Suspended", badgeClass: "bg-red-50 text-red-700 border-red-200", dotClass: "bg-red-500" },
};

interface WorkerCardProps {
  id: string;
  name: string;
  role: string;
  location: string;
  rating: number;
  reviews: number;
  experience: string;
  monthlyRate: string;
  verified: boolean;
  avatar: string;
  skills: string[];
  availabilityStatus?: HelperStatus;
  isUnlocked?: boolean;
  onClick?: () => void;
  serviceType?: string;
  hasTools?: boolean;
  skillsDomestic?: string[];
  skillsGardening?: string[];
}

const WorkerCard = ({
  id,
  name,
  role,
  location,
  rating,
  reviews,
  experience,
  monthlyRate,
  verified,
  avatar,
  skills,
  availabilityStatus = "available",
  isUnlocked = false,
  onClick,
  serviceType = "domestic",
  hasTools = false,
  skillsDomestic = [],
  skillsGardening = [],
}: WorkerCardProps) => {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const isHired = availabilityStatus === "hired_platform" || availabilityStatus === "hired_external" || availabilityStatus === "unavailable" || availabilityStatus === "suspended";
  const status = statusConfig[availabilityStatus];
  const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const expYears = parseInt(experience) || 0;
  const isGardener = serviceType === "gardening" || serviceType === "both" || role.toLowerCase().includes("gardener");
  const displayRole = serviceType === "both" ? "Domestic + Gardening" : isGardener ? "Gardener" : role;

  useEffect(() => {
    if (!user) return;
    if (isValidUuid) {
      supabase
        .from("saved_helpers")
        .select("id")
        .eq("employer_id", user.id)
        .eq("helper_id", id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setIsSaved(true);
        });
    } else {
      const saved = JSON.parse(localStorage.getItem("saved_helpers") || "[]");
      setIsSaved(saved.includes(id));
    }
  }, [user, id, isValidUuid]);

  const toggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Please log in to save helpers");
      return;
    }

    if (isValidUuid) {
      if (isSaved) {
        await supabase.from("saved_helpers").delete().eq("employer_id", user.id).eq("helper_id", id);
        setIsSaved(false);
        toast.success("Removed from saved");
      } else {
        const { error } = await supabase.from("saved_helpers").insert({ employer_id: user.id, helper_id: id });
        if (error) {
          toast.error("Failed to save");
        } else {
          setIsSaved(true);
          toast.success("Helper saved!");
        }
      }
    } else {
      const saved = JSON.parse(localStorage.getItem("saved_helpers") || "[]");
      if (isSaved) {
        localStorage.setItem("saved_helpers", JSON.stringify(saved.filter((s: string) => s !== id)));
        setIsSaved(false);
        toast.success("Removed from saved");
      } else {
        saved.push(id);
        localStorage.setItem("saved_helpers", JSON.stringify(saved));
        setIsSaved(true);
        toast.success("Helper saved!");
      }
    }
  };

  return (
    <div
      className={`group relative bg-card rounded-2xl border border-border/60 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer ${isHired ? "opacity-60" : ""}`}
      onClick={onClick}
    >
      {/* Unavailable banner */}
      {isUnlocked && isHired && (
        <div className="px-4 py-2 bg-destructive/5 border-b border-destructive/10">
          <span className="text-[11px] font-medium text-destructive">
            {availabilityStatus === "unavailable" ? "Currently Unavailable" : "Currently Hired — Not Available"}
          </span>
        </div>
      )}

      <div className="p-4">
        {/* Top section: Avatar + Core info */}
        <div className="flex gap-3.5">
          {/* Avatar with save button */}
          <div className="relative flex-shrink-0">
            <div className="w-[88px] h-[88px] rounded-xl overflow-hidden bg-muted">
              <img
                src={avatar}
                alt={name}
                className={`w-full h-full object-cover ${!isUnlocked ? "blur-[3px] scale-110" : ""}`}
              />
              {!isUnlocked && (
                <div className="absolute inset-0 bg-foreground/5 rounded-xl" />
              )}
            </div>
            <button
              onClick={toggleSave}
              className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-card shadow-md border border-border/50 flex items-center justify-center hover:scale-110 transition-transform"
            >
              <Heart
                size={13}
                className={isSaved ? "fill-destructive text-destructive" : "text-muted-foreground"}
              />
            </button>
          </div>

          {/* Info column */}
          <div className="flex-1 min-w-0">
            {/* Name + Unlocked badge */}
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-foreground text-[15px] leading-tight truncate">
                {getPreviewName(name)}
              </h3>
              {isUnlocked && (
                <Badge variant="success" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                  Unlocked
                </Badge>
              )}
            </div>

            {/* Role + Experience */}
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">
              {displayRole} · {expYears > 0 ? `${expYears}yr${expYears !== 1 ? "s" : ""} exp` : "New"}
            </p>

            {/* Location */}
            {location && (
              <div className="flex items-center gap-1 mt-1">
                <MapPin size={11} className="text-muted-foreground shrink-0" />
                <span className="text-[11px] text-muted-foreground truncate">{location}</span>
              </div>
            )}

            {/* Rating */}
            {rating > 0 && (
              <div className="flex items-center gap-1 mt-1.5">
                <Star size={13} className="text-amber-400 fill-amber-400" />
                <span className="text-xs font-semibold text-foreground">
                  {rating.toFixed(1)}
                </span>
                {reviews > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    ({reviews} review{reviews !== 1 ? "s" : ""})
                  </span>
                )}
              </div>
            )}

            {/* Availability badge */}
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${status.badgeClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                {status.label}
              </span>
            </div>
          </div>
        </div>

        {/* Verification & Experience row */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/40">
          {verified && (
            <div className="flex items-center gap-1">
              <ShieldCheck size={13} className="text-primary" />
              <span className="text-[11px] font-medium text-primary">ID Verified</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Phone size={11} className="text-primary" />
            <span className="text-[11px] font-medium text-primary">Phone Verified</span>
          </div>
        </div>

        {/* Gardener skills */}
        {isGardener && skillsGardening.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {skillsGardening.slice(0, 3).map((skill) => (
              <span key={skill} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/40">
                {skill}
              </span>
            ))}
            {hasTools && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/40">
                Own Tools
              </span>
            )}
          </div>
        )}

        {/* Trust indicators */}
        <div className="flex items-center gap-3 mt-2.5">
          <div className="flex items-center gap-1">
            <Clock size={11} className="text-emerald-500" />
            <span className="text-[10px] text-muted-foreground font-medium">Active this week</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">Responds fast</span>
        </div>

        {/* CTA */}
        <Button
          size="default"
          className="w-full mt-3.5 rounded-xl h-10 font-semibold text-sm group/btn"
          variant={isUnlocked ? "outline" : "default"}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
        >
          View Profile
          <ChevronRight size={16} className="ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
        </Button>
      </div>
    </div>
  );
};

export default WorkerCard;
