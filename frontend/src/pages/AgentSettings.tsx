import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import AgentSettingsContent from '@/components/AgentSettingsContent';

const AgentSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          <AgentSettingsContent />
        </main>
      </div>
    </div>
  );
};

export default AgentSettings;