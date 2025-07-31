import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { fetchTickets } from '@/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { AlertTriangle, Inbox } from 'lucide-react';

const TicketsListPage = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets'],
    queryFn: fetchTickets,
  });

  const tickets = data?.results || [];

  const getStatusVariant = (status) => {
    switch (status) {
      case 'FLAGGED':
        return 'destructive';
      case 'ACTIVE':
        return 'secondary';
      case 'RESOLVED':
        return 'success';
      default:
        return 'outline';
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-4 space-y-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-8 text-center text-destructive flex flex-col items-center gap-3">
          <AlertTriangle className="h-10 w-10" />
          <h3 className="text-lg font-semibold">Error Loading Tickets</h3>
          <p className="text-sm text-muted-foreground">
            {error.message || 'Could not load conversations. Please try again later.'}
          </p>
        </div>
      );
    }

    if (tickets.length === 0) {
      return (
        <div className="p-8 text-center flex flex-col items-center gap-3">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No Tickets Found</h3>
          <p className="text-sm text-muted-foreground">
            When conversations need attention, they’ll show up here.
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
  <TableHeader>
    <TableRow className="bg-muted">
      <TableHead className="w-[120px]">Status</TableHead>
      <TableHead>Subject</TableHead>
      <TableHead>Customer Session</TableHead>
      <TableHead className="text-right">Last Updated</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {tickets.map((ticket) => (
      <TableRow
        key={ticket.id}
        className="hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => navigate(`/app/tickets/${ticket.id}`)}
        style={{ cursor: 'pointer',zindex: 1 }}
      >
        <TableCell>
          <Badge variant={getStatusVariant(ticket.status)}>
            {ticket.status}
          </Badge>
        </TableCell>
        <TableCell
          className="font-medium truncate max-w-xs"
          title={ticket.subject}
        >
          {ticket.subject}
        </TableCell>
        <TableCell
          className="truncate max-w-xs text-muted-foreground"
          title={ticket.customer}
        >
          {ticket.customer}
        </TableCell>
        <TableCell className="text-right text-sm text-muted-foreground">
          {new Date(ticket.updated_at).toLocaleString()}
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>

      </div>
    );
  };

  return (
    <div className="space-y-6">
      <CardHeader className="px-0">
        <CardTitle className="text-3xl font-bold flex items-center gap-2">
          <Inbox className="h-7 w-7" />
          Support Tickets
        </CardTitle>
        <CardDescription>
          View and manage your active and resolved support conversations.
        </CardDescription>
      </CardHeader>

      <Card className="shadow-sm">
        <CardContent className="p-0">{renderContent()}</CardContent>
      </Card>
    </div>
  );
};

export default TicketsListPage;
