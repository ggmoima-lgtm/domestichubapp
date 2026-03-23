import { cn } from "@/lib/utils";

type HelperStatus = "available" | "interviewing" | "hired_platform" | "hired_external" | "unavailable" | "suspended";

const statusFrameColors: Record<HelperStatus, string> = {
  available: "ring-green-400 ring-2",
  interviewing: "ring-blue-400 ring-2 animate-pulse", // "In Conversation" status
  hired_platform: "ring-amber-400 ring-2",
  hired_external: "ring-amber-400 ring-2",
  unavailable: "ring-destructive/50 ring-2",
  suspended: "ring-destructive ring-2",
};

const statusDotColors: Record<HelperStatus, string> = {
  available: "bg-green-500",
  interviewing: "bg-blue-500",
  hired_platform: "bg-amber-500",
  hired_external: "bg-amber-500",
  unavailable: "bg-destructive",
  suspended: "bg-destructive",
};

interface StatusFrameProps {
  status: HelperStatus;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const StatusFrame = ({ status, children, size = "md", className }: StatusFrameProps) => {
  const dotSize = size === "sm" ? "w-2.5 h-2.5" : size === "lg" ? "w-4 h-4" : "w-3 h-3";
  
  return (
    <div className={cn("relative", className)}>
      <div className={cn("rounded-2xl overflow-hidden", statusFrameColors[status])}>
        {children}
      </div>
      <div className={cn(
        "absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-card",
        dotSize,
        statusDotColors[status]
      )} />
    </div>
  );
};

export default StatusFrame;
