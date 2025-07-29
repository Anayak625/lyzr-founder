import { useQuery } from '@tanstack/react-query';
import { fetchTeamMembers } from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Users } from 'lucide-react';
import { TeamMembersTable } from '@/components/team/TeamMembersTable';

const TeamSettingsPage = () => {
    const { data: members, isLoading, error } = useQuery({
        queryKey: ['teamMembers'],
        queryFn: fetchTeamMembers,
    });

    return (
        <div className="space-y-6">
            <CardHeader className="px-0">
                <CardTitle className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Users /> Team Management
                </CardTitle>
                <CardDescription>
                    Invite, manage, and assign roles to your team members.
                </CardDescription>
            </CardHeader>
            
            <Card>
                <CardContent className="p-6">
                    {isLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-1/4" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : error ? (
                        <div className="text-center text-destructive flex flex-col items-center gap-4 py-8">
                            <AlertTriangle className="h-12 w-12" />
                            <h3 className="text-lg font-medium">Error Fetching Team Members</h3>
                            <p className="text-sm text-muted-foreground">Could not load your team data. Please try again later.</p>
                        </div>
                    ) : (
                        <TeamMembersTable members={members?.data || []} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default TeamSettingsPage;