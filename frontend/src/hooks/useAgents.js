import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/apiClient';

// --- API Functions for Agents ---
const fetchAgents = async () => {
  const { data } = await apiClient.get('/agents/');
  return data;
};

const createAgent = async (agentData) => {
  const { data } = await apiClient.post('/agents/', agentData);
  return data;
};

const updateAgent = async (agentData) => {
  const { data } = await apiClient.put(`/agents/${agentData.id}/`, agentData);
  return data;
};

// --- API Functions for Knowledge Sources ---
const addKnowledgeSource = async ({ agentId, sourceData }) => {
  const isFileUpload = sourceData instanceof FormData;
  const { data } = await apiClient.post(`/agents/${agentId}/knowledge/`, sourceData, {
    headers: { 'Content-Type': isFileUpload ? 'multipart/form-data' : 'application/json' },
  });
  return data;
};

const deleteKnowledgeSource = async ({ agentId, sourceId }) => {
  await apiClient.delete(`/agents/${agentId}/knowledge/${sourceId}/`);
  return sourceId;
};

// --- Main Hook ---
const useAgents = () => {
  const queryClient = useQueryClient();

  // Query to get all agents for the user
  const { data: agents, isLoading, error } = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
  });

  // Mutation to create a new agent
  const createAgentMutation = useMutation({
    mutationFn: createAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  // Mutation to update an existing agent
  const updateAgentMutation = useMutation({
    mutationFn: updateAgent,
    onSuccess: (updatedAgent) => {
      // Invalidate the list and also update the specific agent's cache
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.setQueryData(['agent', updatedAgent.id], updatedAgent);
    },
  });

  // Mutation to add a knowledge source
  const addKnowledgeSourceMutation = useMutation({
    mutationFn: addKnowledgeSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  // Mutation to delete a knowledge source
  const deleteKnowledgeSourceMutation = useMutation({
    mutationFn: deleteKnowledgeSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  return {
    agents,
    isLoading,
    error,
    createAgent: createAgentMutation.mutateAsync,
    updateAgent: updateAgentMutation.mutateAsync,
    addKnowledgeSource: addKnowledgeSourceMutation.mutateAsync,
    deleteKnowledgeSource: deleteKnowledgeSourceMutation.mutateAsync,
  };
};

export default useAgents;