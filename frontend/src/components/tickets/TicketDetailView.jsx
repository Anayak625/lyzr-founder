import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTicketDetails, updateTicketStatus, addTicketNote } from '@/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bot, User, Send, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TicketDetailView = () => {
    const { ticketId } = useParams();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [note, setNote] = useState('');

    const { data: ticket, isLoading, error } = useQuery({
        queryKey: ['ticket', ticketId],
        queryFn: () => fetchTicketDetails(ticketId),
    });

    const statusMutation = useMutation({
        mutationFn: (newStatus) => updateTicketStatus(ticketId, newStatus),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            toast({ title: "Status updated!" });
        },
        onError: () => toast({ title: "Failed to update status", variant: "destructive" })
    });

    const noteMutation = useMutation({
        mutationFn: (newNote) => addTicketNote(ticketId, newNote),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
            setNote('');
            toast({ title: "Note added!" });
        },
        onError: () => toast({ title: "Failed to add note", variant: "destructive" })
    });

    if (isLoading) return <Skeleton className="w-full h-[80vh]" />;
    if (error) return <div className="text-destructive p-4 bg-destructive/10 border border-destructive rounded-md">Error loading ticket details.</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Conversation History</CardTitle>
                        <CardDescription>Subject: {ticket.subject}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {ticket.messages.map(msg => (
                            <div key={msg.id} className={`flex items-start gap-3 ${msg.sender_type === 'USER' ? 'justify-end' : ''}`}>
                                {msg.sender_type === 'AI' && <div className="p-2 rounded-full bg-primary/10"><Bot className="h-5 w-5 text-primary" /></div>}
                                <div className={`max-w-xl p-3 rounded-lg ${msg.sender_type === 'USER' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    <p className="text-xs text-right mt-1 opacity-70">{new Date(msg.created_at).toLocaleTimeString()}</p>
                                </div>
                                {msg.sender_type === 'USER' && <div className="p-2 rounded-full bg-muted"><User className="h-5 w-5" /></div>}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Ticket Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm font-medium">Customer ID</p>
                            <p className="text-sm text-muted-foreground">{ticket.customer}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium">Status</p>
                            <Select 
                                value={ticket.status}
                                onValueChange={(newStatus) => statusMutation.mutate(newStatus)}
                                disabled={statusMutation.isPending}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="FLAGGED">Flagged</SelectItem>
                                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <p className="text-sm font-medium">Agent</p>
                            <p className="text-sm text-muted-foreground">{ticket.agent.name}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Internal Notes</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                           {ticket.notes.length > 0 ? ticket.notes.map(n => (
                               <div key={n.id} className="text-sm p-3 bg-muted/50 rounded-lg">
                                   <p className="font-bold">{n.user.full_name}</p>
                                   <p className="whitespace-pre-wrap">{n.note}</p>
                                   <p className="text-xs text-muted-foreground text-right">{new Date(n.created_at).toLocaleString()}</p>
                               </div>
                           )) : (
                                <p className="text-sm text-center text-muted-foreground py-4">No notes yet.</p>
                           )}
                        </div>
                        <div className="space-y-2">
                            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a new note..."/>
                            <Button onClick={() => noteMutation.mutate(note)} disabled={!note.trim() || noteMutation.isPending} className="w-full">
                                {noteMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Send className="h-4 w-4 mr-2"/>}
                                {noteMutation.isPending ? "Adding..." : "Add Note"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default TicketDetailView;