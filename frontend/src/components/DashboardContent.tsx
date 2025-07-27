// src/components/DashboardContent.jsx
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import KpiCard from '@/components/KpiCard';
import { MessageSquare, Users, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const fetchDashboardData = async () => {
  const { data } = await apiClient.get('/dashboard/');
  return data;
};

const DashboardContent = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: fetchDashboardData,
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-1/4 mb-4" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="grid gap-6 mt-6 lg:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
        <div className="flex items-center justify-center h-full p-8">
            <div className="text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-destructive"/>
                <h2 className="mt-4 text-lg font-medium">Could not load dashboard</h2>
                <p className="text-sm text-muted-foreground">{error.response?.data?.error || error.message}</p>
            </div>
        </div>
    );
  }

  const kpis = [
    { title: 'Total Chats', value: data.kpis.total_chats, icon: MessageSquare },
    { title: 'Resolution Rate', value: `${data.kpis.resolution_rate}%`, icon: CheckCircle },
    { title: 'Flagged Tickets', value: data.kpis.flagged_tickets, icon: AlertTriangle },
    { title: 'Active Users', value: 'N/A', icon: Users }, // Assuming this isn't from the backend yet
  ];

  return (
    <div className="flex-1 space-y-6 p-8">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard change={''} trend={'up'} key={kpi.title} {...kpi} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Chat Volume Trends</CardTitle>
            <CardDescription>Conversations over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
             {/* Chart component can be built here using data.chat_volume_trends */}
             <p className="text-sm text-muted-foreground">Chart UI to be implemented.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Frequent Questions</CardTitle>
            <CardDescription>Top subjects from flagged tickets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.frequent_questions.length > 0 ? (
                data.frequent_questions.map(q => (
                    <div key={q.id} className="text-sm p-2 bg-muted rounded-md">{q.subject}</div>
                ))
            ) : (
                <p className="text-sm text-muted-foreground">No flagged questions yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardContent;