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

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.domestichub.app";
const APP_STORE_URL = "https://apps.apple.com/app/domestic-hub/id000000000";

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
