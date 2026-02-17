import { useState, useEffect } from "react";
import { Star, MapPin, Clock, Heart, Unlock, Eye, Lock } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { getPreviewName } from "@/lib/contactMasking";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import StatusFrame from "./StatusFrame";

type HelperStatus = "available" | "interviewing" | "hired_platform" | "hired_external" | "unavailable" | "suspended";

const statusConfig: Record<HelperStatus, { label: string; emoji: string; className: string }> = {
  available: { label: "Available", emoji: "🟢", className: "border-green-300 text-green-600" },
  interviewing: { label: "Interviewing", emoji: "🔵", className: "border-blue-300 text-blue-600" },
  hired_platform: { label: "Hired", emoji: "🟡", className: "border-amber-300 text-amber-600" },
  hired_external: { label: "Employed", emoji: "🟡", className: "border-amber-300 text-amber-600" },
  unavailable: { label: "Unavailable", emoji: "🔴", className: "border-destructive/30 text-destructive" },
  suspended: { label: "Suspended", emoji: "⛔", className: "border-destructive/30 text-destructive" },
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
}: WorkerCardProps) => {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const isHired = availabilityStatus === "hired_platform" || availabilityStatus === "hired_external" || availabilityStatus === "unavailable" || availabilityStatus === "suspended";
  const status = statusConfig[availabilityStatus];
  const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

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
          <Lock size={12} className="text-destructive" />
          <span className="text-xs font-semibold text-destructive">
            {availabilityStatus === "unavailable" ? "Currently Unavailable" : "Currently Hired — Not Available"}
          </span>
        </div>
      )}
      <div className="p-4">
        <div className="flex gap-3">
          <StatusFrame status={availabilityStatus} size="sm">
            <div className="w-16 h-16 bg-primary-light relative overflow-hidden">
              <img
                src={avatar}
                alt={name}
                className={`w-full h-full object-cover ${!isUnlocked ? "blur-[3px] scale-110" : ""}`}
              />
              {!isUnlocked && (
                <div className="absolute inset-0 bg-foreground/10" />
              )}
            </div>
          </StatusFrame>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground truncate">{getPreviewName(name)}</h3>
                <p className="text-sm text-muted-foreground">{role}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                 {isUnlocked && (
                   <Badge variant="success" className="text-[10px]">
                     <Unlock size={10} className="mr-0.5" />
                     Unlocked
                   </Badge>
                 )}
                 {availabilityStatus !== "available" && (
                   <Badge variant="outline" className={`text-[10px] ${status.className}`}>
                     {status.emoji} {status.label}
                   </Badge>
                 )}
                 <button
                   onClick={toggleSave}
                   className="p-1.5 rounded-full hover:bg-muted transition-colors"
                 >
                   <Heart
                     size={18}
                     className={isSaved ? "fill-destructive text-destructive" : "text-muted-foreground"}
                   />
                 </button>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star size={12} className="text-amber-400 fill-amber-400" />
                <span className="font-semibold text-foreground">{rating}</span>
                <span>({reviews})</span>
              </span>
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {location}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {experience}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {skills.slice(0, 3).map((skill) => (
            <Badge key={skill} variant="soft" className="text-[10px]">
              {skill}
            </Badge>
          ))}
          {skills.length > 3 && (
            <Badge variant="outline" className="text-[10px]">
              +{skills.length - 3}
            </Badge>
          )}
        </div>

        {/* View Full Profile Button */}
        <Button
          size="sm"
          variant={isUnlocked ? "outline" : "default"}
          className="w-full mt-3 rounded-xl gap-1.5"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
        >
          <Eye size={14} />
          {isUnlocked ? "View Full Profile" : "View Full Profile"}
        </Button>
      </div>
    </Card>
  );
};

export default WorkerCard;
