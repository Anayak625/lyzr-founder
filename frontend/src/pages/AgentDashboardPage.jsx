import { useActiveAgent } from '@/contexts/ActiveAgentProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot } from 'lucide-react';
import AgentSettings from '@/components/agent/AgentSettings';
import AgentPlayground from '@/components/agent/AgentPlayground';
import AgentSelector from '@/components/agent/AgentSelector';
import WidgetPreview from '@/components/agent/WidgetPreview';
import { useState } from 'react';

const AgentDashboardPage = () => {
  const { activeAgent, isLoadingAgents, agents } = useActiveAgent();
  
  // Local state to manage form data for instant preview updates
  const [previewSettings, setPreviewSettings] = useState(null);

  // Loading state for the entire page
  if (isLoadingAgents) {
    return (
        <div className="space-y-8">
            <Skeleton className="h-10 w-full max-w-sm" />
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 items-start">
                <Skeleton className="lg:col-span-2 xl:col-span-1 h-[80vh]" />
                <Skeleton className="h-[80vh]" />
                <Skeleton className="h-[80vh] hidden xl:block" />
            </div>
        </div>
    );
  }

  // Empty state: No agents created yet
  if (!activeAgent && agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <div className="w-full max-w-lg bg-card p-8 rounded-lg shadow-lg border">
            <Bot className="mx-auto h-16 w-16 text-primary" />
            <h3 className="mt-4 text-2xl font-bold">Create Your First AI Agent</h3>
            <p className="mt-2 text-md text-muted-foreground">
              Give your agent a name to get started. It will be created with default instructions that you can customize at any time.
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
      <AgentSelector />
      
      <div className="gap-8 items-start">
        {/* Column 1: Agent Configuration and Knowledge Base */}
        <AgentSettings key={`settings-${activeAgent?.id}`} onSettingsChange={setPreviewSettings} />
        
        {/* Column 2: Real-time Testing Playground */}
        <AgentPlayground key={`playground-${activeAgent?.id}`} agent={activeAgent} />

        {/* Column 3: Live Widget Preview (only shows if we have settings to preview) */}
        {previewSettings && (
            <WidgetPreview key={`preview-${activeAgent?.id}`} settings={previewSettings} />
        )}
      </div>
    </div>
  );
};

export default AgentDashboardPage;