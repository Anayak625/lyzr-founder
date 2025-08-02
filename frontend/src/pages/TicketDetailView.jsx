import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTicketDetails, updateTicketStatus, addTicketNote, assignTicket, updateTicketPriority, fetchMyTeams } from '@/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bot, User, Send, Loader2, ArrowLeft, Building, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/contexts/AuthProvider';
import { Label } from '@/components/ui/label';

const TicketDetailView = () => {
    const { ticketId } = useParams();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth();
    const [note, setNote] = useState('');

    const { data: ticket, isLoading, error } = useQuery({
        queryKey: ['ticket', ticketId],
        // The detail fetch is expected to return the full conversation messages
        queryFn: () => fetchTicketDetails(ticketId),
        enabled: !!ticketId,
    });

    const { data: teamsData } = useQuery({
        queryKey: ['myTeams'],
        queryFn: fetchMyTeams,
    });

    const myTeams = teamsData?.results || [];
    const teamMembers = myTeams.find(t => t.id === ticket?.team?.id)?.members || [];
    
    // This line safely accesses the messages. It assumes the API response for a single
    // ticket detail will include a 'messages' array within the 'conversation' object.
    // If it doesn't exist, it defaults to an empty array, preventing a crash.
    const conversationMessages = ticket?.conversation?.messages || [];
    const internalNotes = ticket?.notes || [];

    const mutationOptions = {
        onSuccess: (response) => {
            queryClient.setQueryData(['ticket', ticketId], response.data);
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
        },
        onError: (err) => toast({ title: "Update Failed", description: err.response?.data?.detail || "An error occurred.", variant: "destructive" }),
    };

    const statusMutation = useMutation({ mutationFn: (newStatus) => updateTicketStatus(ticketId, newStatus), ...mutationOptions, onSettled: () => toast({ title: "Status updated!" }) });
    const priorityMutation = useMutation({ mutationFn: (newPriority) => updateTicketPriority(ticketId, newPriority), ...mutationOptions, onSettled: () => toast({ title: "Priority updated!" }) });
    const assignmentMutation = useMutation({ mutationFn: (assignmentData) => assignTicket(ticketId, assignmentData), ...mutationOptions, onSettled: () => toast({ title: "Ticket assigned!" }) });
    const noteMutation = useMutation({ 
        mutationFn: (noteData) => addTicketNote(ticketId, noteData), 
        onSuccess: (response) => {
            queryClient.setQueryData(['ticket', ticketId], response.data);
            setNote(''); 
            toast({ title: "Note added!" });
        },
        onError: (err) => toast({ title: "Failed to Add Note", description: err.response?.data?.detail || "An error occurred.", variant: "destructive" })
    });

    const handleMemberAssignment = (value) => {
        if (value === '__UNASSIGN__') {
            assignmentMutation.mutate({ user_id: null });
        } else {
            assignmentMutation.mutate({ user_id: value });
        }
    };


    if (isLoading) return <div className="space-y-6"><Skeleton className="h-10 w-48"/><Skeleton className="h-[80vh] w-full" /></div>;
    if (error) return <div className="text-destructive p-4 bg-destructive/10 rounded-md">Error loading ticket details.</div>;

    return (
        <div className="space-y-4">
            <Button variant="outline" asChild><Link to="/app/tickets"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Tickets</Link></Button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Main Content Area (Corrected) */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">{ticket.title}</CardTitle>
                            <CardDescription>
                                Subject: {ticket.conversation?.summary || 'No summary available.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                           {conversationMessages.length > 0 ? conversationMessages.map(msg => (
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
                            )) : <p className="text-sm text-center py-4 text-muted-foreground">No conversation messages found.</p>}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Internal Notes</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                                {internalNotes.length > 0 
                                    ? [...internalNotes].reverse().map(n => <div key={n.id} className="text-sm p-3 bg-muted/50 rounded-lg border"><div className="flex justify-between items-center"><p className="font-bold text-xs">{n.user.full_name}</p><p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p></div><p className="whitespace-pre-wrap mt-1">{n.note}</p></div>)
                                    : <p className="text-sm text-center py-4 text-muted-foreground">No notes yet.</p>
                                }
                            </div>
                            <div className="space-y-2 pt-4 border-t">
                                <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder={`Add a note as ${user.full_name}...`} />
                                <Button onClick={() => noteMutation.mutate({ note, is_internal: true })} disabled={!note.trim() || noteMutation.isPending} className="w-full">
                                    {noteMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Send className="h-4 w-4 mr-2"/>}
                                    {noteMutation.isPending ? "Adding..." : "Add Note"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Panel: Ticket Management */}
                <div className="space-y-6 lg:sticky lg:top-8">
                    <Card>
                        <CardHeader><CardTitle>Manage Ticket</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Status</Label><Select value={ticket.status} onValueChange={(s) => statusMutation.mutate(s)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['NEW', 'OPEN', 'PENDING', 'ON_HOLD', 'SOLVED', 'CLOSED'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                                <div><Label>Priority</Label><Select value={ticket.priority} onValueChange={(p) => priorityMutation.mutate(p)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
                            </div>
                            <div><Label className="flex items-center gap-2"><Building className="h-4 w-4"/>Assign to Team</Label><Select value={ticket.team?.id || ''} onValueChange={(id) => assignmentMutation.mutate({ team_id: id })}><SelectTrigger><SelectValue placeholder="Select a team..."/></SelectTrigger><SelectContent>{myTeams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label className="flex items-center gap-2"><UserCheck className="h-4 w-4"/>Assign to Member</Label>
                                <Select 
                                    value={ticket.assigned_to?.id || ''} 
                                    onValueChange={handleMemberAssignment}
                                    disabled={!ticket.team}
                                >
                                    <SelectTrigger><SelectValue placeholder="Unassigned"/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__UNASSIGN__"><em>Unassign</em></SelectItem>
                                        {teamMembers.map(m => <SelectItem key={m.user.id} value={m.user.id}>{m.user.full_name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Ticket Information</CardTitle></CardHeader>
                        <CardContent className="text-sm space-y-2">
                            <div className="flex justify-between"><span>Ticket ID:</span> <span className="font-mono">{ticket.ticket_id}</span></div>
                            <div className="flex justify-between"><span>Created:</span> <span>{new Date(ticket.created_at).toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Last Update:</span> <span>{new Date(ticket.updated_at).toLocaleString()}</span></div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default TicketDetailView;