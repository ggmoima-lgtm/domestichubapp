const ComponentSummary = () => {
  const components = [
    {
      category: "📱 Pages",
      items: [
        { name: "Index", file: "src/pages/Index.tsx", desc: "Main dashboard — tabs for Home, Messages, Hub (unlocked profiles), Profile. Handles payment callbacks, credit balance, helper filtering." },
        { name: "Auth", file: "src/pages/Auth.tsx", desc: "Login & signup page with email/password authentication." },
        { name: "SplashScreen", file: "src/pages/SplashScreen.tsx", desc: "Animated splash/loading screen shown on app launch." },
        { name: "Onboarding", file: "src/pages/Onboarding.tsx", desc: "Multi-step onboarding flow for new users." },
        { name: "LandingPage", file: "src/pages/LandingPage.tsx", desc: "Public marketing landing page at /welcome." },
        { name: "ProfileTab", file: "src/pages/ProfileTab.tsx", desc: "Routes to HelperProfile or EmployerProfile based on user role." },
        { name: "HelperProfile", file: "src/pages/HelperProfile.tsx", desc: "Helper's own profile management page." },
        { name: "EmployerProfile", file: "src/pages/EmployerProfile.tsx", desc: "Employer profile with settings, credit wallet, job posting." },
        { name: "HelperRegistration", file: "src/pages/HelperRegistration.tsx", desc: "Multi-step helper registration form." },
        { name: "AdminDashboard", file: "src/pages/AdminDashboard.tsx", desc: "Admin panel for managing helpers, employers, and moderation." },
        { name: "ResetPassword", file: "src/pages/ResetPassword.tsx", desc: "Password reset flow." },
      ],
    },
    {
      category: "🧩 Core Components",
      items: [
        { name: "WorkerCard", file: "src/components/WorkerCard.tsx", desc: "Helper listing card with avatar (blurred if locked), name, role, rating, skills, save/favorite button, status badge, unlock indicator." },
        { name: "WorkerDetailSheet", file: "src/components/WorkerDetailSheet.tsx", desc: "Full-screen bottom sheet with helper details: intro video, bio, contact info (masked if locked), reviews, work history, badges, hire/unhire actions, chat, unlock flow." },
        { name: "BottomNav", file: "src/components/BottomNav.tsx", desc: "Fixed bottom navigation with 4 tabs: Home, Messages (with unread badge), Hub, Profile. Real-time unread count via Supabase subscription." },
        { name: "SearchBar", file: "src/components/SearchBar.tsx", desc: "Search input with filter button showing active filter count." },
        { name: "CategoryPill", file: "src/components/CategoryPill.tsx", desc: "Rounded pill button for category filtering (All, Nannies, Housekeepers, Caregivers)." },
        { name: "FilterSheet", file: "src/components/FilterSheet.tsx", desc: "Bottom sheet with comprehensive filters: location, job type, skills, experience, salary range, language, rating, verified/unlocked toggles." },
        { name: "StatusFrame", file: "src/components/StatusFrame.tsx", desc: "Colored ring wrapper around avatar indicating helper availability status (green=available, blue=interviewing, amber=hired, red=unavailable)." },
      ],
    },
    {
      category: "💬 Messaging",
      items: [
        { name: "MessagesList", file: "src/components/MessagesList.tsx", desc: "Conversation list grouped by helper, showing avatar, last message preview, unread count, timestamps." },
        { name: "InAppChat", file: "src/components/InAppChat.tsx", desc: "Real-time chat interface with message bubbles, safety warning banner, hire/unhire actions, message moderation." },
      ],
    },
    {
      category: "💰 Credits & Payments",
      items: [
        { name: "CreditWalletCard", file: "src/components/CreditWalletCard.tsx", desc: "Credit balance display with buy bundles (5/10/25 credits), transaction history, Paystack payment integration." },
        { name: "LowCreditBanner", file: "src/components/LowCreditBanner.tsx", desc: "Warning banner when credits ≤ 2, dismissible, with buy button." },
        { name: "UnlockConfirmSheet", file: "src/components/UnlockConfirmSheet.tsx", desc: "Confirmation sheet before spending credits to unlock a helper profile." },
        { name: "UnlockBundleSheet", file: "src/components/UnlockBundleSheet.tsx", desc: "Bundle selection sheet for unlocking profiles." },
        { name: "PromoCodeSheet", file: "src/components/PromoCodeSheet.tsx", desc: "Promo code redemption sheet." },
        { name: "InvoiceHistory", file: "src/components/InvoiceHistory.tsx", desc: "List of past invoices and payment records." },
        { name: "CartSheet", file: "src/components/CartSheet.tsx", desc: "Shopping cart for credit bundles." },
      ],
    },
    {
      category: "🏠 Landing & Marketing",
      items: [
        { name: "HeroSection", file: "src/components/HeroSection.tsx", desc: "Hero banner with tagline, CTA buttons (Find Helpers / Post Profile), trust indicators." },
      ],
    },
    {
      category: "👤 Profile & Settings",
      items: [
        { name: "BadgeDisplay", file: "src/components/BadgeDisplay.tsx", desc: "Displays trust/performance/activity badges with colored icons." },
        { name: "HelperHomeView", file: "src/components/HelperHomeView.tsx", desc: "Helper's home tab showing active job listings with search and apply functionality." },
        { name: "CreateJobSheet", file: "src/components/CreateJobSheet.tsx", desc: "Job posting form for employers." },
        { name: "ApplicationPreviewSheet", file: "src/components/ApplicationPreviewSheet.tsx", desc: "Preview of job applications received." },
        { name: "ChangePhoneSheet", file: "src/components/ChangePhoneSheet.tsx", desc: "Phone number change flow." },
      ],
    },
    {
      category: "🔒 Safety & Legal",
      items: [
        { name: "ProtectedRoute", file: "src/components/ProtectedRoute.tsx", desc: "Auth guard redirecting unauthenticated users to /auth." },
        { name: "ReportBlockSheet", file: "src/components/ReportBlockSheet.tsx", desc: "Report/block user interface." },
        { name: "ScreenshotGuard", file: "src/components/ScreenshotGuard.tsx", desc: "Watermark overlay to discourage screenshots of sensitive content." },
      ],
    },
    {
      category: "🔧 Utilities & Hooks",
      items: [
        { name: "useAuth", file: "src/hooks/useAuth.tsx", desc: "Auth context provider with user state, login, signup, logout." },
        { name: "useCart", file: "src/hooks/useCart.tsx", desc: "Shopping cart state management." },
        { name: "useGoogleMaps", file: "src/hooks/useGoogleMaps.ts", desc: "Google Maps API loader hook." },
        { name: "useMobile", file: "src/hooks/use-mobile.tsx", desc: "Mobile viewport detection hook." },
        { name: "contactMasking", file: "src/lib/contactMasking.ts", desc: "Masks phone/email in bios for locked profiles." },
        { name: "LocationAutocomplete", file: "src/components/LocationAutocomplete.tsx", desc: "Google Places autocomplete input." },
      ],
    },
    {
      category: "⚡ Edge Functions (Backend)",
      items: [
        { name: "initialize-payment", file: "supabase/functions/initialize-payment/index.ts", desc: "Paystack payment initialization." },
        { name: "paystack-webhook", file: "supabase/functions/paystack-webhook/index.ts", desc: "Paystack webhook handler." },
        { name: "send-notification", file: "supabase/functions/send-notification/index.ts", desc: "Push notification dispatcher." },
        { name: "send-invoice-email", file: "supabase/functions/send-invoice-email/index.ts", desc: "Invoice email sender." },
        { name: "moderate-message", file: "supabase/functions/moderate-message/index.ts", desc: "Chat message content moderation." },
        { name: "moderate-video", file: "supabase/functions/moderate-video/index.ts", desc: "Intro video moderation." },
        { name: "badge-engine", file: "supabase/functions/badge-engine/index.ts", desc: "Badge auto-award logic." },
        { name: "shufti-verify / shufti-webhook", file: "supabase/functions/shufti-verify/index.ts", desc: "Identity verification via ShuftiPro." },
        { name: "auto-refund", file: "supabase/functions/auto-refund/index.ts", desc: "Automatic refund processing." },
        { name: "status-reminder", file: "supabase/functions/status-reminder/index.ts", desc: "Status update reminders." },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-2">Domestic Hub — Component Summary</h1>
      <p className="text-muted-foreground mb-8">Complete UI architecture overview with {components.reduce((acc, c) => acc + c.items.length, 0)} components across {components.length} categories.</p>

      {components.map((cat) => (
        <section key={cat.category} className="mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4 border-b border-border pb-2">{cat.category}</h2>
          <div className="space-y-3">
            {cat.items.map((item) => (
              <div key={item.name} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-foreground text-sm">{item.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.file}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default ComponentSummary;
