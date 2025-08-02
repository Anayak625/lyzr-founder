// src/pages/DashboardPage.jsx

import { useQuery } from '@tanstack/react-query';
import { fetchDashboardAnalytics } from '@/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { MessageSquare, CheckCircle, AlertTriangle, Percent, ArrowRight, CreditCard, Crown } from 'lucide-react';

// Helper to handle potentially null values
const displayValue = (val) => (val === null || val === undefined ? '—' : val);

// --- Reusable KPI Card from before ---
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

// --- NEW: Current Plan Card ---
const CurrentPlanCard = ({ subscription }) => {
    const planName = subscription?.plan?.name || 'Free';
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Crown className="text-amber-500" /> Current Plan
                </CardTitle>
                <CardDescription>Your current subscription level.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center bg-muted p-4 rounded-lg">
                    <span className="text-lg font-bold text-primary">{planName}</span>
                    {subscription && <span className="font-bold">${subscription.plan.price}/mo</span>}
                </div>
                <Button asChild className="w-full">
                    <Link to="/app/billing">
                        Manage Billing & Upgrade <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
};

// --- NEW: Usage Analytics Card ---
const UsageCard = ({ subscription, usage }) => {
    // Default to free plan limits if no subscription is found
    const planLimits = subscription?.plan?.features || { messages: 500 }; 
    
    // Sum up usage from all returned records (e.g., last 30 days)
    const totalMessagesUsed = usage?.reduce((acc, record) => acc + record.messages_count, 0) || 0;
    
    const messagesLimit = planLimits.messages || 500;
    const messagesPercentage = Math.min((totalMessagesUsed / messagesLimit) * 100, 100);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><CreditCard /> Monthly Usage</CardTitle>
                <CardDescription>Your consumption for the current cycle.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
                <div>
                    <div className="flex justify-between items-baseline mb-1">
                        <span className="text-sm font-medium">Messages Used</span>
                        <span className="text-sm text-muted-foreground">
                            {totalMessagesUsed.toLocaleString()} / {messagesLimit.toLocaleString()}
                        </span>
                    </div>
                    <Progress value={messagesPercentage} />
                </div>
                {/* Future usage metrics like 'Agents Used' can be added here */}
            </CardContent>
        </Card>
    )
};


// --- Main Dashboard Page Component ---
const DashboardPage = () => {
  const { data: apiData, isLoading, error } = useQuery({
    queryKey: ['dashboardAnalytics'],
    queryFn: fetchDashboardAnalytics,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
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

  const data = apiData?.data || {};
  const kpis = data.kpis || {};
  const recentTickets = data.recent_tickets || [];
  const chartData = (data.chat_volume_trends || []).map(item => ({
    ...item,
    date: format(new Date(item.date), 'MMM d'),
  }));

  // Destructure the new billing and usage data safely
  const subscription = data.subscription;
  const usageAnalytics = data.usage_analytics;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      {/* --- Main KPI Row --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Conversations" value={displayValue(kpis.total_conversations)} icon={MessageSquare} />
        <KpiCard title="Resolved Conversations" value={displayValue(kpis.resolved_conversations)} icon={CheckCircle} />
        <KpiCard title="Flagged for Review" value={displayValue(kpis.flagged_conversations)} icon={AlertTriangle} />
        <KpiCard title="Resolution Rate" value={`${(kpis.resolution_rate ?? 0).toFixed(1)}%`} icon={Percent} />
      </div>

      {/* --- Charts and Billing Info Row --- */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chat Volume takes 2/3 of the space */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Chat Volume Trends</CardTitle>
            <CardDescription>Conversations over the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}/>
                <Bar dataKey="count" name="Conversations" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Billing and Usage Cards stack in the remaining 1/3 space */}
        <div className="space-y-6">
            <CurrentPlanCard subscription={subscription} />
            <UsageCard subscription={subscription} usage={usageAnalytics} />
        </div>
      </div>
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
              <Button variant="outline" asChild className="">
                <Link to="/app/tickets">
                  View All Tickets <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
    </div>
  );
};

export default DashboardPage;