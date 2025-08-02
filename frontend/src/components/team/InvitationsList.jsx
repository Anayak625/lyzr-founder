import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchInvitations, acceptInvitation, declineInvitation } from '@/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Loader2 } from 'lucide-react';

const InvitationsList = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { data: invitationsData, isLoading } = useQuery({
        queryKey: ['invitations'],
        queryFn: fetchInvitations,
    });

    const mutationOptions = {
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invitations'] });
            queryClient.invalidateQueries({ queryKey: ['myTeams'] });
        },
        onError: (err) => toast({ title: 'Action Failed', description: err.response?.data?.detail || "An error occurred.", variant: 'destructive' })
    };

    const acceptMutation = useMutation({ mutationFn: acceptInvitation, ...mutationOptions, onSuccess: (data) => { mutationOptions.onSuccess(); toast({ title: data.detail }); } });
    const declineMutation = useMutation({ mutationFn: declineInvitation, ...mutationOptions, onSuccess: (data) => { mutationOptions.onSuccess(); toast({ title: data.detail }); } });

    const invitations = invitationsData?.results || [];

    if (isLoading) {
        return <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;
    }

    if (invitations.length === 0) {
        return <p className="text-sm text-center text-muted-foreground py-4">You have no pending invitations.</p>;
    }

    return (
        <div className="space-y-3">
            {invitations.map(invite => (
                <div key={invite.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md border">
                    <div>
                        <p className="font-semibold text-sm">Join '{invite.team.name}'</p>
                        <p className="text-xs text-muted-foreground">Invited by {invite.invited_by.email}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button size="icon" variant="outline" className="h-8 w-8 text-destructive" onClick={() => declineMutation.mutate(invite.id)} disabled={declineMutation.isPending}>
                            {declineMutation.isPending && declineMutation.variables === invite.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" className="h-8 w-8" onClick={() => acceptMutation.mutate(invite.id)} disabled={acceptMutation.isPending}>
                             {acceptMutation.isPending && acceptMutation.variables === invite.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default InvitationsList;