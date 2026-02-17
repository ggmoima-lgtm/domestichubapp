import { Phone, CreditCard, ShieldCheck, CheckCircle, Star, Heart, Repeat, Clock, Zap } from "lucide-react";
import { Badge } from "./ui/badge";

const badgeIcons: Record<string, React.ReactNode> = {
  phone: <Phone size={10} />,
  "id-card": <CreditCard size={10} />,
  "shield-check": <ShieldCheck size={10} />,
  "check-circle": <CheckCircle size={10} />,
  star: <Star size={10} />,
  heart: <Heart size={10} />,
  repeat: <Repeat size={10} />,
  clock: <Clock size={10} />,
  zap: <Zap size={10} />,
};

const categoryColors: Record<string, string> = {
  trust: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  performance: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  activity: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800",
};

interface BadgeData {
  key: string;
  name: string;
  icon: string | null;
  category: string;
}

interface BadgeDisplayProps {
  badges: BadgeData[];
  compact?: boolean;
  maxDisplay?: number;
}

const BadgeDisplay = ({ badges, compact = false, maxDisplay = 5 }: BadgeDisplayProps) => {
  if (badges.length === 0) return null;
  
  const displayed = badges.slice(0, maxDisplay);
  const remaining = badges.length - maxDisplay;

  return (
    <div className="flex flex-wrap gap-1">
      {displayed.map((badge) => (
        <Badge
          key={badge.key}
          variant="outline"
          className={`text-[10px] gap-0.5 ${categoryColors[badge.category] || ""}`}
        >
          {badge.icon && badgeIcons[badge.icon]}
          {!compact && badge.name}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="outline" className="text-[10px]">
          +{remaining}
        </Badge>
      )}
    </div>
  );
};

export default BadgeDisplay;
