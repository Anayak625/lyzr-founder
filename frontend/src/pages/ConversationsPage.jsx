import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchConversations, createTicket } from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Ticket, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// A component for a single row, which includes the create ticket logic
const ConversationRow = ({ conversation }) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [ticketTitle, setTicketTitle] = useState(conversation.summary || '');
    
    const createTicketMutation = useMutation({
        mutationFn: (ticketData) => createTicket(ticketData),
        onSuccess: () => {
            toast({ title: "Ticket Created!", description: "The conversation has been escalated to a ticket." });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            setDialogOpen(false);
        },
        onError: (err) => {
            toast({ title: "Failed to create ticket", description: err.response?.data?.detail || "An error occurred.", variant: "destructive" });
        }
    });

    const handleCreateTicket = () => {
        if (!ticketTitle.trim()) {
            toast({ title: "Title is required", variant: "destructive" });
            return;
        }
        createTicketMutation.mutate({
            conversation_id: conversation.id,
            title: ticketTitle,
            priority: 'NORMAL', // Agent can change this later
        });
    };

    return (
        <>
            <TableRow>
                <TableCell className="font-medium">{conversation.agent_name}</TableCell>
                <TableCell>{conversation.end_user_id}</TableCell>
                <TableCell className="text-muted-foreground truncate max-w-sm">{conversation.summary || 'No summary yet'}</TableCell>
                <TableCell className="text-right text-muted-foreground">{new Date(conversation.updated_at).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                    <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                            <Ticket className="h-4 w-4 mr-2"/> Create Ticket
                        </Button>
                    </DialogTrigger>
                    </Dialog>
                </TableCell>
            </TableRow>
            <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Ticket from Conversation</DialogTitle>
                        <DialogDescription>
                            Review the details and create a ticket for customer '{conversation.end_user_id}'. The full chat will be attached.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="title">Ticket Title</Label>
                        <Input id="title" value={ticketTitle} onChange={(e) => setTicketTitle(e.target.value)} />
                    </div>
                    <DialogFooter>
                         <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateTicket} disabled={createTicketMutation.isPending}>
                            {createTicketMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Create Ticket
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

// The main page component
const ConversationsPage = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
  });

  const conversations = data?.results || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-1/2" />
        <Card><CardContent className="p-4 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</CardContent></Card>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-destructive/10 text-destructive border border-destructive rounded-md">Could not load conversations.</div>;
  }

  return (
    <div className="space-y-6">
      <CardHeader className="px-0">
        <CardTitle className="text-3xl font-bold flex items-center gap-2"><MessageSquare /> Live Conversations</CardTitle>
        <CardDescription>Monitor ongoing chats and proactively escalate them to tickets when needed.</CardDescription>
      </CardHeader>
      <Card>
        <CardContent className="p-0">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground"><MessageSquare className="mx-auto h-12 w-12" /><h3 className="mt-4 text-lg font-medium">No Active Conversations</h3><p>New chats that haven't been turned into tickets will appear here.</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead className="text-right">Last Message</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversations.map((conv) => <ConversationRow key={conv.id} conversation={conv} />)}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConversationsPage;