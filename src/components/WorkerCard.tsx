import { Star, MapPin, Clock, CheckCircle } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

interface WorkerCardProps {
  id: string;
  name: string;
  role: string;
  location: string;
  rating: number;
  reviews: number;
  experience: string;
  hourlyRate: string;
  verified: boolean;
  avatar: string;
  skills: string[];
  onClick?: () => void;
}

const WorkerCard = ({
  name,
  role,
  location,
  rating,
  reviews,
  experience,
  hourlyRate,
  verified,
  avatar,
  skills,
  onClick,
}: WorkerCardProps) => {
  return (
    <Card
      variant="interactive"
      className="overflow-hidden"
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-primary-light">
              <img
                src={avatar}
                alt={name}
                className="w-full h-full object-cover"
              />
            </div>
            {verified && (
              <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                <CheckCircle size={14} />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-foreground truncate">{name}</h3>
                <p className="text-sm text-muted-foreground">{role}</p>
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

        {/* Skills */}
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
