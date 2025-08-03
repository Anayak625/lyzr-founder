import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchConversations, createTicket, fetchConversationDetails } from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Ticket, Loader2, Bot, User, Eye } from 'lucide-react';
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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- NEW COMPONENT: ChatHistoryDialog ---
const ChatHistoryDialog = ({ conversationId, open, onOpenChange }) => {
    const { data: conversation, isLoading } = useQuery({
        queryKey: ['conversation', conversationId],
        queryFn: () => fetchConversationDetails(conversationId),
        enabled: open, // Only fetch when the dialog is open
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Conversation History</DialogTitle>
                    <DialogDescription>
                        Chat with customer '{conversation?.end_user_id}' via agent '{conversation?.agent_name}'.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto p-4 border rounded-md">
                    {isLoading ? <Loader2 className="mx-auto h-8 w-8 animate-spin" /> : (
                        conversation?.messages.map(msg => (
                            <div
                                    key={msg.id}
                                    className={`flex items-start gap-3 ${msg.sender_type === 'USER' ? 'flex-row-reverse' : ''}`}
                                >
                                    {msg.sender_type !== 'USER' && <div className="p-2 rounded-full bg-primary/10 flex-shrink-0"><Bot className="h-5 w-5 text-primary" /></div>}
                                    <div className={`max-w-xl p-3 rounded-lg shadow-sm ${msg.sender_type === 'USER' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}                                     style={{
                                        boxShadow:
                                            msg.feedback === 'NEGATIVE'
                                                ? '0 0 8px 2px rgba(255, 0, 0, 0.5)'
                                                : msg.feedback === 'POSITIVE'
                                                ? '0 0 8px 2px rgba(0, 255, 0, 0.5)'
                                                : undefined
                                    }}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                        <p className="text-xs text-right mt-2 opacity-70">{new Date(msg.created_at).toLocaleString()}</p>
                                    </div>
                                    {msg.sender_type === 'USER' && <div className="p-2 rounded-full bg-muted flex-shrink-0"><User className="h-5 w-5" /></div>}
                                </div>
                        ))
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


// MODIFIED COMPONENT: ConversationRow
const ConversationRow = ({ conversation }) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [isCreateTicketOpen, setCreateTicketOpen] = useState(false);
    const [isViewChatOpen, setViewChatOpen] = useState(false); // New state for view dialog
    const [ticketTitle, setTicketTitle] = useState(conversation.summary || '');
    
    const createTicketMutation = useMutation({
        mutationFn: (ticketData) => createTicket(ticketData),
        onSuccess: () => {
            toast({ title: "Ticket Created!", description: "The conversation has been escalated to a ticket." });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            setCreateTicketOpen(false);
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
            priority: 'NORMAL',
        });
    };

    return (
        <>
            <TableRow>
                <TableCell>{conversation.end_user_id}</TableCell>
                <TableCell className="text-muted-foreground truncate max-w-sm">{conversation.summary || 'No summary yet'}</TableCell>
                <TableCell className="text-right text-muted-foreground">{new Date(conversation.updated_at).toLocaleString()}</TableCell>
                <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => setViewChatOpen(true)}>
                        <Eye className="h-4 w-4 mr-2"/> View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCreateTicketOpen(true)}>
                        <Ticket className="h-4 w-4 mr-2"/> Create 
                    </Button>
                </TableCell>
            </TableRow>
            
            {/* Create Ticket Dialog */}
            <Dialog open={isCreateTicketOpen} onOpenChange={setCreateTicketOpen}>
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
                         <Button variant="outline" onClick={() => setCreateTicketOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateTicket} disabled={createTicketMutation.isPending}>
                            {createTicketMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Create Ticket
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Conversation Dialog */}
            <ChatHistoryDialog 
                conversationId={conversation.id} 
                open={isViewChatOpen} 
                onOpenChange={setViewChatOpen} 
            />
        </>
    );
};

// The main page component remains largely the same
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