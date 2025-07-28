// src/pages/Dashboard.jsx
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useNavigate } from 'react-router-dom';
import useActiveAgent from '@/contexts/Active-agent-context';

import OnboardingWizard from '@/components/OnboardingWizard';
import Sidebar from '@/components/Sidebar';
import AgentSettingsContent from '@/components/AgentSettingsContent';
import AgentPlayground from '@/components/AgentPlayground';
import AgentSelector from '@/components/AgentSelector';
import ChatWidget from '@/components/ChatWidget'; // The public widget can stay

const Dashboard = () => {
  const { user } = useAuth();
  const { setShowOnboarding } = useOnboarding();
  const navigate = useNavigate();
  const { activeAgent, agents, isLoadingAgents } = useActiveAgent();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Logic to trigger onboarding if user has no agents yet
    if (!isLoadingAgents && (!agents || agents.length === 0)) {
        setShowOnboarding(true);
    }
  }, [user, navigate, agents, isLoadingAgents, setShowOnboarding]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
            <div className="mb-6">
                <AgentSelector />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <AgentSettingsContent agent={activeAgent} />
                </div>
                <div>
                    <AgentPlayground agent={activeAgent} />
                </div>
            </div>
        </main>
      </div>
      <OnboardingWizard />
      {/* We can decide to show the real widget based on the active agent */}
      {activeAgent && <ChatWidget agentId={activeAgent.id} />}
    </div>
  );
};

export default Dashboard;