from django.utils import timezone
from rest_framework import viewsets, permissions, status
from django.db import models
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Ticket, TicketNote
from .serializers import (
    TicketListSerializer, TicketDetailSerializer, TicketNoteSerializer, CreateTicketSerializer
)
from core.models import User, Conversation
from teams.models import Team, TeamMember

class TicketViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_teams = TeamMember.objects.filter(user=self.request.user).values_list('team_id', flat=True)
        return Ticket.objects.filter(
            models.Q(assigned_to=self.request.user) | models.Q(team_id__in=user_teams)
        ).select_related(
            'conversation', 'assigned_to', 'team'
        ).prefetch_related('notes').distinct().order_by('-updated_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateTicketSerializer
        if self.action == 'retrieve':
            return TicketDetailSerializer
        return TicketListSerializer

    def perform_create(self, serializer):
        conversation_id = serializer.validated_data.pop('conversation_id')
        conversation = Conversation.objects.get(id=conversation_id)

        user_team = Team.objects.filter(members__user=self.request.user).first()

        serializer.save(
            conversation=conversation,
            team=user_team
        )

    @action(detail=True, methods=['post'], url_path='add-note', serializer_class=TicketNoteSerializer)
    def add_note(self, request, pk=None):
        ticket = self.get_object()
        serializer = TicketNoteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(ticket=ticket, user=request.user)
            # When a note is added, update the ticket's `updated_at` timestamp
            ticket.updated_at = timezone.now()
            ticket.save(update_fields=['updated_at'])
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='update-priority')
    def update_priority(self, request, pk=None):
        ticket = self.get_object()
        new_priority = request.data.get('priority')
        if new_priority not in Ticket.Priority.values:
            return Response({'error': 'Invalid priority'}, status=status.HTTP_400_BAD_REQUEST)
        
        ticket.priority = new_priority
        ticket.save()
        return Response(TicketDetailSerializer(ticket, context={'request': request}).data)
    
    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        ticket = self.get_object()
        new_status = request.data.get('status')
        if new_status not in Ticket.Status.values:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

        ticket.status = new_status
        if new_status in [Ticket.Status.SOLVED, Ticket.Status.CLOSED]:
            ticket.resolved_at = timezone.now()
        else:
            ticket.resolved_at = None
        ticket.save()
        return Response(TicketDetailSerializer(ticket, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='assign')
    def assign(self, request, pk=None):
        ticket = self.get_object()
        user_id = request.data.get('user_id')
        team_id = request.data.get('team_id')

        if team_id:
            try:
                team = Team.objects.get(id=team_id)
                if not team.members.filter(user=request.user).exists():
                    return Response({'error': 'You can only assign to teams you are a member of.'}, status=status.HTTP_403_FORBIDDEN)
                ticket.team = team
                ticket.assigned_to = None
            except Team.DoesNotExist:
                return Response({'error': 'Team not found'}, status=status.HTTP_404_NOT_FOUND)

        if user_id:
            try:
                user = User.objects.get(id=user_id)
                if ticket.team and not ticket.team.members.filter(user=user).exists():
                     return Response({'error': 'User is not a member of the assigned team.'}, status=status.HTTP_400_BAD_REQUEST)
                ticket.assigned_to = user
            except User.DoesNotExist:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        ticket.save()
        return Response(TicketDetailSerializer(ticket, context={'request': request}).data)