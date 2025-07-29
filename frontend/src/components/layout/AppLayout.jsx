import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import ApiHealthBanner from './ApiHealthBanner';
import { useAuth } from '@/contexts/AuthProvider';

const AppLayout = () => {
  const { user, isLoading } = useAuth();
  
  const needsOnboarding = !isLoading && user && !user.onboarding_completed;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 flex flex-col h-screen">
            <ApiHealthBanner />
            <div className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1">
                <Outlet />
            </div>
        </main>
      </div>
      {needsOnboarding && <OnboardingWizard />}
    </div>
  );
};

export default AppLayout;