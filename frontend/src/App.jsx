import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthProvider";
import { ActiveAgentProvider, useActiveAgent } from "./contexts/ActiveAgentProvider";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Layouts
import LandingLayout from "./components/layout/LandingLayout";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";

// Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AgentDashboardPage from "./pages/AgentDashboardPage"; // <-- IMPORT THIS
import DashboardPage from "./pages/DashboardPage";
import TicketsListPage from "./pages/TicketsListPage";
import TicketDetailView from "./pages/TicketDetailView";
import NotFound from "./pages/NotFound";
import TeamSettingsPage from "./pages/TeamSettingsPage";
import BillingPage from "./pages/BillingPage"; 

// Landing Page Sections
import HeroSection from "./components/landing/HeroSection";
import FeatureSection from "./components/landing/FeatureSection";
import PricingSection from "./components/landing/PricingSection";
import ContactSection from "./components/landing/ContactSection";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2, // 2 minutes
    },
  },
});

/**
 * FIXED HELPER COMPONENT
 * This component now handles all three states: loading, agents exist, and no agents exist.
 */
const AgentRedirector = () => {
    // Get the full list of agents and the loading status
    const { activeAgent, agents, isLoadingAgents } = useActiveAgent();
    const navigate = useNavigate();

    useEffect(() => {
        // This effect ONLY handles the success case where an agent exists.
        if (!isLoadingAgents && activeAgent) {
            navigate(`/app/agent/${activeAgent.id}/dashboard`, { replace: true });
        }
    }, [activeAgent, isLoadingAgents, navigate]);

    // --- THE FIX ---
    // If loading is finished and the agent list is empty, render the dashboard page.
    // The dashboard page itself knows how to display the "Create your first agent" message.
    if (!isLoadingAgents && agents && agents.length === 0) {
        return <AgentDashboardPage />;
    }

    // If we are still loading or waiting for the redirect effect, show the loading message.
    return <div>Loading Agent...</div>; 
};


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
              
              {/* --- AGENT ROUTING --- */}
              <Route path="agent/:agentId/:view" element={<AgentDashboardPage />} />
              <Route path="agent" element={<AgentRedirector />} />
              <Route path="agent/:agentId" element={<Navigate to="dashboard" replace />} />

              {/* Other application routes */}
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