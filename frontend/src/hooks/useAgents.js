import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchAgents, 
  createAgent as apiCreateAgent, 
  updateAgent as apiUpdateAgent, 
  deleteAgent as apiDeleteAgent,
  addKnowledgeSource as apiAddKnowledgeSource, 
  deleteKnowledgeSource as apiDeleteKnowledgeSource 
} from '@/api';

const useAgents = () => {
  const queryClient = useQueryClient();

  const { data: agentsData, isLoading, error } = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
  });

  const createAgentMutation = useMutation({
    mutationFn: apiCreateAgent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });

  const updateAgentMutation = useMutation({
    mutationFn: ({ agentId, data }) => apiUpdateAgent(agentId, data),
    onSuccess: (updatedAgent) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.setQueryData(['agent', updatedAgent.id], updatedAgent);
    },
  });

  const deleteAgentMutation = useMutation({
    mutationFn: apiDeleteAgent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });

  const addKnowledgeSourceMutation = useMutation({
    mutationFn: ({ agentId, sourceData }) => apiAddKnowledgeSource(agentId, sourceData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });

  const deleteKnowledgeSourceMutation = useMutation({
    mutationFn: ({ agentId, sourceId }) => apiDeleteKnowledgeSource(agentId, sourceId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });

  return {
    agents: agentsData?.results || [],
    isLoading,
    error,
    createAgent: createAgentMutation.mutateAsync,
    updateAgent: updateAgentMutation.mutateAsync,
    deleteAgent: deleteAgentMutation.mutateAsync,
    addKnowledgeSource: addKnowledgeSourceMutation.mutateAsync,
    deleteKnowledgeSource: deleteKnowledgeSourceMutation.mutateAsync,
  };
};

export default useAgents;