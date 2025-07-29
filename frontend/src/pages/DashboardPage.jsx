import { useQuery } from '@tanstack/react-query';
import { fetchDashboardAnalytics } from '@/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { MessageSquare, CheckCircle, AlertTriangle, Percent, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Utility to display "—" if value is null or undefined
const displayValue = (val) => (val === null || val === undefined ? '—' : val);

// Reusable KPI Card Component
const KpiCard = ({ title, value, icon: Icon }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const DashboardPage = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardAnalytics'],
    queryFn: fetchDashboardAnalytics,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-80 lg:col-span-3" />
          <Skeleton className="h-80 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive border border-destructive rounded-md">
        Could not load dashboard analytics. Please try again later.
      </div>
    );
  }

  const kpis = data?.data.kpis || {};
  const recentTickets = data?.data.recent_tickets || [];
  const chartData = (data?.data.chat_volume_trends || []).map(item => ({
    ...item,
    date: format(new Date(item.date), 'MMM d'),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Conversations" value={displayValue(kpis.total_conversations)} icon={MessageSquare} />
        <KpiCard title="Resolved Conversations" value={displayValue(kpis.resolved_conversations)} icon={CheckCircle} />
        <KpiCard title="Flagged for Review" value={displayValue(kpis.flagged_conversations)} icon={AlertTriangle} />
        <KpiCard title="Resolution Rate" value={`${(kpis.resolution_rate ?? 0).toFixed(1)}%`} icon={Percent} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Chat Volume Trends */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Chat Volume Trends</CardTitle>
            <CardDescription>Conversations over the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                  />
                  <Bar dataKey="count" name="Conversations" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No chat volume data to display.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recently Flagged Tickets */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recently Flagged for Review</CardTitle>
            <CardDescription>Conversations needing your attention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTickets.length > 0 ? (
              recentTickets.map(ticket => (
                <Link
                  to={`/app/tickets/${ticket.id}`}
                  key={ticket.id}
                  className="block p-3 bg-muted rounded-md transition-colors hover:bg-muted/80"
                >
                  <p className="text-sm font-medium truncate">{ticket.subject}</p>
                  <p className="text-xs text-muted-foreground">Customer: {ticket.customer}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-center py-8 text-muted-foreground">No recently flagged tickets. Great job!</p>
            )}
            {recentTickets.length > 0 && (
              <Button variant="outline" asChild className="w-full">
                <Link to="/app/tickets">
                  View All Tickets <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
