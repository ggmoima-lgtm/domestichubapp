import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";

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

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
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
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
