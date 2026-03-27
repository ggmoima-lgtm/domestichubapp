import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const POPIACompliance = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">POPIA Compliance</h1>
        </div>
      </header>
      <div className="p-6 max-w-2xl mx-auto space-y-6 text-sm text-foreground">
        <p className="text-muted-foreground">Last updated: February 2026</p>

        <section className="space-y-2">
          <h2 className="text-base font-bold">1. Introduction</h2>
          <p>DomesticHub is committed to complying with the Protection of Personal Information Act (POPIA) of South Africa. This policy explains how we collect, use, store, and protect your personal information.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">2. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Personal details: Name, email, phone number, age, gender, nationality</li>
            <li>Identity documents: ID or passport copies for verification</li>
            <li>Professional information: Skills, experience, references, introduction videos</li>
            <li>Usage data: App activity, search history, communication logs</li>
            <li>Payment information: Credit purchase and transaction records</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">3. Purpose of Processing</h2>
          <p>We process your information to: facilitate matching between employers and helpers, verify identities, process payments, communicate important updates, and improve our services.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">4. Your Rights</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Right to access your personal information</li>
            <li>Right to correct inaccurate information</li>
            <li>Right to request deletion of your data</li>
            <li>Right to object to processing</li>
            <li>Right to withdraw consent</li>
            <li>Right to lodge a complaint with the Information Regulator</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">5. Data Security</h2>
          <p>We use industry-standard encryption, access controls, and security measures to protect your data. Personal information is stored securely and accessed only by authorized personnel.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">6. Data Retention</h2>
          <p>We retain your personal information for as long as your account is active or as needed to provide services. Upon account deletion, data is removed within 30 days, except where retention is required by law.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">7. Information Officer</h2>
          <p>For POPIA-related inquiries, contact our Information Officer at <strong>info@domestichub.co.za</strong>.</p>
        </section>
      </div>
    </div>
  );
};

export default POPIACompliance;
