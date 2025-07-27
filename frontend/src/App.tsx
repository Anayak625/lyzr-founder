// src/App.jsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext.js";
import { OnboardingProvider } from "./contexts/OnboardingContext.js";
import {ActiveAgentProvider} from "./contexts/Active-agent-context.js";

// Import Layouts
import LandingLayout from "./layouts/LandingLayout.js";

// Import Pages
import HeroSection from "./components/landing/HeroSection.js";
import FeatureSection from "./components/landing/FeatureSection.js";
import PricingSection from "./components/landing/PricingSection.js";
import ContactSection from "./components/landing/ContactSection.js";

import Login from "./pages/Login.js";
import Signup from "./pages/Signup.js";
import Dashboard from "./pages/Dashboard.js";
import Tickets from "./pages/Tickets.js";
import NotFound from "./pages/NotFound.js";
import AgentSettings from "./pages/AgentSettings.js"; // Keep this route for now

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <OnboardingProvider>
          <ActiveAgentProvider> {/* Wrap routes with the new provider */}
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<LandingLayout />}>
                  <Route index element={<HeroSection />} />
                  <Route path="features" element={<FeatureSection />} />
                  <Route path="pricing" element={<PricingSection />} />
                  <Route path="contact" element={<ContactSection />} />
                </Route>
                
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                {/* Main app routes */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/agent-settings" element={<AgentSettings />} />
                <Route path="/tickets" element={<Tickets />} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ActiveAgentProvider>
        </OnboardingProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;