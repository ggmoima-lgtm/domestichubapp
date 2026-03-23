import { ShieldCheck } from "lucide-react";

const TrustBanner = () => (
  <div className="bg-primary/5 border-y border-primary/10 px-4 py-2.5 flex items-center justify-center gap-2">
    <ShieldCheck size={14} className="text-primary shrink-0" />
    <p className="text-[11px] text-muted-foreground font-medium">
      Domestic Hub verifies users to create a safer hiring experience
    </p>
  </div>
);

export default TrustBanner;
