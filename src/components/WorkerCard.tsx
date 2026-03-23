import { useState, useEffect } from "react";
import { Heart, Unlock, Lock } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { getPreviewName } from "@/lib/contactMasking";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type HelperStatus = "available" | "interviewing" | "hired_platform" | "hired_external" | "unavailable" | "suspended";

const statusConfig: Record<HelperStatus, { label: string; emoji: string; className: string }> = {
  available: { label: "Available", emoji: "🟢", className: "text-green-600" },
  interviewing: { label: "In Conversation", emoji: "🔵", className: "text-blue-600" },
  hired_platform: { label: "Hired", emoji: "🟡", className: "text-amber-600" },
  hired_external: { label: "Employed", emoji: "🟡", className: "text-amber-600" },
  unavailable: { label: "Unavailable", emoji: "🔴", className: "text-destructive" },
  suspended: { label: "Suspended", emoji: "⛔", className: "text-destructive" },
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
    <Card
      variant="interactive"
      className={`overflow-hidden ${isHired ? "opacity-60" : ""}`}
      onClick={onClick}
    >
      {/* Status banner for unlocked but non-available helpers */}
      {isUnlocked && (availabilityStatus === "hired_platform" || availabilityStatus === "hired_external" || availabilityStatus === "unavailable") && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 flex items-center gap-2">
          <span className="text-xs font-semibold text-destructive">
            {availabilityStatus === "unavailable" ? "Currently Unavailable" : "Currently Hired — Not Available"}
          </span>
        </div>
      )}

      <div className="p-5">
        {/* Top row: Photo + Name/Status */}
        <div className="flex gap-4 items-start">
          {/* Photo */}
          <div className="relative flex-shrink-0">
            <div className="w-28 h-28 rounded-2xl overflow-hidden bg-muted">
              <img
                src={avatar}
                alt={name}
                className={`w-full h-full object-cover ${!isUnlocked ? "blur-[3px] scale-110" : ""}`}
              />
              {!isUnlocked && (
                <div className="absolute inset-0 bg-foreground/10 rounded-2xl" />
              )}
            </div>
            {/* Save button */}
            <button
              onClick={toggleSave}
              className="absolute -top-2 -right-2 p-1.5 rounded-full bg-card shadow-sm border border-border"
            >
              <Heart
                size={14}
                className={isSaved ? "fill-destructive text-destructive" : "text-muted-foreground"}
              />
            </button>
          </div>

          {/* Name + Status */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground text-base truncate">{getPreviewName(name)}</h3>
              {isUnlocked && (
                <Badge variant="success" className="text-xs px-2.5 py-0.5 shrink-0">
                  Unlocked
                </Badge>
              )}
            </div>

            {/* Service type */}
            <p className="text-xs font-medium text-muted-foreground mt-0.5">
              {serviceType === "both" ? "🏠🌱 Domestic + Gardening" : isGardener ? "🌱 Gardener" : `🏠 ${role}`}
            </p>

            <span className={`text-xs font-medium ${status.className} mt-1 block`}>
              {status.emoji} {status.label}
            </span>

            {verified && (
              <span className="text-xs text-primary font-medium block mt-0.5">
                ✅ ID Verified
              </span>
            )}

            <span className="text-xs text-primary font-medium block mt-0.5">
              📱 Phone Verified
            </span>

            <p className="text-sm font-semibold text-foreground mt-1">
              ⭐ {expYears > 0 ? `${expYears} Year${expYears !== 1 ? "s" : ""}` : "New"} Experience
            </p>
          </div>
        </div>

        {/* Service highlights for gardeners */}
        {isGardener && skillsGardening.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {skillsGardening.slice(0, 3).map((skill) => (
              <span key={skill} className="text-xs text-foreground">✔ {skill}</span>
            ))}
          </div>
        )}

        {/* Gardener tools badge */}
        {isGardener && (
          <div className="mt-2 flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{hasTools ? "🧰 Own Tools" : "🧰 No Tools"}</span>
            <span className="text-xs text-muted-foreground">📍 Works in your area</span>
          </div>
        )}

        {/* Activity row */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
          <span className="text-xs text-green-600 font-medium">
            🟢 Active this week
          </span>
          <span className="text-xs text-primary font-medium">
            ⚡ Responds quickly
          </span>
        </div>

        {/* View Profile Button */}
        <Button
          size="default"
          variant={isUnlocked ? "outline" : "default"}
          className="w-full mt-4 rounded-xl"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
        >
          View Profile
        </Button>
      </div>
    </Card>
  );
};

export default WorkerCard;
