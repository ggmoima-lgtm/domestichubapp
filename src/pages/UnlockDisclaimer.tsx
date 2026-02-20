import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const UnlockDisclaimer = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Unlock Disclaimer</h1>
        </div>
      </header>
      <div className="p-6 max-w-2xl mx-auto space-y-6 text-sm text-foreground">
        <p className="text-muted-foreground">Last updated: February 2026</p>

        <section className="space-y-2">
          <h2 className="text-base font-bold">1. Profile Unlock</h2>
          <p>Unlocking a helper profile costs 1 credit and grants permanent access to the helper's full profile, including their full name, contact details, introduction video, CV, and references.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">2. No Guarantee of Employment</h2>
          <p>Unlocking a profile does not guarantee employment or availability of the helper. The helper may already be hired, unavailable, or may choose not to respond.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">3. Accuracy of Information</h2>
          <p>While we encourage helpers to provide accurate information, DomesticHub does not guarantee the accuracy, completeness, or truthfulness of any profile content. Employers are advised to conduct their own verification.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">4. Non-Refundable</h2>
          <p>Once a credit is used to unlock a profile, it cannot be refunded. Please review the helper's visible information carefully before unlocking.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">5. Off-Platform Communication</h2>
          <p>Once unlocked, you may contact the helper directly. DomesticHub is not responsible for any agreements, disputes, or issues arising from off-platform communication or employment arrangements.</p>
        </section>
      </div>
    </div>
  );
};

export default UnlockDisclaimer;
