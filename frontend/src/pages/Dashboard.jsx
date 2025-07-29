import AgentSettings from '@/components/agent/AgentSettings';
import DashboardAnalytics from '@/components/dashboard/DashboardAnalytics';

const Dashboard = () => {
  // This component can now decide what to show based on context or URL params if needed.
  // For now, let's show the analytics dashboard and the agent settings side-by-side.
  return (
    <div className="space-y-8">
      <DashboardAnalytics />
    </div>
  );
};

export default Dashboard;