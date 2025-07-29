import { useQuery } from '@tanstack/react-query';
import { fetchDashboardAnalytics } from '@/api';
import { Skeleton } from '@/components/ui/skeleton';
import KpiCard from './KpiCard';
import { MessageSquare, CheckCircle, AlertTriangle, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';

const DashboardAnalytics = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardAnalytics'],
    queryFn: fetchDashboardAnalytics,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-destructive/10 text-destructive border border-destructive rounded-md">Could not load dashboard analytics. Please try again later.</div>;
  }

  const kpis = data?.kpis || {};
  const resolutionRate = kpis.resolution_rate;
  const chartData = Array.isArray(data?.chat_volume_trends)
    ? data.chat_volume_trends.map(item => ({
        ...item,
        date: format(new Date(item.date), 'MMM d'),
      }))
    : [];

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Total Conversations" value={kpis.total_conversations ?? '—'} icon={MessageSquare} />
            <KpiCard title="Resolved Conversations" value={kpis.resolved_conversations ?? '—'} icon={CheckCircle} />
            <KpiCard title="Flagged for Review" value={kpis.flagged_conversations ?? '—'} icon={AlertTriangle} />
            <KpiCard
                title="Resolution Rate"
                value={typeof resolutionRate === 'number' ? `${resolutionRate.toFixed(1)}%` : '—'}
                icon={Percent}
            />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Chat Volume Trends</CardTitle>
                <CardDescription>Conversations over the last 30 days</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false}/>
                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{
                                background: "hsl(var(--card))",
                                borderColor: "hsl(var(--border))",
                                borderRadius: "var(--radius)"
                            }}
                        />
                        <Bar dataKey="count" name="Conversations" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                 </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Recently Flagged Questions</CardTitle>
                <CardDescription>Top subjects from tickets needing review</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(data?.recent_tickets?.length ?? 0) > 0 ? (
                    data.recent_tickets.map(ticket => (
                        <div key={ticket.id} className="text-sm p-3 bg-muted rounded-md transition-colors hover:bg-muted/80">{ticket.subject}</div>
                    ))
                ) : (
                    <p className="text-sm text-center py-8 text-muted-foreground">No recently flagged tickets.</p>
                )}
              </CardContent>
            </Card>
        </div>
    </div>
  );
};

export default DashboardAnalytics;