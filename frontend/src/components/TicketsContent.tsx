// src/components/TicketsContent.jsx
import { useTickets } from '@/hooks/useTickets';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Clock, User, AlertTriangle } from 'lucide-react';

const TicketsContent = () => {
  const { tickets, isLoading, error } = useTickets();

  const getStatusVariant = (status) => {
    switch (status) {
      case 'FLAGGED': return 'destructive';
      case 'ACTIVE': return 'secondary';
      case 'RESOLVED': return 'success';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
        <div className="p-8 space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
    );
  }

  if (error) {
    return <div className="p-8 text-destructive">Error fetching tickets.</div>;
  }

  return (
    <div className="flex-1 space-y-6 p-8">
        <CardHeader className="px-0">
            <CardTitle className="text-3xl font-bold tracking-tight">Support Tickets</CardTitle>
            <CardDescription>Conversations from all agents that have been flagged for human review.</CardDescription>
        </CardHeader>
      
      {tickets?.length === 0 ? (
        <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No Flagged Tickets</h3>
            <p className="text-sm text-muted-foreground">All customer conversations are being handled automatically!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets?.map((ticket) => (
            <Card key={ticket.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Badge variant={getStatusVariant(ticket.status)}>{ticket.status}</Badge>
                            <h3 className="font-semibold">{ticket.subject}</h3>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1"><User className="h-3 w-3" /> {ticket.customer}</div>
                            <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(ticket.updated_at).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TicketsContent;