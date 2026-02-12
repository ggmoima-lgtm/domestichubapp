import { ArrowLeft, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-foreground">Privacy Policy</h1>
        </div>
      </header>

      <main className="px-5 py-6 max-w-lg mx-auto space-y-6 text-sm text-foreground leading-relaxed pb-12">
        <p className="text-muted-foreground">
          Welcome to Domestic Hub. Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information when you use our mobile application and services.
        </p>

        <section className="space-y-3">
          <h2 className="text-base font-bold">1. Information We Collect</h2>
          <p className="text-muted-foreground">We collect information to provide and improve our services.</p>
          
          <h3 className="font-semibold">Information You Provide</h3>
          <p className="text-muted-foreground">When you sign up or use Domestic Hub, we may collect:</p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Full name</li>
            <li>Phone number</li>
            <li>Profile photo</li>
            <li>Location</li>
            <li>Age and gender (optional)</li>
            <li>Skills and work experience</li>
            <li>Salary expectations</li>
            <li>Availability information</li>
            <li>Uploaded documents (such as ID or references, if provided)</li>
            <li>Intro videos (if uploaded)</li>
            <li>Messages sent through the app</li>
          </ul>

          <h3 className="font-semibold">Automatically Collected Information</h3>
          <p className="text-muted-foreground">We may automatically collect:</p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Device type</li>
            <li>App usage data</li>
            <li>Login timestamps</li>
            <li>IP address (for security purposes)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">2. How We Use Your Information</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Create and manage your account</li>
            <li>Match helpers with employers</li>
            <li>Display profiles in search results</li>
            <li>Enable messaging between users</li>
            <li>Process profile unlock payments</li>
            <li>Improve app performance</li>
            <li>Prevent fraud and abuse</li>
            <li>Provide customer support</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">3. Profile Visibility</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Helper profiles are visible to employers using the platform</li>
            <li>Contact details are hidden until an employer unlocks a profile</li>
            <li>Only unlocked employers can see phone numbers and full contact details</li>
            <li>Reviews are shown publicly on helper profiles</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">4. Payments</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Payments are processed through secure third-party payment providers</li>
            <li>We do not store full card or banking details</li>
            <li>We only store transaction records</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">5. Document & Video Uploads</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Documents are stored securely</li>
            <li>Documents are only visible to admin reviewers</li>
            <li>Videos may be visible to employers viewing the profile</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">6. Messaging & Calls</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>In-app messages may be stored to improve safety and resolve disputes</li>
            <li>We may review messages if abuse is reported</li>
            <li>We do not monitor conversations unless flagged</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">7. Data Sharing</h2>
          <p className="text-muted-foreground">We do not sell personal data. We only share data with:</p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Service providers (hosting, payments, SMS verification)</li>
            <li>Law enforcement if legally required</li>
            <li>Fraud prevention partners (if needed)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">8. Data Security</h2>
          <p className="text-muted-foreground">
            We use reasonable technical and organizational safeguards to protect your data, including secure servers, access controls, and encrypted connections. However, no system is 100% secure.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">9. Your Rights</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Edit your profile information</li>
            <li>Request account deletion</li>
            <li>Request data correction</li>
            <li>Opt out of notifications</li>
          </ul>
          <p className="text-muted-foreground">
            To request deletion, contact:
          </p>
          <a href="mailto:info@domestichub.co.za" className="inline-flex items-center gap-1.5 text-primary font-medium">
            <Mail size={14} /> info@domestichub.co.za
          </a>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">10. Data Retention</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>We keep your data while your account is active</li>
            <li>For a limited time after deletion for legal and fraud prevention purposes</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">11. Children's Privacy</h2>
          <p className="text-muted-foreground">
            Domestic Hub is not intended for users under 18. We do not knowingly collect data from minors.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">12. Changes to This Policy</h2>
          <p className="text-muted-foreground">
            We may update this policy. We will notify users of major changes inside the app.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold">13. Contact Us</h2>
          <p className="text-muted-foreground">For privacy questions:</p>
          <div className="bg-muted rounded-2xl p-4">
            <p className="font-semibold">Domestic Hub Support</p>
            <a href="mailto:info@domestichub.co.za" className="inline-flex items-center gap-1.5 text-primary font-medium mt-1">
              <Mail size={14} /> info@domestichub.co.za
            </a>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
