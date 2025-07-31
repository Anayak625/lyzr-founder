import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './WidgetApp';
import './index.css'; 

window.mountLyzrWidget = (container, agentId) => {
  if (container) {
    ReactDOM.createRoot(container).render(
      <React.StrictMode>
        <App agentId={agentId} />
      </React.StrictMode>
    );
  }
};

if (import.meta.env.DEV) {
  const devRoot = document.getElementById('root');
  if (devRoot) {
    const urlParams = new URLSearchParams(window.location.search);
    const agentId = urlParams.get('agentId') || 'dev-agent-123';

    ReactDOM.createRoot(devRoot).render(
      <React.StrictMode>
        <App agentId={agentId} />
      </React.StrictMode>
    );
  }
}