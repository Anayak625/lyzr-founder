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

  return <PublicWidget agentConfig={{ id: agentId, ...agentConfig }} />;
};


if (!import.meta.env.DEV) {
    const findScriptTag = () => {
        const scripts = document.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
            if (scripts[i].src && scripts[i].src.includes('widget.js')) {
                return scripts[i];
            }
        }
        return null;
    };
    
    const currentScriptTag = findScriptTag();

    if (currentScriptTag) {
        const agentId = currentScriptTag.getAttribute('data-agent-id');

        if (agentId) {
            // Create a container div for the widget dynamically
            const widgetContainer = document.createElement('div');
            widgetContainer.id = `lyzr-widget-container-${agentId}`;
            document.body.appendChild(widgetContainer);

            // Now, call the mount function we defined above
            window.mountLyzrWidget(widgetContainer, agentId);
        } else {
            console.error('Lyzr Widget: The "data-agent-id" attribute is missing from the script tag.');
        }
    } else {
        console.error('Lyzr Widget: Could not find its own script tag.');
    }
}


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