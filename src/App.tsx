import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import HelperRegistration from "./pages/HelperRegistration";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import SplashScreen from "./pages/SplashScreen";

import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";
import AdminDashboard from "./pages/AdminDashboard";
import RefundPolicy from "./pages/RefundPolicy";
import UnlockDisclaimer from "./pages/UnlockDisclaimer";
import POPIACompliance from "./pages/POPIACompliance";
import OffPlatformLiability from "./pages/OffPlatformLiability";
import LandingPage from "./pages/LandingPage";
import ArchitectureFlowchart from "./pages/ArchitectureFlowchart";
import DeleteAccount from "./pages/DeleteAccount";
import ComponentSummary from "./pages/ComponentSummary";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
          </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
