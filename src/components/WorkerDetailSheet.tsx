import { Star, MapPin, Clock, CheckCircle, Phone, MessageCircle, Calendar, Award, X } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface WorkerDetailSheetProps {
  worker: {
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
    bio?: string;
    languages?: string[];
    availability?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

const WorkerDetailSheet = ({ worker, isOpen, onClose }: WorkerDetailSheetProps) => {
  if (!worker || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-float animate-slide-up max-h-[85vh] overflow-y-auto">
        {/* Handle */}
        <div className="sticky top-0 bg-card pt-3 pb-2 flex justify-center z-10">
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="px-5 pb-8">
          {/* Header */}
          <div className="flex items-start gap-4 mb-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-primary-light">
                <img
                  src={worker.avatar}
                  alt={worker.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {worker.verified && (
                <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1">
                  <CheckCircle size={14} />
                </div>
              )}
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{worker.name}</h2>
              <p className="text-muted-foreground">{worker.role}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-amber-400 fill-amber-400" />
                  <span className="font-bold">{worker.rating}</span>
                  <span className="text-sm text-muted-foreground">({worker.reviews} reviews)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-primary-light rounded-2xl p-3 text-center">
              <p className="text-lg font-bold text-primary">{worker.hourlyRate}</p>
              <p className="text-xs text-muted-foreground">per hour</p>
            </div>
            <div className="bg-secondary rounded-2xl p-3 text-center">
              <p className="text-lg font-bold text-secondary-foreground">{worker.experience}</p>
              <p className="text-xs text-muted-foreground">experience</p>
            </div>
            <div className="bg-accent rounded-2xl p-3 text-center">
              <div className="flex justify-center">
                <MapPin size={18} className="text-accent-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{worker.location}</p>
            </div>
          </div>

          {/* Bio */}
          <div className="mb-5">
            <h3 className="font-bold text-foreground mb-2">About</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {worker.bio || "Dedicated and experienced domestic helper with a passion for providing excellent care. I take pride in my work and always ensure the highest standards of cleanliness and organization."}
            </p>
          </div>

          {/* Skills */}
          <div className="mb-5">
            <h3 className="font-bold text-foreground mb-2">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {worker.skills.map((skill) => (
                <Badge key={skill} variant="soft">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div className="mb-6">
            <h3 className="font-bold text-foreground mb-2">Availability</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar size={14} />
              <span>{worker.availability || "Available Mon-Sat, Full-time or Part-time"}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" size="lg" className="flex-1">
              <Phone size={18} />
              Call
            </Button>
            <Button size="lg" className="flex-1">
              <MessageCircle size={18} />
              Message
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerDetailSheet;
