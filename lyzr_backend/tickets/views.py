import logging # Import the logging library
from django.utils import timezone
from rest_framework import viewsets, permissions, status, serializers
from django.db import models
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Ticket, TicketNote
from .serializers import (
    TicketListSerializer, TicketDetailSerializer, TicketNoteSerializer, CreateTicketSerializer
)
from core.models import User, Conversation
from teams.models import Team, TeamMember

# Get a logger instance for this file
logger = logging.getLogger(__name__)

class TicketViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        logger.debug(f"TicketViewSet.get_queryset called by user: {self.request.user.email}")
        
        user_teams = TeamMember.objects.filter(user=self.request.user).values_list('team_id', flat=True)
        logger.debug(f"User '{self.request.user.email}' is a member of team IDs: {list(user_teams)}")

        queryset = Ticket.objects.filter(
            models.Q(assigned_to=self.request.user) | models.Q(team_id__in=user_teams)
        ).select_related(
            'conversation', 'conversation__agent__user', 'assigned_to', 'team'
        ).prefetch_related('notes').distinct().order_by('-updated_at')
        
        logger.info(f"Returning {queryset.count()} tickets for user '{self.request.user.email}'.")
        return queryset

    def get_serializer_class(self):
        logger.debug(f"TicketViewSet.get_serializer_class called for action: '{self.action}'")
        if self.action == 'create':
            logger.debug("Using CreateTicketSerializer.")
            return CreateTicketSerializer
        if self.action == 'retrieve':
            logger.debug("Using TicketDetailSerializer.")
            return TicketDetailSerializer
        logger.debug("Using TicketListSerializer as default.")
        return TicketListSerializer

    def perform_create(self, serializer):
        logger.info("--- Starting Ticket Creation Process ---")
        
        conversation_id = serializer.validated_data.get('conversation_id')
        logger.debug(f"Attempting to create ticket from conversation_id: {conversation_id}")

        if not conversation_id:
            logger.error("Validation Error: conversation_id not provided in perform_create.")
            raise serializers.ValidationError({"conversation_id": "This field is required."})

        try:
            conversation = Conversation.objects.select_related('agent__user').get(id=conversation_id)
            logger.debug(f"Successfully fetched Conversation object: {conversation.id}")
            
            agent_owner = conversation.agent.user
            logger.debug(f"Identified Agent Owner for this conversation: '{agent_owner.email}' (ID: {agent_owner.id})")

            owner_team = Team.objects.filter(members__user=agent_owner).first()

            if owner_team:
                logger.debug(f"Agent Owner '{agent_owner.email}' belongs to Team '{owner_team.name}'. Assigning ticket to team.")
                serializer.save(
                    conversation=conversation,
                    team=owner_team,
                    assigned_to=None
                )
                logger.info(f"SUCCESS: Ticket created and assigned to Team '{owner_team.name}'.")
            else:
                logger.debug(f"Agent Owner '{agent_owner.email}' does not belong to any team. Assigning ticket directly to owner.")
                serializer.save(
                    conversation=conversation,
                    team=None,
                    assigned_to=agent_owner
                )
                logger.info(f"SUCCESS: Ticket created and assigned directly to User '{agent_owner.email}'.")

        except Conversation.DoesNotExist:
            logger.error(f"CRITICAL: Conversation with ID '{conversation_id}' does not exist. Cannot create ticket.")
            raise serializers.ValidationError({"conversation_id": "A valid conversation is required."})
        except Exception as e:
            logger.error(f"UNEXPECTED ERROR during ticket creation: {e}", exc_info=True)
            # Re-raise the exception to let Django REST Framework handle it
            raise

    @action(detail=True, methods=['post'], url_path='add-note', serializer_class=TicketNoteSerializer)
    def add_note(self, request, pk=None):
        logger.debug(f"add_note called for ticket pk={pk} by user '{request.user.email}'")
        ticket = self.get_object()
        serializer = TicketNoteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(ticket=ticket, user=request.user)
            ticket.updated_at = timezone.now()
            ticket.save(update_fields=['updated_at'])
            logger.info(f"Note successfully added to ticket {ticket.ticket_id}.")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        logger.warning(f"Failed to add note to ticket {ticket.ticket_id}. Errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='update-priority')
    def update_priority(self, request, pk=None):
        logger.debug(f"update_priority called for ticket pk={pk} by user '{request.user.email}'")
        ticket = self.get_object()
        new_priority = request.data.get('priority')
        logger.debug(f"Request to change ticket {ticket.ticket_id} priority to '{new_priority}'.")
        if new_priority not in Ticket.Priority.values:
            logger.warning(f"Invalid priority value '{new_priority}' provided.")
            return Response({'error': 'Invalid priority'}, status=status.HTTP_400_BAD_REQUEST)
        
        ticket.priority = new_priority
        ticket.save()
        logger.info(f"Priority for ticket {ticket.ticket_id} successfully updated to '{new_priority}'.")
        return Response(TicketDetailSerializer(ticket, context={'request': request}).data)
    
    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        logger.debug(f"update_status called for ticket pk={pk} by user '{request.user.email}'")
        ticket = self.get_object()
        new_status = request.data.get('status')
        logger.debug(f"Request to change ticket {ticket.ticket_id} status to '{new_status}'.")
        if new_status not in Ticket.Status.values:
            logger.warning(f"Invalid status value '{new_status}' provided.")
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

        ticket.status = new_status
        if new_status in [Ticket.Status.SOLVED, Ticket.Status.CLOSED]:
            logger.debug("Status is terminal, setting resolved_at timestamp.")
            ticket.resolved_at = timezone.now()
        else:
            ticket.resolved_at = None
        ticket.save()
        logger.info(f"Status for ticket {ticket.ticket_id} successfully updated to '{new_status}'.")
        return Response(TicketDetailSerializer(ticket, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='assign')
    def assign(self, request, pk=None):
        logger.debug(f"assign called for ticket pk={pk} by user '{request.user.email}'")
        ticket = self.get_object()
        user_id = request.data.get('user_id')
        team_id = request.data.get('team_id')
        logger.debug(f"Assignment request for ticket {ticket.ticket_id}: user_id='{user_id}', team_id='{team_id}'")

        if team_id:
            try:
                team = Team.objects.get(id=team_id)
                if not team.members.filter(user=request.user).exists():
                    logger.warning(f"FORBIDDEN: User '{request.user.email}' tried to assign ticket {ticket.ticket_id} to team '{team.name}' but is not a member.")
                    return Response({'error': 'You can only assign to teams you are a member of.'}, status=status.HTTP_403_FORBIDDEN)
                ticket.team = team
                ticket.assigned_to = None
                logger.info(f"Ticket {ticket.ticket_id} assigned to team '{team.name}'.")
            except Team.DoesNotExist:
                logger.error(f"Assignment failed: Team with id='{team_id}' not found.")
                return Response({'error': 'Team not found'}, status=status.HTTP_404_NOT_FOUND)

        if user_id:
            try:
                user = User.objects.get(id=user_id)
                if ticket.team and not ticket.team.members.filter(user=user).exists():
                    logger.warning(f"Assignment failed: User '{user.email}' is not a member of the ticket's assigned team '{ticket.team.name}'.")
                    return Response({'error': 'User is not a member of the assigned team.'}, status=status.HTTP_400_BAD_REQUEST)
                ticket.assigned_to = user
                logger.info(f"Ticket {ticket.ticket_id} assigned to user '{user.email}'.")
            except User.DoesNotExist:
                logger.error(f"Assignment failed: User with id='{user_id}' not found.")
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        ticket.save()
        logger.debug(f"Ticket {ticket.ticket_id} saved successfully after assignment.")
        return Response(TicketDetailSerializer(ticket, context={'request': request}).data)