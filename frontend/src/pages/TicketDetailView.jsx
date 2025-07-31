import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTicketDetails, updateTicketStatus, addTicketNote } from '@/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bot, User, Send, Loader2, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from 'react-router-dom';

const TicketDetailView = () => {
    const { ticketId } = useParams();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [note, setNote] = useState('');

    const { data: ticketData, isLoading, error } = useQuery({
        queryKey: ['ticket', ticketId],
        queryFn: () => fetchTicketDetails(ticketId),
    });
    const ticket = ticketData;

    const statusMutation = useMutation({
        mutationFn: (newStatus) => updateTicketStatus(ticketId, newStatus),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
            queryClient.invalidateQueries({ queryKey: ['tickets'] }); // Invalidate list for status updates
            toast({ title: "Status updated successfully!" });
        },
        onError: () => toast({ title: "Failed to update status", variant: "destructive" })
    });

    const noteMutation = useMutation({
        mutationFn: (newNote) => addTicketNote(ticketId, newNote),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
            setNote('');
            toast({ title: "Note added successfully!" });
        },
        onError: () => toast({ title: "Failed to add note", variant: "destructive" })
    });

    const handleAddNote = () => {
        if (!note.trim()) return;
        noteMutation.mutate(note);
    };

    if (isLoading) return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6"><Skeleton className="w-full h-[80vh]" /></div>
            <div className="space-y-6"><Skeleton className="w-full h-[80vh]" /></div>
        </div>
    );

    if (error) return <div className="text-destructive p-4 bg-destructive/10 border border-destructive rounded-md">Error loading ticket details.</div>;

    return (
        <div className="space-y-4">
            <Button variant="outline" asChild>
                <Link to="/app/tickets"><ArrowLeft className="mr-2 h-4 w-4" /> Back to All Tickets</Link>
            </Button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Conversation History</CardTitle>
                        <CardDescription>Subject: {ticket.subject}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                        {ticket.messages.length > 0 ? ticket.messages.map(msg => (
                            <div key={msg.id} className={`flex items-start gap-3 ${msg.sender_type === 'USER' ? 'justify-end' : ''}`}>
                                {msg.sender_type === 'AI' && <div className="p-2 rounded-full bg-primary/10 flex-shrink-0"><Bot className="h-5 w-5 text-primary" /></div>}
                                <div className={`max-w-xl p-3 rounded-lg shadow-sm ${msg.sender_type === 'USER' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    <p className="text-xs text-right mt-2 opacity-70">{new Date(msg.created_at).toLocaleString()}</p>
                                </div>
                                {msg.sender_type === 'USER' && <div className="p-2 rounded-full bg-muted flex-shrink-0"><User className="h-5 w-5" /></div>}
                            </div>
                        )) : (
                            <p className="text-sm text-center text-muted-foreground py-8">No conversation messages yet.</p>
                        )}
                    </CardContent>

                </Card>

                <div className="space-y-6 lg:sticky lg:top-8">
                    <Card>
                        <CardHeader><CardTitle>Ticket Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium">Customer ID</p>
                                <p className="text-sm text-muted-foreground break-all">{ticket.customer}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium">Agent</p>
                                <p className="text-sm text-muted-foreground">{ticket.agent.name}</p>
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
                                        <SelectItem value="FLAGGED">Flagged for Review</SelectItem>
                                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Internal Notes</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                                {ticket.notes.length > 0 ? ticket.notes.map(n => (
                                    <div key={n.id} className="text-sm p-3 bg-muted/50 rounded-lg border">
                                        <p className="font-bold text-xs">{n.user.full_name}</p>
                                        <p className="whitespace-pre-wrap mt-1">{n.note}</p>
                                        <p className="text-xs text-muted-foreground text-right mt-2">{new Date(n.created_at).toLocaleString()}</p>
                                    </div>
                                )) : (
                                    <p className="text-sm text-center text-muted-foreground py-4">No internal notes yet.</p>
                                )}
                            </div>
                            <div className="space-y-2 pt-4 border-t">
                                <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a new note for your team..." />
                                <Button onClick={handleAddNote} disabled={!note.trim() || noteMutation.isPending} className="w-full">
                                    {noteMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                    {noteMutation.isPending ? "Adding Note..." : "Add Note"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default TicketDetailView;