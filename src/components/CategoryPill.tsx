import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface CategoryPillProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const CategoryPill = ({ icon: Icon, label, active, onClick }: CategoryPillProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap text-sm font-semibold transition-all duration-300",
        active
          ? "gradient-primary text-primary-foreground shadow-button"
          : "bg-card border border-border text-foreground hover:border-primary hover:text-primary shadow-soft"
      )}
    >
      <Icon size={16} />
      {label}
    </button>
  );
};

export default CategoryPill;
