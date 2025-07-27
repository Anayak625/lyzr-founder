import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useNavigate } from 'react-router-dom';
import OnboardingWizard from '@/components/OnboardingWizard';
import Sidebar from '@/components/Sidebar';
import DashboardContent from '@/components/DashboardContent';
import ChatWidget from '@/components/ChatWidget';

const Dashboard = () => {
  const { user } = useAuth();
  const { setShowOnboarding } = useOnboarding();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Check if user should see onboarding
    const onboardingCompleted = localStorage.getItem('lyzr_onboarding_completed');
    if (!onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [user, navigate, setShowOnboarding]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          <DashboardContent />
        </main>
      </div>
      <OnboardingWizard />
      <ChatWidget />
    </div>
  );
};

export default Dashboard;