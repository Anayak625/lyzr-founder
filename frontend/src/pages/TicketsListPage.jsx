import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchTickets } from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Inbox } from 'lucide-react';

const TicketsListPage = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets'],
    queryFn: fetchTickets,
  });

  const tickets = data?.results || [];

  const getStatusVariant = (status) => {
    switch (status) {
      case 'NEW': return 'default';
      case 'OPEN': return 'secondary';
      case 'SOLVED': return 'success';
      case 'CLOSED': return 'outline';
      case 'PENDING':
      case 'ON_HOLD': return 'warning';
      default: return 'outline';
    }
  };
  
  const getPriorityVariant = (priority) => {
    switch (priority) {
      case 'URGENT':
      case 'HIGH': return 'destructive';
      case 'NORMAL': return 'secondary';
      case 'LOW': return 'outline';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-1/2" />
        <Card><CardContent className="p-4 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</CardContent></Card>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-destructive/10 text-destructive border border-destructive rounded-md">Could not load tickets.</div>;
  }

  return (
    <div className="space-y-6">
      <CardHeader className="px-0">
        <CardTitle className="text-3xl font-bold flex items-center gap-2"><Inbox /> Support Tickets</CardTitle>
        <CardDescription>View and manage all customer support tickets assigned to you and your teams.</CardDescription>
      </CardHeader>
      <Card>
        <CardContent className="p-0">
          {tickets.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground"><Inbox className="mx-auto h-12 w-12" /><h3 className="mt-4 text-lg font-medium">All Clear!</h3><p>There are no tickets in your queue.</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead className="text-right">Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id} onClick={() => navigate(`/app/tickets/${ticket.id}`)} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono">{ticket.ticket_id}</TableCell>
                    <TableCell className="font-medium max-w-xs truncate">{ticket.title}</TableCell>
                    <TableCell><Badge variant={getStatusVariant(ticket.status)}>{ticket.status}</Badge></TableCell>
                    <TableCell><Badge variant={getPriorityVariant(ticket.priority)}>{ticket.priority}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{ticket.team?.name || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{ticket.assigned_to?.full_name || 'Unassigned'}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{new Date(ticket.updated_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TicketsListPage;