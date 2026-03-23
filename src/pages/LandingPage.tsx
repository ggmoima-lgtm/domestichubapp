import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import logo from "@/assets/logo.jpg";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "FAQ", href: "#faq" },
  { label: "About", href: "#about" },
];

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.domestichub.app";
const APP_STORE_URL = "https://apps.apple.com/app/domestic-hub/id000000000";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Domestic Hub" className="w-8 h-8 rounded-lg" />
            <span className="font-display font-bold text-lg text-foreground">
              Domestic Hub
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <button
                key={l.href}
                onClick={() => scrollTo(l.href.slice(1))}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {l.label}
              </button>
            ))}
            <Button size="sm" asChild>
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">Get the App</a>
            </Button>
          </div>

        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute top-20 right-10 w-40 h-40 bg-secondary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-32 h-32 bg-accent/20 rounded-full blur-2xl" />

        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-32 text-center">
          <img
            src={logo}
            alt="Domestic Hub"
            className="w-20 h-20 rounded-2xl shadow-lg mx-auto mb-8"
          />

          <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground leading-tight mb-3">
            Find Trusted Domestic Help
          </h1>

          <p className="text-lg md:text-xl font-semibold text-primary mb-4">
            Get Hired Faster
          </p>

          <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto mb-10">
            Verified helpers. Safe hiring. Simple process.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto mb-6 w-full">
            <Button
              size="lg"
              className="flex-1 w-full"
              onClick={() => navigate("/auth?role=employer&mode=signup")}
            >
              Continue as Employer
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 w-full"
              onClick={() => navigate("/auth?role=helper&mode=signup")}
            >
              Continue as Helper
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/auth")}
              className="text-primary font-semibold hover:underline"
            >
              Log in
            </button>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-10 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-primary" />
              ID Verified
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-primary" />
              Safe Hiring
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-primary" />
              Real Users Only
            </span>
          </div>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;
