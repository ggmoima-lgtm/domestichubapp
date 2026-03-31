import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

interface ReportProblemProps {
  onBack: () => void;
}

const REPORT_REASONS = [
  "App bug or error",
  "Payment issue",
  "Profile problem",
  "Inappropriate content",
  "Safety concern",
  "Other",
];

const ReportProblem = ({ onBack }: ReportProblemProps) => {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = () => {
    if (!reason) {
      toast.error("Please select a reason");
      return;
    }
    setSending(true);
    const subject = encodeURIComponent(`Problem Report: ${reason}`);
    const body = encodeURIComponent(`Reason: ${reason}\n\nDetails:\n${details}\n\n---\nSent from Domestic Hub app`);
    window.open(`mailto:info@domestichub.co.za?subject=${subject}&body=${body}`, "_self");
    setSending(false);
    toast.success("Opening your email client to send the report.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div>
          <h2 className="font-bold text-base text-foreground">Report a Problem</h2>
          <p className="text-xs text-muted-foreground">Tell us what went wrong</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Category</label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent>
              {REPORT_REASONS.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Details (optional)</label>
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Describe the problem in detail..."
            className="rounded-xl min-h-[120px]"
          />
        </div>

        <Button onClick={handleSubmit} disabled={sending} className="w-full">
          Send Report
        </Button>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 border border-border">
        <Shield size={14} className="text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Domestic Hub is a connection platform and is not responsible for agreements or interactions outside the app.
        </p>
      </div>
    </div>
  );
};

export default ReportProblem;
