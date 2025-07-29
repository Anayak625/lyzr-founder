import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchTickets } from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle } from 'lucide-react';

const TicketsList = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets'],
    queryFn: fetchTickets,
  });

  const getStatusVariant = (status) => {
    switch (status) {
      case 'FLAGGED': return 'destructive';
      case 'ACTIVE': return 'secondary';
      case 'RESOLVED': return 'success';
      default: return 'outline';
    }
  };

  const tickets = data?.results || [];

  return (
    <div className="space-y-6">
      <CardHeader className="px-0">
        <CardTitle className="text-3xl font-bold tracking-tight">Support Tickets</CardTitle>
        <CardDescription>Review conversations from all agents that require attention.</CardDescription>
      </CardHeader>
      
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-destructive">Error fetching tickets. Please try again.</div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No Tickets Found</h3>
              <p className="text-sm text-muted-foreground">All conversations are resolved or being handled automatically.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id} asChild className="cursor-pointer hover:bg-muted/50">
                    <Link to={`/app/tickets/${ticket.id}`}>
                        <TableCell>
                            <Badge variant={getStatusVariant(ticket.status)}>{ticket.status}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                            {ticket.subject}
                        </TableCell>
                        <TableCell>
                            {ticket.customer}
                        </TableCell>
                        <TableCell className="text-right">
                            {new Date(ticket.updated_at).toLocaleString()}
                        </TableCell>
                    </Link>
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

export default TicketsList;