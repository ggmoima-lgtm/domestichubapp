import { Star, MapPin, Clock, CheckCircle } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

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
  onClick?: () => void;
}

const WorkerCard = ({
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
  onClick,
}: WorkerCardProps) => {
  const isHired = availabilityStatus === "hired_platform" || availabilityStatus === "hired_external" || availabilityStatus === "unavailable" || availabilityStatus === "suspended";
  const status = statusConfig[availabilityStatus];

  return (
    <Card
      variant="interactive"
      className={`overflow-hidden ${isHired ? "opacity-60" : ""}`}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex gap-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-primary-light">
              <img src={avatar} alt={name} className="w-full h-full object-cover" />
            </div>
            {verified && (
              <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                <CheckCircle size={14} />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-foreground truncate">{name}</h3>
                <p className="text-sm text-muted-foreground">{role}</p>
              </div>
              {availabilityStatus !== "available" && (
                <Badge variant="outline" className={`text-[10px] shrink-0 ${status.className}`}>
                  {status.emoji} {status.label}
                </Badge>
              )}
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
      </div>
    </Card>
  );
};

export default WorkerCard;
