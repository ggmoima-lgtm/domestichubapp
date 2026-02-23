import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Shield,
  Search,
  Heart,
  Star,
  Users,
  CheckCircle,
  MessageSquare,
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  Baby,
  Home,
  HeartHandshake,
  Sparkles,
} from "lucide-react";
import logo from "@/assets/logo.jpg";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "FAQ", href: "#faq" },
  { label: "About", href: "#about" },
];

const FEATURES = [
  {
    icon: Shield,
    title: "Verified Profiles",
    description:
      "Every helper goes through identity verification so you can hire with confidence.",
  },
  {
    icon: Search,
    title: "Smart Matching",
    description:
      "Filter by category, location, experience, and availability to find the perfect fit.",
  },
  {
    icon: MessageSquare,
    title: "In-App Messaging",
    description:
      "Chat directly with helpers before hiring — all communication stays safe on the platform.",
  },
  {
    icon: Award,
    title: "Trust Badges",
    description:
      "Helpers earn badges for reliability, punctuality, and great reviews.",
  },
  {
    icon: Clock,
    title: "Quick Hiring",
    description:
      "Post a job and start receiving applications within hours, not days.",
  },
  {
    icon: Heart,
    title: "Built With Care",
    description:
      "Designed specifically for South African families and domestic workers.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Create Your Account",
    description:
      "Sign up as an employer looking for help, or as a helper seeking work opportunities.",
    icon: Users,
  },
  {
    step: "02",
    title: "Browse or Post",
    description:
      "Employers browse verified helper profiles. Helpers create detailed profiles showcasing their skills.",
    icon: Search,
  },
  {
    step: "03",
    title: "Connect & Hire",
    description:
      "Unlock profiles, chat directly, and hire the right person for your family.",
    icon: HeartHandshake,
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah M.",
    role: "Employer",
    location: "Johannesburg",
    rating: 5,
    text: "Finding a nanny used to be so stressful. Domestic Hub made it simple — I found a wonderful caregiver within a week!",
  },
  {
    name: "Grace N.",
    role: "Helper",
    location: "Cape Town",
    rating: 5,
    text: "I registered my profile and started getting interview requests almost immediately. The platform treats helpers with respect.",
  },
  {
    name: "James T.",
    role: "Employer",
    location: "Durban",
    rating: 5,
    text: "The verification badges gave us peace of mind. We hired a housekeeper who has been amazing for over a year now.",
  },
  {
    name: "Thandi K.",
    role: "Helper",
    location: "Pretoria",
    rating: 5,
    text: "Domestic Hub helped me find stable employment. The in-app messaging made it easy to communicate with potential employers.",
  },
];

const CATEGORIES = [
  { icon: Baby, label: "Nannies & Au Pairs" },
  { icon: Home, label: "Housekeepers" },
  { icon: HeartHandshake, label: "Caregivers" },
  { icon: Sparkles, label: "Cleaners" },
];

const FAQ_ITEMS = [
  {
    q: "Is Domestic Hub free to use?",
    a: "Creating an account and browsing helper profiles is free. Employers purchase credits to unlock full helper contact details. Helpers can register and post their profiles at no cost.",
  },
  {
    q: "How are helpers verified?",
    a: "Every helper goes through an identity verification process. We verify ID documents and encourage helpers to upload intro videos and earn trust badges through consistent performance.",
  },
  {
    q: "What areas do you cover?",
    a: "Domestic Hub is available across South Africa — Johannesburg, Cape Town, Durban, Pretoria, and many more cities and towns.",
  },
  {
    q: "How do I hire a helper?",
    a: "Browse profiles, use filters to narrow your search, unlock a helper's contact info with credits, and chat with them directly through the app before making a hiring decision.",
  },
  {
    q: "Can helpers apply for jobs?",
    a: "Yes! Employers can post job listings and helpers can browse and apply directly, making the process faster for both sides.",
  },
  {
    q: "Is my personal information safe?",
    a: "Absolutely. We take privacy seriously and comply with POPIA regulations. Contact details are only shared once an employer unlocks a profile.",
  },
];

const TEAM = [
  {
    name: "Domestic Hub Team",
    role: "Founded in South Africa",
    description:
      "We're a passionate team dedicated to dignifying domestic work and making the hiring process safe, transparent, and respectful for everyone involved.",
  },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

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
            <Button size="sm" onClick={() => navigate("/auth")}>
              Get Started
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-card px-4 py-4 space-y-3 animate-fade-in">
            {NAV_LINKS.map((l) => (
              <button
                key={l.href}
                onClick={() => scrollTo(l.href.slice(1))}
                className="block w-full text-left text-sm text-muted-foreground hover:text-primary py-1"
              >
                {l.label}
              </button>
            ))}
            <Button className="w-full" onClick={() => navigate("/auth")}>
              Get Started
            </Button>
          </div>
        )}
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute top-20 right-10 w-40 h-40 bg-secondary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-32 h-32 bg-accent/20 rounded-full blur-2xl" />

        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-primary-light rounded-full px-4 py-1.5 mb-6">
            <Heart size={14} className="text-primary fill-primary" />
            <span className="text-xs font-semibold text-primary">
              South Africa's Trusted Platform
            </span>
          </div>

          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground leading-tight mb-4">
            Connecting Homes
            <br />
            <span className="text-primary">With Trusted Hands</span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Find verified nannies, housekeepers, caregivers, and cleaners in
            your area — or post your profile and get discovered by families who
            need your skills.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <Button size="lg" onClick={() => navigate("/auth")}>
              Find a Helper <ArrowRight size={18} />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth")}
            >
              Post Your Profile
            </Button>
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap justify-center gap-8 text-center">
            {[
              { value: "1,200+", label: "Verified Helpers" },
              { value: "5,000+", label: "Happy Families" },
              { value: "98%", label: "Satisfaction Rate" },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-display text-2xl md:text-3xl font-bold text-primary">
                  {s.value}
                </p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Categories ─── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATEGORIES.map((c) => (
            <Card key={c.label} variant="interactive" className="text-center p-6">
              <c.icon size={32} className="mx-auto text-primary mb-3" />
              <p className="font-display font-semibold text-sm text-foreground">
                {c.label}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="bg-muted/30 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-primary bg-primary-light px-3 py-1 rounded-full">
              Features
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-4">
              Everything You Need
            </h2>
            <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
              A platform designed with both employers and helpers in mind.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <Card key={f.title} variant="default" className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center mb-4">
                  <f.icon size={22} className="text-primary" />
                </div>
                <h3 className="font-display font-bold text-foreground mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-primary bg-primary-light px-3 py-1 rounded-full">
              How It Works
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-4">
              Simple as 1-2-3
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
                  <span className="font-display text-xl font-bold text-primary-foreground">
                    {s.step}
                  </span>
                </div>
                <h3 className="font-display font-bold text-foreground mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section id="testimonials" className="bg-muted/30 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-primary bg-primary-light px-3 py-1 rounded-full">
              Testimonials
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-4">
              Loved by Families & Helpers
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} variant="default" className="p-6">
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className="text-secondary fill-secondary"
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic mb-4">
                  "{t.text}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
                    <span className="font-display font-bold text-primary text-sm">
                      {t.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.role} · {t.location}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-primary bg-primary-light px-3 py-1 rounded-full">
              FAQ
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className="border border-border rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="font-display font-semibold text-sm text-foreground">
                    {item.q}
                  </span>
                  {openFaq === i ? (
                    <ChevronUp size={18} className="text-primary shrink-0" />
                  ) : (
                    <ChevronDown size={18} className="text-muted-foreground shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 animate-fade-in">
                    <p className="text-sm text-muted-foreground">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── About ─── */}
      <section id="about" className="bg-muted/30 py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="text-xs font-semibold text-primary bg-primary-light px-3 py-1 rounded-full">
            About Us
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-4 mb-4">
            Why Domestic Hub?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Domestic Hub was born from a simple belief: every family deserves
            access to trustworthy household help, and every domestic worker
            deserves dignity, visibility, and fair opportunities. We bridge the
            gap with technology, verification, and a community-first approach.
          </p>

          <div className="grid sm:grid-cols-3 gap-6 mt-10">
            {[
              {
                icon: Shield,
                title: "Safety First",
                desc: "ID verification and POPIA-compliant data handling.",
              },
              {
                icon: Users,
                title: "Community Driven",
                desc: "Built by South Africans, for South African families and helpers.",
              },
              {
                icon: CheckCircle,
                title: "Fair & Transparent",
                desc: "Clear pricing, no hidden fees, and respectful hiring practices.",
              },
            ].map((v) => (
              <div key={v.title} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary-light flex items-center justify-center mx-auto mb-3">
                  <v.icon size={24} className="text-primary" />
                </div>
                <h3 className="font-display font-bold text-foreground mb-1">
                  {v.title}
                </h3>
                <p className="text-xs text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4">
          <Card className="gradient-primary p-10 md:p-14 text-center border-0">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-lg mx-auto">
              Join thousands of families and helpers already using Domestic Hub.
              It's free to sign up.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate("/auth")}
              >
                Create Free Account <ArrowRight size={18} />
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Domestic Hub" className="w-7 h-7 rounded-lg" />
              <span className="font-display font-bold text-foreground">
                Domestic Hub
              </span>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <a href="/privacy" className="hover:text-primary transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="hover:text-primary transition-colors">
                Terms & Conditions
              </a>
              <a href="/popia" className="hover:text-primary transition-colors">
                POPIA
              </a>
              <a
                href="/refund-policy"
                className="hover:text-primary transition-colors"
              >
                Refund Policy
              </a>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()} Domestic Hub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
