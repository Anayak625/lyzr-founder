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

  useEffect(() => {
    if (isLoadingAgents) return;
    if (agentList.length > 0) {
      const currentAgentExists = agentList.some(a => a.id === activeAgentId);
      if (!activeAgentId || !currentAgentExists) {
        setActiveAgentId(agentList[0].id);
      }
    } else if (agentList.length === 0) {
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