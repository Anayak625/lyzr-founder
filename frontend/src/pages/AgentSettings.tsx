// src/pages/AgentSettings.jsx
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import AgentSettingsContent from '@/components/AgentSettingsContent';

// This page can be a simple wrapper or be deprecated.
// For now, it will just show a message.
const AgentSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
        // Redirect to the new dashboard-centric view
        navigate('/dashboard');
    }
  }, [user, navigate]);

  return null; // Or a loading spinner
};

export default AgentSettings;