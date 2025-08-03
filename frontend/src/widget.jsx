import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { fetchPublicAgentConfig } from './api';
import PublicWidget from './components/agent/PublicWidget'; 
import './index.css'; 

const queryClient = new QueryClient();

window.mountLyzrWidget = (container, agentId) => {
  if (container) {
    ReactDOM.createRoot(container).render(
      <React.StrictMode>
        <WidgetLoader agentId={agentId} />
      </React.StrictMode>
    );
  }
};

const WidgetLoader = ({ agentId }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <WidgetApp agentId={agentId} />
    </QueryClientProvider>
  );
};

const WidgetApp = ({ agentId }) => {
    const { data: agentConfig, isLoading, error } = useQuery({
        queryKey: ['publicAgentConfig', agentId],
        queryFn: () => fetchPublicAgentConfig(agentId).then(res => res.data),
    });

    if (isLoading) return null;
    if (error) {
        console.error("Lyzr Widget: Could not load agent config.");
        return null;
    }

    // Pass the fetched config and the original ID to the PublicWidget
    return <PublicWidget agentConfig={{ id: agentId, ...agentConfig }} />;
};

// Development-only mounting logic
if (import.meta.env.DEV) {
  const devRoot = document.getElementById('root');
  if (devRoot) {
    const urlParams = new URLSearchParams(window.location.search);
    const agentId = urlParams.get('agentId');
    if (agentId) {
        ReactDOM.createRoot(devRoot).render(
          <React.StrictMode>
            <WidgetLoader agentId={agentId} />
          </React.StrictMode>
        );
    } else {
        devRoot.innerHTML = `<div style="font-family: sans-serif; padding: 2rem;"><h2>Widget Development Mode</h2><p>To view the widget, append an agent ID to the URL.</p><p>Example: <code>?agentId=...</code></p></div>`;
    }
  }
}