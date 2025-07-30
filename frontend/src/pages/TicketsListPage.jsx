import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchTickets } from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Inbox } from 'lucide-react';

const TicketsListPage = () => {
  const { data: ticketsData, isLoading, error } = useQuery({
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

  const tickets = ticketsData?.data?.results || [];

  return (
    <div className="space-y-6">
      <CardHeader className="px-0">
        <CardTitle className="text-3xl font-bold tracking-tight flex items-center gap-3"><Inbox /> Support Tickets</CardTitle>
        <CardDescription>Review and manage all conversations from your agents.</CardDescription>
      </CardHeader>
      
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-destructive flex flex-col items-center gap-4">
              <AlertTriangle className="h-12 w-12"/>
              <h3 className="text-lg font-medium">Error Fetching Tickets</h3>
              <p className="text-sm text-muted-foreground">Could not load conversations. Please try again later.</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center gap-4">
              <Inbox className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No Tickets Found</h3>
              <p className="text-sm text-muted-foreground">All conversations are resolved or being handled automatically.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link to={`/app/tickets/${ticket.id}`} className="block h-full w-full p-4 -m-4">
                        <Badge variant={getStatusVariant(ticket.status)}>{ticket.status}</Badge>
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link to={`/app/tickets/${ticket.id}`} className="block h-full w-full p-4 -m-4">
                        {ticket.subject}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link to={`/app/tickets/${ticket.id}`} className="block h-full w-full p-4 -m-4">
                        {ticket.customer}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/app/tickets/${ticket.id}`} className="block h-full w-full p-4 -m-4">
                        {new Date(ticket.updated_at).toLocaleString()}
                      </Link>
                    </TableCell>
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