import { ArrowLeft, Mail, Phone, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContactSupportProps {
  onBack: () => void;
}

const ContactSupport = ({ onBack }: ContactSupportProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div>
          <h2 className="font-bold text-base text-foreground">Contact Support</h2>
          <p className="text-xs text-muted-foreground">We're here to help</p>
        </div>
      </div>

      <div className="space-y-3">
        <a
          href="mailto:info@domestichub.co.za?subject=Support%20Request"
          className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-soft hover:shadow-card transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Mail size={20} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">Email Us</p>
            <p className="text-xs text-muted-foreground mt-0.5">info@domestichub.co.za</p>
          </div>
        </a>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Our support team typically responds within 24 hours.
      </p>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 border border-border">
        <Shield size={14} className="text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Domestic Hub is a connection platform and is not responsible for agreements or interactions outside the app.
        </p>
      </div>
    </div>
  );
};

export default ContactSupport;
