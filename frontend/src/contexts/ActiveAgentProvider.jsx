import { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAgents } from '@/api';

const ActiveAgentContext = createContext(undefined);

export const useActiveAgent = () => {
  const context = useContext(ActiveAgentContext);
  if (!context) throw new Error('useActiveAgent must be used within an ActiveAgentProvider');
  return context;
};

export const ActiveAgentProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [activeAgentId, setActiveAgentId] = useState(null);

  const { data: agentsData, isLoading: isLoadingAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
  });

  const agentList = agentsData?.results || [];
  const activeAgent = agentList.find(a => a.id === activeAgentId) || null;

  // This effect ensures a smooth experience by automatically selecting an agent.
  useEffect(() => {
    // Don't do anything while loading
    if (isLoadingAgents) return;

    // If we have agents but no active one is selected OR the selected one was deleted
    if (agentList.length > 0) {
      const currentAgentExists = agentList.some(a => a.id === activeAgentId);
      if (!activeAgentId || !currentAgentExists) {
        // Select the first agent in the list
        setActiveAgentId(agentList[0].id);
      }
    } else if (agentList.length === 0) {
      // If there are no agents, clear the active selection
      setActiveAgentId(null);
    }
  }, [agentList, isLoadingAgents, activeAgentId]);

  const value = {
    agents: agentList,
    isLoadingAgents,
    activeAgent,
    setActiveAgentId,
  };

  return (
    <ActiveAgentContext.Provider value={value}>
      {children}
    </ActiveAgentContext.Provider>
  );
};