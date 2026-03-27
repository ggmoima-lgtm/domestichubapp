import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RefundPolicy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Credit Refund Policy</h1>
        </div>
      </header>
      <div className="p-6 max-w-2xl mx-auto space-y-6 text-sm text-foreground">
        <p className="text-muted-foreground">Last updated: February 2026</p>

        <section className="space-y-2">
          <h2 className="text-base font-bold">1. Overview</h2>
          <p>Credits purchased on DomesticHub are non-refundable once used to unlock a helper profile. Unused credits may be eligible for a refund within 14 days of purchase, subject to the conditions below.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">2. Refund Eligibility</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Refund requests must be submitted within 14 days of the credit purchase date.</li>
            <li>Only unused credits are eligible for refund.</li>
            <li>Credits that have been used to unlock helper profiles cannot be refunded.</li>
            <li>Bonus credits received through promotions or promo codes are non-refundable.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">3. How to Request a Refund</h2>
          <p>To request a refund, email <strong>support@domestichub.app</strong> with your account email, purchase date, and the number of credits you wish to refund. We aim to respond within 5 business days.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">4. Processing</h2>
          <p>Approved refunds will be processed to the original payment method within 7–10 business days. A processing fee of 5% may apply.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold">5. Disputes</h2>
          <p>If you believe a credit was incorrectly deducted, please contact support. We will investigate and resolve the issue within 10 business days.</p>
        </section>
      </div>
    </div>
  );
};

export default RefundPolicy;
