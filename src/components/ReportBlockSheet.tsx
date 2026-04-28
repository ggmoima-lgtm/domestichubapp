import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { Flag, Ban, X } from "lucide-react";

interface ReportBlockSheetProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetName: string;
}

const REPORT_REASONS = [
  "Inappropriate content",
  "Fake profile",
  "Harassment",
  "Contact info in video/bio",
  "Scam or fraud",
  "Other",
];

const ReportBlockSheet = ({ isOpen, onClose, targetUserId, targetName }: ReportBlockSheetProps) => {
  useEscapeKey(isOpen, onClose);
  const { user } = useAuth();
  const [mode, setMode] = useState<"menu" | "report">("menu");
  const [selectedReason, setSelectedReason] = useState("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleReport = async () => {
    if (!user || !selectedReason) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("user_reports").insert({
        reporter_id: user.id,
        reported_user_id: targetUserId,
        reason: selectedReason,
        details: details || null,
      });
      if (error) throw error;
      toast.success("Report submitted. We'll review it shortly.");
      onClose();
      setMode("menu");
      setSelectedReason("");
      setDetails("");
    } catch (err: any) {
      toast.error("Failed to submit report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlock = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("blocked_users").insert({
        blocker_id: user.id,
        blocked_id: targetUserId,
      });
      if (error) {
        if (error.code === "23505") {
          toast.info("User already blocked.");
        } else throw error;
      } else {
        toast.success(`${targetName} has been blocked.`);
      }
      onClose();
    } catch (err: any) {
      toast.error("Failed to block user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-float animate-slide-up max-h-[60vh] overflow-y-auto">
        <div className="sticky top-0 bg-card pt-3 pb-2 flex justify-center z-10">
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors">
          <X size={18} />
        </button>

        <div className="px-5 pb-8">
          {mode === "menu" && (
            <div className="space-y-3">
              <h3 className="font-bold text-foreground text-lg">Actions</h3>
              <button
                onClick={() => setMode("report")}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors text-left"
              >
                <Flag size={20} className="text-amber-500" />
                <div>
                  <p className="font-semibold text-sm">Report {targetName}</p>
                  <p className="text-xs text-muted-foreground">Flag inappropriate behavior</p>
                </div>
              </button>
              <button
                onClick={handleBlock}
                disabled={isSubmitting}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-destructive/5 hover:bg-destructive/10 transition-colors text-left"
              >
                <Ban size={20} className="text-destructive" />
                <div>
                  <p className="font-semibold text-sm text-destructive">Block {targetName}</p>
                  <p className="text-xs text-muted-foreground">You won't see their profile anymore</p>
                </div>
              </button>
            </div>
          )}

          {mode === "report" && (
            <div className="space-y-4">
              <h3 className="font-bold text-foreground text-lg">Report {targetName}</h3>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Reason</Label>
                <div className="space-y-2">
                  {REPORT_REASONS.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setSelectedReason(reason)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all border ${
                        selectedReason === reason
                          ? "border-primary bg-primary/5 font-semibold"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Additional details (optional)</Label>
                <Textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Describe the issue..."
                  rows={3}
                  className="rounded-xl"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setMode("menu")} className="rounded-xl">
                  Back
                </Button>
                <Button
                  onClick={handleReport}
                  disabled={!selectedReason || isSubmitting}
                  className="rounded-xl flex-1"
                >
                  {isSubmitting ? "Submitting..." : "Submit Report"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportBlockSheet;
