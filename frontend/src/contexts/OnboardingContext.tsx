import React, { createContext, useContext, useState } from 'react';

interface OnboardingContextType {
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
  completeOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);

  const completeOnboarding = () => {
    setShowOnboarding(false);
    setOnboardingStep(1);
    localStorage.setItem('lyzr_onboarding_completed', 'true');
  };

  return (
    <OnboardingContext.Provider 
      value={{ 
        showOnboarding, 
        setShowOnboarding, 
        onboardingStep, 
        setOnboardingStep, 
        completeOnboarding 
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};