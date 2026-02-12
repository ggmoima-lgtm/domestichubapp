import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "./ui/button";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFilter?: () => void;
  filterCount?: number;
}

const SearchBar = ({ value, onChange, onFilter, filterCount = 0 }: SearchBarProps) => {
  return (
    <div className="flex gap-3 items-center">
      <div className="flex-1 relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder="Search by name, role, or skill..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-12 pl-11 pr-4 rounded-2xl bg-card border border-border shadow-soft text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
      </div>
      <Button
        variant="soft"
        size="icon"
        className="h-12 w-12 shrink-0 relative"
        onClick={onFilter}
      >
        <SlidersHorizontal size={18} />
        {filterCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            {filterCount}
          </span>
        )}
      </Button>
    </div>
  );
};

export default SearchBar;
