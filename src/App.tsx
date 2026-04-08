import { lazy, Suspense, Component, ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import logo from "@/assets/logo.jpg";

// Lazy-loaded pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const HelperRegistration = lazy(() => import("./pages/HelperRegistration"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const SplashScreen = lazy(() => import("./pages/SplashScreen"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsConditions = lazy(() => import("./pages/TermsConditions"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const UnlockDisclaimer = lazy(() => import("./pages/UnlockDisclaimer"));
const POPIACompliance = lazy(() => import("./pages/POPIACompliance"));
const OffPlatformLiability = lazy(() => import("./pages/OffPlatformLiability"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const ArchitectureFlowchart = lazy(() => import("./pages/ArchitectureFlowchart"));
const DeleteAccount = lazy(() => import("./pages/DeleteAccount"));
const ComponentSummary = lazy(() => import("./pages/ComponentSummary"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const Onboarding = lazy(() => import("./pages/Onboarding"));


const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-primary gap-6">
    <img src={logo} alt="Domestic Hub" className="w-32 h-32 object-contain rounded-2xl shadow-lg animate-[heartbeat_1.2s_ease-in-out_infinite]" />
    <p className="text-primary-foreground/80 text-sm font-medium">Connecting Homes With Trusted Hands</p>
    <div className="w-8 h-8 rounded-full border-3 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
  </div>
);

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("App error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center gap-5">
          <img src={logo} alt="Domestic Hub" className="w-24 h-24 object-contain rounded-2xl shadow-md" />
          <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            We're sorry, an unexpected error occurred. Please try again or contact support if the issue persists.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = "/";
              }}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:opacity-90 transition-opacity"
            >
              Go to Home
            </button>
            <a
              href="mailto:info@domestichub.co.za?subject=App%20Error%20Report&body=Hi%20Support%2C%0A%0AI%20encountered%20an%20error%20while%20using%20the%20app.%0A%0APlease%20describe%20what%20you%20were%20doing%3A%0A"
              className="px-6 py-3 rounded-xl border border-border bg-card text-foreground font-semibold text-sm shadow-sm hover:bg-accent transition-colors text-center"
            >
              Email Support
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                
                <Route path="/" element={<LandingPage />} />
                <Route path="/welcome" element={<LandingPage />} />
                <Route path="/splash" element={<ProtectedRoute><SplashScreen /></ProtectedRoute>} />
                <Route path="/home" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/index" element={<Navigate to="/home" replace />} />
                <Route path="/register/helper" element={<ProtectedRoute><HelperRegistration /></ProtectedRoute>} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsConditions />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/unlock-disclaimer" element={<UnlockDisclaimer />} />
                <Route path="/popia" element={<POPIACompliance />} />
                <Route path="/off-platform-liability" element={<OffPlatformLiability />} />
                <Route path="/delete-account" element={<DeleteAccount />} />
                <Route path="/architecture" element={<ArchitectureFlowchart />} />
                <Route path="/components" element={<ComponentSummary />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
