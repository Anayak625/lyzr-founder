import { useEffect, useState } from 'react';
import { fetchPublicAgentConfig } from '@/api';
import AgentPlayground from '@/components/agent/AgentPlayground';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const WidgetApp = ({ agentId }) => {
    const [agentConfig, setAgentConfig] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!agentId) return;
        
        const loadConfig = async () => {
            try {
                setIsLoading(true);
                const config = await fetchPublicAgentConfig(agentId);
                setAgentConfig({
                    id: agentId,
                    name: config.name,
                    widget_settings: config.widget_settings,
                });
            } catch (err) {
                console.error("Failed to load agent config:", err);
                setError("Could not load agent configuration.");
            } finally {
                setIsLoading(false);
            }
        };

        loadConfig();
    }, [agentId]);

    if (isLoading) return <Skeleton className="w-full h-full" />;
    if (error) return <div className="p-4 text-red-600">{error}</div>;

    return (
        <QueryClientProvider client={queryClient}>
            <div className="h-screen w-screen bg-background">
                {agentConfig && <AgentPlayground agent={agentConfig} initialExpanded={false} />}
            </div>
        </QueryClientProvider>
    );
};

export default WidgetApp;