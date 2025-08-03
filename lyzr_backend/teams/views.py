from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Team, TeamMember, Invitation
from .serializers import (
    TeamSerializer, TeamDetailSerializer, TeamMemberSerializer,UpdateMemberRoleSerializer,
    InvitationSerializer, InviteMemberSerializer, TeamCreateSerializer
)
from core.models import User
from .permissions import IsTeamAdmin
from .tasks import send_invitation_email_task
from billing.utils import check_plan_limit

class TeamViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return TeamCreateSerializer
        if self.action == 'retrieve':
            return TeamDetailSerializer
        if self.action == 'invite':
            return InviteMemberSerializer
        if self.action == 'update_member_role':
            return UpdateMemberRoleSerializer
        return TeamSerializer

    def get_queryset(self):
        return Team.objects.filter(members__user=self.request.user).distinct()
    
    def perform_create(self, serializer):
        team = serializer.save(owner=self.request.user)
        TeamMember.objects.create(team=team, user=self.request.user, role=TeamMember.Role.ADMIN)
        
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        - Only Admins can update or delete a team.
        - Any authenticated user can create a new team or list their own teams.
        """
        if self.action in ['update', 'partial_update', 'destroy', 'invite', 'remove_member', 'update_member_role']:
            return [permissions.IsAuthenticated(), IsTeamAdmin()]
        return [permissions.IsAuthenticated()]
    
    @action(detail=True, methods=['post'], url_path='invite')
    def invite(self, request, pk=None):
        check_plan_limit(request.user, 'team_members')
        team = self.get_object()
        # This now correctly gets InviteMemberSerializer
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # The KeyError will no longer happen
        email = serializer.validated_data['email']
        role = serializer.validated_data['role']

        if TeamMember.objects.filter(team=team, user__email=email).exists():
            return Response({'detail': 'User with this email is already a member of this team.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if Invitation.objects.filter(team=team, email=email, status=Invitation.Status.PENDING).exists():
            return Response({'detail': 'An active invitation for this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        invitation = Invitation.objects.create(team=team, email=email, role=role, invited_by=request.user)
        send_invitation_email_task.delay(str(invitation.id))
        
        return Response({'detail': f'Invitation sent to {email}.'}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='remove-member/(?P<member_id>[^/.]+)')
    def remove_member(self, request, pk=None, member_id=None):
        team = self.get_object()
        try:
            member = TeamMember.objects.get(id=member_id, team=team)
        except TeamMember.DoesNotExist:
            return Response({'detail': 'Member not found in this team.'}, status=status.HTTP_404_NOT_FOUND)

        # Prevent the owner from being removed
        if member.user == team.owner:
            return Response({'detail': 'The team owner cannot be removed.'}, status=status.HTTP_403_FORBIDDEN)
        
        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='update-member-role/(?P<member_id>[^/.]+)')
    def update_member_role(self, request, pk=None, member_id=None):
        team = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_role = serializer.validated_data['role']

        if not new_role or new_role not in TeamMember.Role.values:
            return Response({'detail': f'A valid role is required. Choices are: {TeamMember.Role.values}'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            member = TeamMember.objects.get(id=member_id, team=team)
        except TeamMember.DoesNotExist:
            return Response({'detail': 'Member not found in this team.'}, status=status.HTTP_404_NOT_FOUND)

        # The owner's role cannot be changed from Admin
        if member.user == team.owner and new_role != TeamMember.Role.ADMIN:
            return Response({'detail': 'The team owner must be an Admin.'}, status=status.HTTP_403_FORBIDDEN)
            
        member.role = new_role
        member.save()
        return Response(TeamMemberSerializer(member).data)


class InvitationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for users to view and respond to their invitations.
    """
    serializer_class = InvitationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Invitation.objects.filter(
            email=self.request.user.email,
            status=Invitation.Status.PENDING
        )

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        invitation = self.get_object()
        
        if invitation.email != request.user.email:
            return Response({'detail': 'This invitation is not for you.'}, status=status.HTTP_403_FORBIDDEN)

        _, created = TeamMember.objects.get_or_create(
            team=invitation.team,
            user=request.user,
            defaults={'role': invitation.role}
        )
        
        if not created:
            return Response({'detail': 'You are already a member of this team.'}, status=status.HTTP_400_BAD_REQUEST)

        invitation.status = Invitation.Status.ACCEPTED
        invitation.save()
        return Response({'detail': f'Welcome to team {invitation.team.name}!'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        invitation = self.get_object()

        if invitation.email != request.user.email:
            return Response({'detail': 'This invitation is not for you.'}, status=status.HTTP_403_FORBIDDEN)

        invitation.status = Invitation.Status.DECLINED
        invitation.save()
        return Response({'detail': 'Invitation declined.'}, status=status.HTTP_200_OK)