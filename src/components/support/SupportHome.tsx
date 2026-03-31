import { ArrowLeft, MessageCircle, Mail, AlertTriangle, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";

interface SupportHomeProps {
  onNavigate: (screen: "faq" | "contact" | "report") => void;
  onBack?: () => void;
}

const SupportHome = ({ onNavigate, onBack }: SupportHomeProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-foreground">Support</h1>
          <p className="text-sm text-muted-foreground mt-1">
            How can we help you today?
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Card
          variant="interactive"
          className="p-4 flex items-center gap-4"
          onClick={() => onNavigate("faq")}
        >
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <MessageCircle size={20} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">FAQ Chat Assistant</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get instant answers to common questions
            </p>
          </div>
        </Card>

        <Card
          variant="interactive"
          className="p-4 flex items-center gap-4"
          onClick={() => onNavigate("contact")}
        >
          <div className="w-11 h-11 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
            <Mail size={20} className="text-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">Contact Support</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reach our support team directly
            </p>
          </div>
        </Card>

        <Card
          variant="interactive"
          className="p-4 flex items-center gap-4"
          onClick={() => onNavigate("report")}
        >
          <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">Report a Problem</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Report issues, bugs, or safety concerns
            </p>
          </div>
        </Card>
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

export default SupportHome;
