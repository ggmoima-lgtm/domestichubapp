import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const OffPlatformLiability = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Off-Platform Liability</h1>
        </div>
      </header>
      <div className="p-6 max-w-2xl mx-auto space-y-6 text-sm text-foreground">
        <p className="text-muted-foreground">Last updated: February 2026</p>

        <section className="space-y-2">
          <h2 className="text-base font-bold">1. Scope of Service</h2>
          <p>DomesticHub provides a platform to connect employers with domestic helpers. We facilitate introductions and provide tools for communication, verification, and profile management.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">2. Off-Platform Arrangements</h2>
          <p>Any employment agreements, contracts, salary negotiations, or work arrangements made between employers and helpers outside of the DomesticHub platform are solely between those parties.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">3. Limitation of Liability</h2>
          <p>DomesticHub shall not be held liable for:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Quality or reliability of services provided by helpers</li>
            <li>Disputes arising from employment arrangements</li>
            <li>Loss, damage, or injury occurring in the course of employment</li>
            <li>Non-compliance with labour laws by either party</li>
            <li>Misrepresentation by any user of the platform</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">4. Employer Responsibilities</h2>
          <p>Employers are responsible for: verifying work permits, complying with South African labour laws (including UIF, minimum wage, and working hours), providing a safe working environment, and formalizing employment contracts.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">5. Dispute Resolution</h2>
          <p>While DomesticHub provides a reporting system for misconduct, we do not mediate employment disputes. Parties are encouraged to seek legal advice or contact the CCMA for employment-related disputes.</p>
        </section>
      </div>
    </div>
  );
};

export default OffPlatformLiability;
