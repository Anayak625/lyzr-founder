// src/contexts/Active-agent-context.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAgents } from '@/hooks/useAgents'; // We will create this hook next

const ActiveAgentContext = createContext(undefined);

export const useActiveAgent = () => {
  const context = useContext(ActiveAgentContext);
  if (context === undefined) {
    throw new Error('useActiveAgent must be used within an ActiveAgentProvider');
  }
  return context;
};

export const ActiveAgentProvider = ({ children }) => {
  const { agents, isLoading } = useAgents();
  const [activeAgent, setActiveAgent] = useState(null);

  useEffect(() => {
    // When the list of agents loads, set the first one as active by default.
    if (!isLoading && agents && agents.length > 0 && !activeAgent) {
      setActiveAgent(agents[0]);
    }
    // If the active agent gets deleted, reset it
    if (activeAgent && agents && !agents.find(a => a.id === activeAgent.id)) {
        setActiveAgent(agents.length > 0 ? agents[0] : null);
    }
  }, [agents, isLoading, activeAgent]);

  const value = {
    activeAgent,
    setActiveAgent,
    agents,
    isLoadingAgents: isLoading,
  };

  return (
    <ActiveAgentContext.Provider value={value}>
      {children}
    </ActiveAgentContext.Provider>
  );
};