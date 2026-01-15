import { Search, MapPin, SlidersHorizontal } from "lucide-react";
import { Button } from "./ui/button";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFilter?: () => void;
}

const SearchBar = ({ value, onChange, onFilter }: SearchBarProps) => {
  return (
    <div className="flex gap-3 items-center">
      <div className="flex-1 relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder="Search for helpers..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-12 pl-11 pr-4 rounded-2xl bg-card border border-border shadow-soft text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
      </div>
      <Button
        variant="soft"
        size="icon"
        className="h-12 w-12 shrink-0"
        onClick={onFilter}
      >
        <SlidersHorizontal size={18} />
      </Button>
    </div>
  );
};

export default SearchBar;
