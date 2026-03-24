import { ArrowLeft, Mail, Trash2, Shield, Clock, Database, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const DeleteAccount = () => {
  const navigate = useNavigate();

  const deletionEmail = "info@domestichub.co.za";
  const subject = encodeURIComponent("Account & Data Deletion Request");
  const body = encodeURIComponent(
    "Hi Domestic Hub Support,\n\nI would like to request the deletion of my account and all associated personal data from the Domestic Hub app.\n\nMy registered email/phone: [please fill in]\n\nPlease confirm once this has been processed.\n\nThank you."
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-foreground">Delete Your Account</h1>
        </div>
      </header>

      <main className="px-5 py-6 max-w-lg mx-auto space-y-6 pb-12">
        {/* App Identity */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Trash2 size={28} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Domestic Hub</h2>
          <p className="text-sm text-muted-foreground">Account & Data Deletion</p>
        </div>

        {/* Warning */}
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle size={20} className="text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              Deleting your account is <strong>permanent and irreversible</strong>. Once processed, your data cannot be recovered.
            </p>
          </CardContent>
        </Card>

        {/* Steps to Request Deletion */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Shield size={18} className="text-primary" /> How to Request Account Deletion
          </h3>
          <div className="space-y-3">
            {[
              {
                step: 1,
                title: "Send a deletion request",
                desc: "Tap the button below to send an email to our support team, or email us directly at info@domestichub.co.za with the subject line \"Account & Data Deletion Request\".",
              },
              {
                step: 2,
                title: "Verify your identity",
                desc: "Include the email address or phone number associated with your Domestic Hub account so we can locate your data.",
              },
              {
                step: 3,
                title: "Receive confirmation",
                desc: "Our team will acknowledge your request within 2 business days and confirm when the deletion is complete.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Request Button */}
        <a
          href={`mailto:${deletionEmail}?subject=${subject}&body=${body}`}
          className="flex items-center justify-center gap-2 w-full bg-destructive text-destructive-foreground font-semibold py-3.5 rounded-xl hover:bg-destructive/90 transition-colors text-sm"
        >
          <Mail size={18} /> Request Account Deletion
        </a>

        <Separator />

        {/* Data That Will Be Deleted */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Database size={18} className="text-primary" /> Data That Will Be Deleted
          </h3>
          <p className="text-sm text-muted-foreground">
            When your deletion request is processed, the following data is <strong>permanently removed</strong>:
          </p>
          <ul className="space-y-2 text-sm text-foreground">
            {[
              "Your profile information (name, photo, bio, skills, location)",
              "Your phone number and email address",
              "Uploaded documents (ID copies, references)",
              "Intro videos",
              "Messages and chat history",
              "Saved helpers and job posts",
              "Credit wallet balance and purchase history",
              "Notification preferences and push tokens",
              "Badge awards and review history",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">✕</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <Separator />

        {/* Data That May Be Retained */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Clock size={18} className="text-primary" /> Data That May Be Retained
          </h3>
          <p className="text-sm text-muted-foreground">
            Certain data may be retained for a limited period after deletion for legal, regulatory, or fraud prevention purposes:
          </p>
          <ul className="space-y-2 text-sm text-foreground">
            {[
              {
                data: "Payment transaction records and invoices",
                period: "Retained for 5 years as required by South African tax law (SARS)",
              },
              {
                data: "Abuse reports and moderation records",
                period: "Retained for up to 12 months for fraud prevention and platform safety",
              },
              {
                data: "Anonymised analytics data",
                period: "May be retained indefinitely in aggregated, non-identifiable form",
              },
            ].map((item, i) => (
              <li key={i} className="bg-muted/50 rounded-xl p-3 space-y-1">
                <p className="font-medium">{item.data}</p>
                <p className="text-xs text-muted-foreground">{item.period}</p>
              </li>
            ))}
          </ul>
        </section>

        <Separator />

        {/* Timeline */}
        <section className="space-y-2">
          <h3 className="text-base font-bold text-foreground">Processing Timeline</h3>
          <p className="text-sm text-muted-foreground">
            Account deletion requests are processed within <strong>30 days</strong> of receipt. You will receive an email confirmation once your account has been fully deleted.
          </p>
        </section>

        {/* Contact */}
        <div className="bg-muted rounded-2xl p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">Need help?</p>
          <p className="text-sm text-muted-foreground">
            For questions about data deletion or your privacy rights, contact:
          </p>
          <a
            href={`mailto:${deletionEmail}`}
            className="inline-flex items-center gap-1.5 text-primary font-medium text-sm"
          >
            <Mail size={14} /> {deletionEmail}
          </a>
        </div>
      </main>
    </div>
  );
};

export default DeleteAccount;
