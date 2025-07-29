import apiClient from './apiClient';

// --- Authentication & User ---
export const loginUser = async (credentials) => {
  const response = await apiClient.post('/auth/login/', credentials);
  return response.data;
};
export const registerUser = async (userData) => {
  const response = await apiClient.post('/auth/register/', userData);
  return response.data;
};
export const fetchUserDetails = async () => {
  const response = await apiClient.get('/auth/me/');
  return response.data;
};
export const updateUserDetails = async (data) => {
  const response = await apiClient.patch('/auth/me/', data);
  return response.data;
};


// --- Agents ---
export const fetchAgents = async () => {
  const response = await apiClient.get('/agents/');
  return response.data; // FIX: Returns the { count, results, ... } object
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


// --- Tickets / Conversations ---
export const fetchTickets = async () => {
  const response = await apiClient.get('/tickets/');
  return response.data;
};
export const fetchTicketDetails = async (ticketId) => {
  const response = await apiClient.get(`/tickets/${ticketId}/`);
  return response.data;
};
export const updateTicketStatus = async (ticketId, status) => {
  const response = await apiClient.post(`/tickets/${ticketId}/update_status/`, { status });
  return response.data;
};
export const addTicketNote = async (ticketId, note) => {
  const response = await apiClient.post(`/tickets/${ticketId}/add_note/`, { note });
  return response.data;
};


// --- Dashboard & Public ---
export const fetchDashboardAnalytics = async () => {
  const response = await apiClient.get('/dashboard/analytics/');
  
  // Ensure fallback structure to avoid undefined issues
  return {
    data: {
      kpis: {
        total_conversations: 0,
        resolved_conversations: 0,
        active_conversations: 0,
        flagged_conversations: 0,
        resolution_rate: 0,
        avg_messages_per_conversation: 0,
        positive_feedback_rate: 0
      },
      chat_volume_trends: [],
      recent_tickets: [],
      ...response.data  // overwrite fallbacks if real data exists
    }
  };
};

export const fetchPublicAgentConfig = async (agentId) => {
  const response = await apiClient.get(`/public/agent-config/${agentId}/`);
  return response.data;
};

// --- NEW: Feedback ---
export const submitMessageFeedback = (messageId, feedback) => apiClient.post('/feedback/', { message_id: messageId, feedback });






// --- NEW: Team Management ---
export const fetchTeamMembers = () => {
  // Mocked response. The backend would fetch users belonging to the same team/organization.
  // We'll simulate this by returning the current user as the owner and a mock member.
  console.warn("API CALL: fetchTeamMembers() is mocked.");
  return Promise.resolve({
    data: [
      { id: '1a2b3c', full_name: 'Jane Doe (Admin)', email: 'jane.doe@example.com', role: 'Owner' },
      { id: '4d5e6f', full_name: 'John Smith', email: 'john.smith@example.com', role: 'Member' },
      { id: '7g8h9i', full_name: 'pending@example.com', email: 'pending@example.com', role: 'Pending' },
    ]
  });
};

export const inviteTeamMember = (email, role) => {
  // Mocked response. The backend would send an invite email.
  console.warn("API CALL: inviteTeamMember() is mocked.");
  return apiClient.post('/team/invite/', { email, role }); // This will likely fail, but shows intent
  // For demonstration, we'll return a success promise.
  // return Promise.resolve({
  //   data: { success: true, message: `Invitation sent to ${email}.` }
  // });
};

export const removeTeamMember = (memberId) => {
  // Mocked response. The backend would remove the user from the team.
  console.warn("API CALL: removeTeamMember() is mocked.");
  return apiClient.delete(`/team/members/${memberId}/`); // This will likely fail, but shows intent
  // For demonstration, we'll return a success promise.
  // return Promise.resolve({
  //   data: { success: true, message: `Member removed.` }
  // });
};

export const updateMemberRole = (memberId, role) => {
    // Mocked response.
    console.warn("API CALL: updateMemberRole() is mocked.");
    return apiClient.patch(`/team/members/${memberId}/`, { role });
};