import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import logo from "@/assets/logo.jpg";
import { lovable } from "@/integrations/lovable/index";

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
            Find Trusted Domestic Help and Gardeners
          </h1>

          <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto mb-1">
            Verified helpers near you.
          </p>
          <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto mb-10">
            Safe. Simple. Reliable.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto mb-6 w-full">
            <Button
              size="lg"
              className="flex-1 w-full"
              onClick={() => navigate("/auth?role=employer&mode=signup")}
            >
              Find Help
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 w-full"
              onClick={() => navigate("/auth?role=helper&mode=signup")}
            >
              Find Work
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/auth")}
              className="text-primary font-semibold hover:underline"
            >
              Log in
            </button>
          </p>

          <div className="flex flex-col sm:flex-row gap-2 justify-center max-w-sm mx-auto w-full">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 w-full gap-2"
              onClick={() => lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1 w-full gap-2"
              onClick={() => lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin })}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Continue with Apple
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-10 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              ✔ Domestic Helpers
            </span>
            <span className="flex items-center gap-1.5">
              ✔ Gardeners
            </span>
            <span className="flex items-center gap-1.5">
              ✔ Verified Profiles
            </span>
          </div>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;
