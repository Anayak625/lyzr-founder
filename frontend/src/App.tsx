import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";

// Import Layouts
import LandingLayout from "./layouts/LandingLayout";

// Import Pages
import HeroSection from "./components/landing/HeroSection";
import FeatureSection from "./components/landing/FeatureSection";
import PricingSection from "./components/landing/PricingSection";
import ContactSection from "./components/landing/ContactSection";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import AgentSettings from "./pages/AgentSettings";
import Tickets from "./pages/Tickets";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <OnboardingProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingLayout />}>
                <Route index element={<HeroSection />} />
                <Route path="features" element={<FeatureSection />} />
                <Route path="pricing" element={<PricingSection />} />
                <Route path="contact" element={<ContactSection />} />
                <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              </Route>

              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/agent-settings" element={<AgentSettings />} />
              <Route path="/tickets" element={<Tickets />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </OnboardingProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;