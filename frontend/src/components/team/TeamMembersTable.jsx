import { useState } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inviteTeamMember, removeTeamMember, updateMemberRole } from '@/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Trash2, Mail, Loader2, Crown, User } from 'lucide-react';

export const TeamMembersTable = ({ members }) => {
    const { user: currentUser } = useAuth(); // Assuming useAuth provides the logged-in user's details
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isInviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('Member');
    
    // This is a mock. In a real app, the user's role would come from the `currentUser` object.
    const currentUserRole = 'Owner'; 

    const inviteMutation = useMutation({
        mutationFn: ({ email, role }) => inviteTeamMember(email, role),
        onSuccess: () => {
            toast({ title: 'Invitation Sent!', description: `An invite has been sent to ${inviteEmail}.` });
            queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
            setInviteDialogOpen(false);
            setInviteEmail('');
        },
        onError: () => toast({ title: 'Invite Failed', description: 'Could not send invitation. Please try again.', variant: 'destructive' })
    });
    
    const removeMutation = useMutation({
        mutationFn: (memberId) => removeTeamMember(memberId),
        onSuccess: () => {
            toast({ title: 'Member Removed' });
            queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
        },
        onError: () => toast({ title: 'Removal Failed', variant: 'destructive' })
    });

    const roleMutation = useMutation({
        mutationFn: ({ memberId, role }) => updateMemberRole(memberId, role),
        onSuccess: () => {
            toast({ title: 'Role Updated' });
            queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
        },
        onError: () => toast({ title: 'Update Failed', variant: 'destructive' })
    });

    const handleInvite = () => {
        if (!inviteEmail) return;
        inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
    };

    const getRoleIcon = (role) => {
        if (role === 'Owner') return <Crown className="h-4 w-4 text-amber-500" />;
        if (role === 'Member') return <User className="h-4 w-4 text-muted-foreground" />;
        return <Mail className="h-4 w-4 text-muted-foreground" />;
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Team Members</h3>
                {currentUserRole === 'Owner' && (
                    <Dialog open={isInviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                        <DialogTrigger asChild>
                            <Button><PlusCircle className="mr-2 h-4 w-4"/> Invite Member</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Invite a New Team Member</DialogTitle>
                                <DialogDescription>Enter the email address and assign a role. They will receive an email to join your team.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input id="email" type="email" placeholder="name@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Select value={inviteRole} onValueChange={setInviteRole}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Member">Member</SelectItem>
                                            <SelectItem value="Owner" disabled>Owner (max 1)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleInvite} disabled={inviteMutation.isPending}>
                                    {inviteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Send Invitation
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {members.map(member => (
                        <TableRow key={member.id}>
                            <TableCell>
                                <div className="font-medium">{member.full_name}</div>
                                <div className="text-sm text-muted-foreground">{member.email}</div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={member.role === 'Owner' ? 'default' : 'secondary'} className="flex items-center gap-2 w-fit">
                                    {getRoleIcon(member.role)} {member.role}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                {currentUserRole === 'Owner' && member.role !== 'Owner' ? (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" disabled={removeMutation.isLoading}>
                                                <Trash2 className="h-4 w-4 text-destructive"/>
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>This will remove {member.full_name} from your team. They will lose access to all agents and data. This action cannot be undone.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => removeMutation.mutate(member.id)} className="bg-destructive hover:bg-destructive/90">
                                                    Yes, remove member
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                ) : (
                                    <span className="text-xs text-muted-foreground"> — </span>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};