import { useQuery } from '@tanstack/react-query';
import { fetchMyTeams, createTeam, fetchInvitations } from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Users, Mail, PlusCircle, Loader2, Badge } from 'lucide-react';
import TeamMembersTable from '@/components/team/TeamMembersTable';
import InvitationsList from '@/components/team/InvitationsList';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';

// CreateTeam component remains the same, no changes needed here.
const CreateTeam = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [teamName, setTeamName] = useState('');
    const [isDialogOpen, setDialogOpen] = useState(false);

    const createTeamMutation = useMutation({
        mutationFn: (newTeamData) => createTeam(newTeamData),
        onSuccess: () => {
            toast({ title: "Team Created!", description: "You can now invite members." });
            queryClient.invalidateQueries({ queryKey: ['myTeams'] });
            setDialogOpen(false);
            setTeamName('');
        },
        onError: (err) => toast({ title: "Failed to create team", description: err.response?.data?.detail, variant: "destructive" }),
    });

    return (
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4" /> Create New Team</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create a New Team</DialogTitle>
                    <DialogDescription>Give your new team a name to get started.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="team-name">Team Name</Label>
                    <Input id="team-name" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g., Marketing Team" />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={() => createTeamMutation.mutate({ name: teamName })} disabled={!teamName.trim() || createTeamMutation.isPending}>
                        {createTeamMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


const TeamSettingsPage = () => {
    const { data: teamsData, isLoading: isLoadingTeams, error: teamsError } = useQuery({
        queryKey: ['myTeams'],
        queryFn: fetchMyTeams,
    });

    const { data: invitationsData, isLoading: isLoadingInvitations } = useQuery({
        queryKey: ['invitations'],
        queryFn: fetchInvitations,
    });

    const myTeams = teamsData?.results || [];
    const pendingInvitations = invitationsData?.results || [];
    const isLoading = isLoadingTeams || isLoadingInvitations;

    const mainContentSpan = pendingInvitations.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3';

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <CardHeader className="px-0">
                    <CardTitle className="text-3xl font-bold tracking-tight flex items-center gap-3"><Users /> Team Management</CardTitle>
                    <CardDescription>Manage your teams, invite members, and handle pending invitations. Make sure to form a team to receive ticket issues.</CardDescription>
                </CardHeader>
                <CreateTeam />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className={`${mainContentSpan} space-y-6`}>
                    {isLoading ? (
                        <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
                    ) : teamsError ? (
                        <div className="text-center text-destructive flex flex-col items-center gap-4 py-8"><AlertTriangle className="h-12 w-12" /><h3>Error Fetching Team Data</h3></div>
                    ) : myTeams.length > 0 ? (
                        myTeams.map(team => (
                             <Card key={team.id}>
                                <CardContent className="p-6"><TeamMembersTable teamId={team.id} /></CardContent>
                            </Card>
                        ))
                    ) : (
                        <Card>
                            <CardContent className="text-center py-12">
                                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-medium">You're not on a team yet</h3>
                                <p className="text-sm text-muted-foreground mt-1">Create a new team to start collaborating or ask an existing team admin to send you an invitation.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* This section remains the same. It only renders if invitations exist. */}
                {pendingInvitations.length > 0 && (
                    <div className="lg:col-span-1">
                        <Card>
                             <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Mail className="h-5 w-5"/> 
                                    Pending Invitations
                                    <Badge variant="secondary" className="ml-auto">{pendingInvitations.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <InvitationsList />
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamSettingsPage;