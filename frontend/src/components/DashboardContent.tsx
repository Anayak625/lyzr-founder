import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import KpiCard from '@/components/KpiCard';
import TrendsChart from '@/components/TrendsChart';
import FrequentQuestionsList from '@/components/FrequentQuestionsList';
import ImprovementSuggestions from '@/components/ImprovementSuggestions';
import UsageMeter from '@/components/UsageMeter';
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Clock,
  Sparkles
} from 'lucide-react';

const DashboardContent = () => {
  // Mock data - replace with actual API calls
  const kpis = [
    {
      title: 'Total Chats',
      value: '1,234',
      change: '+12%',
      trend: 'up' as const,
      icon: MessageSquare,
      description: 'conversations this month'
    },
    {
      title: 'Active Users',
      value: '892',
      change: '+8%',
      trend: 'up' as const,
      icon: Users,
      description: 'unique visitors chatting'
    },
    {
      title: 'Resolution Rate',
      value: '94%',
      change: '+3%',
      trend: 'up' as const,
      icon: TrendingUp,
      description: 'successfully resolved'
    },
    {
      title: 'Avg Response Time',
      value: '1.2s',
      change: '-0.3s',
      trend: 'up' as const,
      icon: Clock,
      description: 'lightning fast responses'
    }
  ];

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Your AI agent's performance overview
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          Last updated: Just now
        </div>
      </div>

      {/* Usage Meter */}
      <UsageMeter />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, index) => (
          <KpiCard key={index} {...kpi} />
        ))}
      </div>

      {/* Charts and Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trends Chart */}
        <Card className="col-span-1 lg:col-span-1 shadow-card border-0 bg-gradient-card backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Chat Volume Trends</CardTitle>
            <CardDescription>
              Daily conversations over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrendsChart />
          </CardContent>
        </Card>

        {/* Frequent Questions */}
        <Card className="shadow-card border-0 bg-gradient-card backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Most Frequent Questions</CardTitle>
            <CardDescription>
              Top customer inquiries this week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FrequentQuestionsList />
          </CardContent>
        </Card>
      </div>

      {/* Improvement Suggestions */}
      <Card className="shadow-card border-0 bg-gradient-card backdrop-blur-sm">
        <CardHeader>
          <CardTitle>AI Improvement Suggestions</CardTitle>
          <CardDescription>
            Based on customer feedback and interaction patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImprovementSuggestions />
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardContent;