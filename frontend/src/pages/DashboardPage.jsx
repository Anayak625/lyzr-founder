import { useQuery } from '@tanstack/react-query';
import { fetchDashboardAnalytics } from '@/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { MessageSquare, CheckCircle, AlertTriangle, ArrowRight, CreditCard, Crown, Inbox } from 'lucide-react';

const KpiCard = ({ title, value, icon: Icon }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent><div className="text-2xl font-bold">{value ?? '—'}</div></CardContent>
  </Card>
);

const CurrentPlanCard = ({ subscription }) => {
    if (!subscription) return <Card><CardHeader><CardTitle>No Active Plan</CardTitle></CardHeader><CardContent><p>Please select a plan to continue.</p><Button asChild className="w-full mt-4"><Link to="/app/billing">View Plans</Link></Button></CardContent></Card>;

    return (
        <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Crown className="text-amber-500" /> Current Plan</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg text-center"><span className="text-xl font-bold text-primary">{subscription.plan.name}</span></div>
                <Button asChild className="w-full"><Link to="/app/billing">Manage Billing & Plans <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            </CardContent>
        </Card>
    );
};

const UsageCard = ({ subscription, usage }) => {
    const planLimits = subscription?.plan?.features || { messages: 0 };
    const totalMessagesUsed = usage?.reduce((acc, record) => acc + record.messages_count, 0) || 0;
    const messagesLimit = planLimits.messages || 1;
    const messagesPercentage = Math.min((totalMessagesUsed / messagesLimit) * 100, 100);

    return (
        <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard /> Monthly Usage</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-2">
                <div>
                    <div className="flex justify-between items-baseline mb-1">
                        <span className="text-sm font-medium">Messages</span>
                        <span className="text-sm text-muted-foreground">{totalMessagesUsed.toLocaleString()} / {(planLimits.messages || 0).toLocaleString()}</span>
                    </div>
                    <Progress value={messagesPercentage} />
                </div>
            </CardContent>
        </Card>
    );
};

const DashboardPage = () => {
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['dashboardAnalytics'],
    queryFn: fetchDashboardAnalytics,
  });

  if (isLoading) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
            <div className="grid gap-6 lg:grid-cols-3"><Skeleton className="h-96 lg:col-span-2" /><Skeleton className="h-96" /></div>
        </div>
    );
  }

  if (error) return <div className="p-4 bg-destructive/10 border-destructive rounded-md">Could not load dashboard analytics.</div>;

  const kpis = analytics.kpis || {};
  const chartData = (analytics.chat_volume_trends || []).map(item => ({...item, date: format(new Date(item.date), 'MMM d')}));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Conversations" value={kpis.total_conversations} icon={MessageSquare} />
        <KpiCard title="Open Tickets" value={kpis.open_tickets} icon={Inbox} />
        <KpiCard title="Tickets Solved (30d)" value={kpis.tickets_solved_last_30_days} icon={CheckCircle} />
        <KpiCard title="Positive Feedback" value={`${(kpis.positive_feedback_rate || 0).toFixed(1)}%`} icon={AlertTriangle} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Chat Volume Trends</CardTitle><CardDescription>Conversations over the last 30 days.</CardDescription></CardHeader>
          <CardContent className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} /><YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} /><Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}/><Bar dataKey="count" name="Conversations" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent>
        </Card>
        <div className="space-y-6">
            <CurrentPlanCard subscription={analytics.subscription} />
            {analytics.subscription && <UsageCard subscription={analytics.subscription} usage={analytics.usage_analytics} />}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;