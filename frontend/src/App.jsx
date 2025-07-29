import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthProvider";
import { ActiveAgentProvider } from "./contexts/ActiveAgentProvider";

// Layouts
import LandingLayout from "./components/layout/LandingLayout";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";

// Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AgentDashboardPage from "./pages/AgentDashboardPage";
import DashboardPage from "./pages/DashboardPage";
import TicketsListPage from "./pages/TicketsListPage";
import TicketDetailView from "./pages/TicketDetailView";
import NotFound from "./pages/NotFound";

import TeamSettingsPage from "./pages/TeamSettingsPage";
import BillingPage from "./pages/BillingPage"; 

import HeroSection from "./components/landing/HeroSection";
import FeatureSection from "./components/landing/FeatureSection";
import PricingSection from "./components/landing/PricingSection";
import ContactSection from "./components/landing/ContactSection";

const LandingPage = () => <div className="p-8 text-center"><h1>Welcome to LyzrFoundry!</h1><p>Please log in or sign up.</p></div>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2, // 2 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Routes>
            {/* --- Public Routes --- */}
            <Route element={<LandingLayout />}>
                <Route index element={<HeroSection />} />
                <Route path="features" element={<FeatureSection />} />
                <Route path="pricing" element={<PricingSection />} />
                <Route path="contact" element={<ContactSection />} />
                <Route path="login" element={<Login />} />
                <Route path="signup" element={<Signup />} />
            </Route>

            {/* --- Protected Application Routes --- */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <ActiveAgentProvider>
                    <AppLayout />
                  </ActiveAgentProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="agent-settings" element={<AgentDashboardPage />} /> 
              <Route path="tickets" element={<TicketsListPage />} />
              <Route path="tickets/:ticketId" element={<TicketDetailView />} />
              <Route path="team" element={<TeamSettingsPage />} />
              <Route path="billing" element={<BillingPage />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;