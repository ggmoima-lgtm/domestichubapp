import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CountryCode {
  code: string;
  dial: string;
  flag: string;
}

const countryCodes: CountryCode[] = [
  { code: "ZA", dial: "+27", flag: "🇿🇦" },
  { code: "ZW", dial: "+263", flag: "🇿🇼" },
  { code: "MZ", dial: "+258", flag: "🇲🇿" },
  { code: "MW", dial: "+265", flag: "🇲🇼" },
  { code: "LS", dial: "+266", flag: "🇱🇸" },
  { code: "SZ", dial: "+268", flag: "🇸🇿" },
  { code: "BW", dial: "+267", flag: "🇧🇼" },
  { code: "NA", dial: "+264", flag: "🇳🇦" },
  { code: "NG", dial: "+234", flag: "🇳🇬" },
  { code: "GH", dial: "+233", flag: "🇬🇭" },
  { code: "KE", dial: "+254", flag: "🇰🇪" },
  { code: "TZ", dial: "+255", flag: "🇹🇿" },
  { code: "UG", dial: "+256", flag: "🇺🇬" },
  { code: "ET", dial: "+251", flag: "🇪🇹" },
  { code: "EG", dial: "+20", flag: "🇪🇬" },
  { code: "MA", dial: "+212", flag: "🇲🇦" },
  { code: "CD", dial: "+243", flag: "🇨🇩" },
  { code: "CM", dial: "+237", flag: "🇨🇲" },
  { code: "SN", dial: "+221", flag: "🇸🇳" },
  { code: "CI", dial: "+225", flag: "🇨🇮" },
  { code: "US", dial: "+1", flag: "🇺🇸" },
  { code: "CA", dial: "+1", flag: "🇨🇦" },
  { code: "GB", dial: "+44", flag: "🇬🇧" },
  { code: "DE", dial: "+49", flag: "🇩🇪" },
  { code: "FR", dial: "+33", flag: "🇫🇷" },
  { code: "IT", dial: "+39", flag: "🇮🇹" },
  { code: "ES", dial: "+34", flag: "🇪🇸" },
  { code: "PT", dial: "+351", flag: "🇵🇹" },
  { code: "NL", dial: "+31", flag: "🇳🇱" },
  { code: "BE", dial: "+32", flag: "🇧🇪" },
  { code: "SE", dial: "+46", flag: "🇸🇪" },
  { code: "NO", dial: "+47", flag: "🇳🇴" },
  { code: "DK", dial: "+45", flag: "🇩🇰" },
  { code: "CH", dial: "+41", flag: "🇨🇭" },
  { code: "AT", dial: "+43", flag: "🇦🇹" },
  { code: "PL", dial: "+48", flag: "🇵🇱" },
  { code: "IE", dial: "+353", flag: "🇮🇪" },
  { code: "AU", dial: "+61", flag: "🇦🇺" },
  { code: "NZ", dial: "+64", flag: "🇳🇿" },
  { code: "IN", dial: "+91", flag: "🇮🇳" },
  { code: "PK", dial: "+92", flag: "🇵🇰" },
  { code: "BD", dial: "+880", flag: "🇧🇩" },
  { code: "CN", dial: "+86", flag: "🇨🇳" },
  { code: "JP", dial: "+81", flag: "🇯🇵" },
  { code: "KR", dial: "+82", flag: "🇰🇷" },
  { code: "AE", dial: "+971", flag: "🇦🇪" },
  { code: "SA", dial: "+966", flag: "🇸🇦" },
  { code: "QA", dial: "+974", flag: "🇶🇦" },
  { code: "BR", dial: "+55", flag: "🇧🇷" },
  { code: "MX", dial: "+52", flag: "🇲🇽" },
  { code: "AR", dial: "+54", flag: "🇦🇷" },
  { code: "IL", dial: "+972", flag: "🇮🇱" },
  { code: "TR", dial: "+90", flag: "🇹🇷" },
  { code: "RU", dial: "+7", flag: "🇷🇺" },
  { code: "PH", dial: "+63", flag: "🇵🇭" },
  { code: "TH", dial: "+66", flag: "🇹🇭" },
  { code: "MY", dial: "+60", flag: "🇲🇾" },
  { code: "SG", dial: "+65", flag: "🇸🇬" },
  { code: "ID", dial: "+62", flag: "🇮🇩" },
];

interface CountryCodeSelectProps {
  value: string;
  onChange: (dial: string) => void;
  className?: string;
}

const CountryCodeSelect = ({ value, onChange, className }: CountryCodeSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = countryCodes.find(c => c.dial === value) || countryCodes[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = countryCodes.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.dial.includes(search)
  );

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-2.5 h-10 rounded-l-xl border border-r-0 border-border/80 bg-muted text-sm hover:bg-muted/80 transition-colors whitespace-nowrap"
      >
        <span>{selected.flag}</span>
        <span className="text-muted-foreground">{selected.dial}</span>
        <ChevronDown size={12} className="text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 max-h-60 overflow-auto bg-popover border border-border rounded-xl shadow-lg z-50">
          <div className="p-2 sticky top-0 bg-popover">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-background outline-none focus:ring-1 focus:ring-primary/30"
              autoFocus
            />
          </div>
          {filtered.map(c => (
            <button
              key={c.code + c.dial}
              type="button"
              onClick={() => { onChange(c.dial); setOpen(false); setSearch(""); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors",
                c.dial === value && "bg-primary/10 font-semibold"
              )}
            >
              <span>{c.flag}</span>
              <span className="text-muted-foreground">{c.code}</span>
              <span className="ml-auto text-muted-foreground">{c.dial}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CountryCodeSelect;
export { countryCodes };
