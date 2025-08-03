import apiClient from './apiClient';
import widgetApiClient from './widgetApiClient';

export const fetchPublicAgentConfig = (agentId) => {
    return widgetApiClient.get(`/public/agent-config/${agentId}/`);
};

// --- Authentication & User ---
export const loginUser = (credentials) => apiClient.post('/auth/login/', credentials);
export const registerUser = (userData) => apiClient.post('/auth/register/', userData);
export const verifyOTP = (data) => apiClient.post('/auth/verify-otp/', data);
export const fetchUserDetails = () => apiClient.get('/auth/me/');
export const updateUserDetails = (data) => apiClient.patch('/auth/me/', data);


// --- Agents ---
export const fetchAgents = async () => {
  const response = await apiClient.get('/agents/');
  return response.data; 
};
export const fetchAgentDetails = async (agentId) => {
  const response = await apiClient.get(`/agents/${agentId}/`);
  return response.data;
};
export const createAgent = async (agentData) => {
  const response = await apiClient.post('/agents/', agentData);
  return response.data;
};
export const updateAgent = async (agentId, agentData) => {
  const response = await apiClient.put(`/agents/${agentId}/`, agentData);
  return response.data;
};
export const partialUpdateAgent = async (agentId, agentData) => {
  const response = await apiClient.patch(`/agents/${agentId}/`, agentData);
  return response.data;
};
export const deleteAgent = async (agentId) => {
  const response = await apiClient.delete(`/agents/${agentId}/`);
  return response.data;
};
export const fetchAgentStatus = async (agentId) => {
    const response = await apiClient.get(`/agents/${agentId}/status/`);
    return response.data;
};


// --- Knowledge Sources ---
export const fetchKnowledgeSources = async (agentId) => {
  const response = await apiClient.get(`/agents/${agentId}/knowledge-sources/`);
  return response.data;
};
export const addKnowledgeSource = async (agentId, sourceData) => {
  const isFileUpload = sourceData instanceof FormData;
  const response = await apiClient.post(`/agents/${agentId}/knowledge-sources/`, sourceData, {
    headers: { 'Content-Type': isFileUpload ? 'multipart/form-data' : 'application/json' },
  });
  return response.data;
};
export const deleteKnowledgeSource = async (agentId, sourceId) => {
  const response = await apiClient.delete(`/agents/${agentId}/knowledge-sources/${sourceId}/`);
  return response.data;
};


// --- Dashboard & Public ---
export const fetchDashboardAnalytics = async () => {
  const response = await apiClient.get('/dashboard/analytics/');
  return response.data;
}

// --- Billing ---
export const fetchPlans = async () => {
  const response = await apiClient.get('/billing/plans/');
  return response.data;
};

export const fetchSubscription = async () => {
    const response = await apiClient.get('/billing/subscription/');
    return response.data;
};

export const createSubscription = async (planId) => {
  const response = await apiClient.post('/billing/subscription/', { plan_id: planId });
  return response.data;
};


// --- Tickets ---
export const createTicket = async (ticketData) => {
  const response = await apiClient.post('/tickets/', ticketData);
  return response.data;
};
export const fetchTickets = async () => {
  const response = await apiClient.get('/tickets/');
  return response.data;
};
export const fetchTicketDetails = async (ticketId) => {
  const response = await apiClient.get(`/tickets/${ticketId}/`);
  return response.data;
};
export const updateTicketStatus = (ticketId, status) => apiClient.post(`/tickets/${ticketId}/update-status/`, { status });
export const updateTicketPriority = (ticketId, priority) => apiClient.post(`/tickets/${ticketId}/update-priority/`, { priority });
export const assignTicket = (ticketId, assignmentData) => apiClient.post(`/tickets/${ticketId}/assign/`, assignmentData);
export const addTicketNote = (ticketId, noteData) => apiClient.post(`/tickets/${ticketId}/add-note/`, noteData);

// --- Teams & Invitations ---
export const fetchMyTeams = async () => {
    const response = await apiClient.get('/teams/');
    return response.data;
};
export const fetchTeamDetails = async (teamId) => {
    const response = await apiClient.get(`/teams/${teamId}/`);
    return response.data;
};
export const createTeam = async (teamData) => {
    const response = await apiClient.post('/teams/', teamData);
    return response.data;
};
export const inviteTeamMember = (teamId, inviteData) => apiClient.post(`/teams/${teamId}/invite/`, inviteData);
export const removeTeamMember = (teamId, memberId) => apiClient.post(`/teams/${teamId}/remove-member/${memberId}/`);
export const updateMemberRole = (teamId, memberId, roleData) => apiClient.post(`/teams/${teamId}/update-member-role/${memberId}/`, roleData);
export const fetchInvitations = async () => {
    const response = await apiClient.get('/invitations/');
    return response.data;
};
export const acceptInvitation = (invitationId) => apiClient.post(`/invitations/${invitationId}/accept/`);
export const declineInvitation = (invitationId) => apiClient.post(`/invitations/${invitationId}/decline/`);


// --- Conversations ---
export const fetchConversations = async () => {
    const response = await apiClient.get('/conversations/');
    return response.data;
};

export const fetchConversationDetails = async (conversationId) => {
    const response = await apiClient.get(`/conversations/${conversationId}/`);
    return response.data;
};