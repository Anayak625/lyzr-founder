import { useActiveAgent } from '@/contexts/ActiveAgentProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, Settings, MessageSquare } from 'lucide-react';
import AgentSettings from '@/components/agent/AgentSettings';
import AgentPlayground from '@/components/agent/AgentPlayground';
import AgentSelector from '@/components/agent/AgentSelector';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

// The Dashboard View Component
const DashboardView = ({ agent, previewSettings }) => (
    <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 items-start">
        <AgentPlayground 
            key={`playground-${agent?.id}`} 
            agent={agent} 
            initialExpanded={true}
        />
    </div>
);

// The Settings View Component
const SettingsView = ({ agent, onSettingsChange }) => (
    <div className="mx-auto">
        <AgentSettings 
            key={`settings-${agent?.id}`} 
            onSettingsChange={onSettingsChange} 
        />
    </div>
);


const AgentDashboardPage = () => {
  const { view, agentId } = useParams(); 
  const navigate = useNavigate();
  const { activeAgent, setActiveAgentId, isLoadingAgents, agents } = useActiveAgent();
  
  const [previewSettings, setPreviewSettings] = useState(null);

  useEffect(() => {
    if (agentId) {
      setActiveAgentId(agentId);
    }
  }, [agentId, setActiveAgentId]);

  useEffect(() => {
    if (activeAgent?.widget_settings) {
        setPreviewSettings(activeAgent.widget_settings);
    }
  }, [activeAgent]);

  // Loading State
  if (isLoadingAgents || (agentId && !activeAgent)) {
    return (
        <div className="space-y-8">
            <Skeleton className="h-10 w-full max-w-sm" />
            <Skeleton className="h-12 w-48" />
            <Skeleton className="h-[80vh] w-full" />
        </div>
    );
  }

  // Empty State: No agents created yet
  if (!activeAgent && agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <div className="w-full max-w-lg bg-card p-8 rounded-lg shadow-lg border">
            <Bot className="mx-auto h-16 w-16 text-primary" />
            <h3 className="mt-4 text-2xl font-bold">Create Your First AI Agent</h3>
            <p className="mt-2 text-md text-muted-foreground">
              Give your agent a name to get started. You can customize it at any time.
            </p>
            <div className="mt-8 w-full max-w-sm mx-auto">
              <AgentSelector />
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <AgentSelector />
        {view === 'dashboard' ? (
            <Button variant="outline" onClick={() => navigate(`/app/agent/${activeAgent.id}/settings`)}>
                <Settings className="mr-2 h-4 w-4" />
                Configure Agent
            </Button>
        ) : (
            <Button variant="outline" onClick={() => navigate(`/app/agent/${activeAgent.id}/dashboard`)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Button>
        )}
      </div>

      {view === 'dashboard' && activeAgent &&
        <DashboardView agent={activeAgent} previewSettings={previewSettings} />
      }
      {view === 'settings' && activeAgent &&
        <SettingsView agent={activeAgent} onSettingsChange={setPreviewSettings} />
      }
    </div>
  );
};

export default AgentDashboardPage;