import { ArrowLeft, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TermsConditions = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-foreground">Terms & Conditions</h1>
        </div>
      </header>

      <main className="px-5 py-6 max-w-lg mx-auto space-y-6 text-sm text-foreground leading-relaxed pb-12">
        <p className="text-muted-foreground">
          Welcome to Domestic Hub. By using our platform, you agree to the following terms and conditions. Please read them carefully before proceeding.
        </p>

        <section className="space-y-3">
          <h2 className="text-base font-bold">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground">
            By creating an account or using Domestic Hub, you agree to be bound by these Terms & Conditions, our Privacy Policy, and all applicable laws and regulations.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">2. Eligibility</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>You must be at least 18 years old to use Domestic Hub</li>
            <li>You must provide accurate, current, and complete information during registration</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">3. Platform Services</h2>
          <p className="text-muted-foreground">Domestic Hub provides a platform that connects employers seeking domestic help with helpers offering their services. We are not an employer or employment agency.</p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>We facilitate introductions but do not guarantee placements or outcomes</li>
            <li>All employment agreements are between the employer and helper directly</li>
            <li>We are not responsible for the quality of work, disputes, or conduct between users</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">4. Credits & Payments</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Credits are used to unlock helper profiles and view full contact details</li>
            <li>Credits are non-refundable once purchased</li>
            <li>Profile access expires after 30 days from unlock date</li>
            <li>All prices are in South African Rand (ZAR) and include applicable taxes</li>
            <li>Payments are processed securely through third-party payment providers</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">5. User Conduct</h2>
          <p className="text-muted-foreground">You agree NOT to:</p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Use the platform for any unlawful purpose</li>
            <li>Harass, threaten, or discriminate against other users</li>
            <li>Share contact information obtained through the platform without authorization</li>
            <li>Create multiple accounts or impersonate others</li>
            <li>Circumvent the platform's payment or verification systems</li>
            <li>Include personal contact information in public profile fields or videos</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">6. Content & Uploads</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>You retain ownership of content you upload (photos, videos, documents)</li>
            <li>You grant Domestic Hub a non-exclusive license to display your content on the platform</li>
            <li>Content that violates our guidelines will be removed without notice</li>
            <li>Videos containing contact information may be flagged and removed</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">7. Account Termination</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>You may delete your account at any time through the app settings</li>
            <li>Domestic Hub may suspend or terminate accounts that violate these terms</li>
            <li>Upon account deletion, your profile data will be permanently removed</li>
            <li>Unused credits are not refundable upon account deletion</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">8. Limitation of Liability</h2>
          <p className="text-muted-foreground">
            Domestic Hub is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">9. Governing Law</h2>
          <p className="text-muted-foreground">
            These terms are governed by the laws of the Republic of South Africa. Any disputes shall be resolved in the courts of South Africa.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">10. Changes to Terms</h2>
          <p className="text-muted-foreground">
            We may update these terms from time to time. Users will be notified of significant changes and may be required to re-accept the updated terms to continue using the platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">11. Contact</h2>
          <div className="bg-muted rounded-2xl p-4">
            <p className="font-semibold">Domestic Hub Support</p>
            <a href="mailto:info@domestichub.co.za" className="inline-flex items-center gap-1.5 text-primary font-medium mt-1">
              <Mail size={14} /> info@domestichub.co.za
            </a>
          </div>
        </section>

        <p className="text-xs text-muted-foreground text-center pt-4">
          Terms Version: 1.0 · Last Updated: February 2026
        </p>
      </main>
    </div>
  );
};

export default TermsConditions;
