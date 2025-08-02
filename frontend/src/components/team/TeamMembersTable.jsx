import { useState } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchTeamDetails, inviteTeamMember, removeTeamMember, updateMemberRole } from '@/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Loader2, Crown, User, MoreVertical, Trash2, Edit } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

const TeamMembersTable = ({ teamId }) => {
    const { user: currentUser } = useAuth(); 
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [isInviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [isRemoveAlertOpen, setRemoveAlertOpen] = useState(false);
    const [isRoleDialogOpen, setRoleDialogOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('MEMBER');
    const [newRole, setNewRole] = useState('MEMBER');
    
    const { data: team, isLoading } = useQuery({
        queryKey: ['team', teamId],
        queryFn: () => fetchTeamDetails(teamId),
        enabled: !!teamId,
    });

    const mutationOptions = {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team', teamId] }),
        onError: (err) => toast({ title: 'Operation Failed', description: err.response?.data?.detail || 'An unexpected error occurred.', variant: 'destructive' })
    };

    const inviteMutation = useMutation({ mutationFn: (data) => inviteTeamMember(teamId, data), ...mutationOptions,
        onSuccess: () => {
            toast({ title: 'Invitation Sent!', description: `An invite has been sent to ${inviteEmail}.` });
            setInviteDialogOpen(false);
            setInviteEmail('');
        }
    });

    const removeMemberMutation = useMutation({ mutationFn: (memberId) => removeTeamMember(teamId, memberId), ...mutationOptions,
        onSuccess: () => {
            toast({ title: 'Member Removed' });
            setRemoveAlertOpen(false);
        }
    });

    const updateRoleMutation = useMutation({ mutationFn: ({ memberId, role }) => updateMemberRole(teamId, memberId, { role }), ...mutationOptions,
        onSuccess: () => {
            toast({ title: 'Role Updated' });
            setRoleDialogOpen(false);
        }
    });

    const handleInvite = () => {
        if (!inviteEmail) return;
        inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
    };
    
    const openRemoveDialog = (member) => {
        setSelectedMember(member);
        setRemoveAlertOpen(true);
    };

    const openRoleDialog = (member) => {
        setSelectedMember(member);
        setNewRole(member.role);
        setRoleDialogOpen(true);
    };

    const getRoleIcon = (role) => {
        if (role === 'ADMIN') return <Crown className="h-4 w-4 text-amber-500" />;
        return <User className="h-4 w-4 text-muted-foreground" />;
    };
    
    if (isLoading) return <Skeleton className="h-64 w-full" />;

    const members = team?.members || [];
    const isAdmin = members.find(m => m.user.id === currentUser?.id)?.role === 'ADMIN';

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">{team?.name}</h3>
                {isAdmin && (
                    <Dialog open={isInviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                        <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4"/> Invite Member</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Invite a New Team Member</DialogTitle><DialogDescription>They will receive an email to join your team.</DialogDescription></DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2"><Label htmlFor="email">Email Address</Label><Input id="email" type="email" placeholder="name@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} /></div>
                                <div className="space-y-2"><Label htmlFor="role">Role</Label><Select value={inviteRole} onValueChange={setInviteRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MEMBER">Member</SelectItem><SelectItem value="ADMIN">Admin</SelectItem></SelectContent></Select></div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleInvite} disabled={inviteMutation.isPending}>{inviteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Send Invitation</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {members.map(member => (
                            <TableRow key={member.id}>
                                <TableCell>
                                    <div className="font-medium">{member.user.full_name}</div>
                                    <div className="text-sm text-muted-foreground">{member.user.email}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={member.role === 'ADMIN' ? 'default' : 'secondary'} className="flex items-center gap-2 w-fit">{getRoleIcon(member.role)} {member.role}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {isAdmin && currentUser.id !== member.user.id && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => openRoleDialog(member)}><Edit className="mr-2 h-4 w-4"/> Change Role</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => openRemoveDialog(member)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/> Remove Member</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Role Change Dialog */}
            <Dialog open={isRoleDialogOpen} onOpenChange={setRoleDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Change Member Role</DialogTitle><DialogDescription>Update the role for {selectedMember?.user.email}.</DialogDescription></DialogHeader>
                    <div className="py-4"><Select value={newRole} onValueChange={setNewRole}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="MEMBER">Member</SelectItem><SelectItem value="ADMIN">Admin</SelectItem></SelectContent></Select></div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
                        <Button onClick={() => updateRoleMutation.mutate({ memberId: selectedMember.id, role: newRole })} disabled={updateRoleMutation.isPending}>{updateRoleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update Role</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Remove Member Confirmation */}
            <AlertDialog open={isRemoveAlertOpen} onOpenChange={setRemoveAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently remove {selectedMember?.user.email} from the team. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removeMemberMutation.mutate(selectedMember.id)} disabled={removeMemberMutation.isPending}>
                            {removeMemberMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default TeamMembersTable;