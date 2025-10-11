# In tickets/tasks.py

import logging
from celery import shared_task
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction

from core.models import Conversation
from core.services.lyzr_client import LyzrClient, LyzrAPIError
from teams.models import Team # Correctly query through Team
from .models import Ticket

logger = logging.getLogger(__name__)

# FIX: Re-added bind=True and retry logic for robustness
@shared_task(bind=True, max_retries=3, default_retry_delay=180)
def create_ticket_from_conversation_task(self, conversation_id: str):
    """
    Creates and intelligently assigns a support ticket from a conversation,
    then notifies the end-user via WebSocket.
    """
    logger.info(f"--- Starting Task: Create Ticket from Conversation {conversation_id} ---")
    channel_layer = get_channel_layer()
    
    try:
        with transaction.atomic():
            # Use select_for_update to lock the row and prevent race conditions
            conversation = Conversation.objects.select_for_update().select_related('agent__user').get(id=conversation_id)
            
            # --- PREVENT DUPLICATE TICKETS ---
            if hasattr(conversation, 'ticket'):
                logger.warning(f"Ticket already exists for conversation {conversation_id}. Aborting task.")
                return f"Ticket already exists for conversation {conversation_id}."

            # --- 1. SUMMARIZE CONVERSATION FOR TICKET TITLE ---
            transcript = "\n".join(
                [f"{msg.sender_type}: {msg.content}" for msg in conversation.messages.all().order_by('created_at')]
            )
            ticket_title = "User needs assistance" # Default fallback title
            if transcript.strip():
                try:
                    client = LyzrClient()
                    summary_prompt = f"Summarize this conversation into a concise ticket title (max 15 words):\n\n{transcript}"
                    response = client.summarize_text(summary_prompt)
                    if response and response.get('summary'):
                        ticket_title = response['summary']
                    conversation.summary = ticket_title
                    conversation.save()
                except LyzrAPIError as e:
                    logger.error(f"Lyzr API error summarizing conversation {conversation_id}: {e}")
            
            logger.debug(f"Generated Ticket Title: '{ticket_title}'")

            # --- 2. CORRECTLY DETERMINE TICKET ASSIGNMENT ---
            agent_owner = conversation.agent.user
            logger.debug(f"Identified Agent Owner: {agent_owner.email}")
            
            # FIX: Find the team the agent owner is a MEMBER of, not an owner of.
            owner_team = Team.objects.filter(members__user=agent_owner).first()
            
            assignment_kwargs = {}
            if owner_team:
                assignment_kwargs['team'] = owner_team
                assignment_kwargs['assigned_to'] = None
                logger.debug(f"Owner is in team '{owner_team.name}'. Assigning ticket to team.")
            else:
                assignment_kwargs['team'] = None
                assignment_kwargs['assigned_to'] = agent_owner
                logger.debug("Owner is not in a team. Assigning ticket directly to the owner.")

            # --- 3. CREATE THE TICKET ---
            ticket = Ticket.objects.create(
                conversation=conversation,
                title=ticket_title[:255], # Truncate to fit model max_length
                **assignment_kwargs
            )
            logger.info(f"Successfully created ticket {ticket.ticket_id} from conversation {conversation_id}")
            
            # --- 4. PREPARE WEBSOCKET NOTIFICATION ---
            message_to_send = {
                'id': f'ticket_created_{ticket.id}',
                'sender': 'SYSTEM',
                'content': f"A new support ticket (#{ticket.ticket_id}) has been created. Our team will review your request and get back to you shortly."
            }
        
        # --- 5. SEND NOTIFICATION (after transaction commits) ---
        async_to_sync(channel_layer.group_send)(
            # The group name must match what your consumer uses
            f'chat_{conversation.end_user_id}',
            {
                'type': 'ticket.created.message', # This must match a handler in your consumer
                'message': message_to_send
            }
        )
        logger.info(f"Sent ticket creation notification to WebSocket group 'chat_{conversation.end_user_id}'")
        return ticket.ticket_id

    except Conversation.DoesNotExist:
        logger.error(f"Conversation {conversation_id} not found. Will not retry.")
        return # Do not retry if the conversation is gone
    except Exception as e:
        logger.error(f"Failed to create ticket for conversation {conversation_id}: {e}", exc_info=True)
        raise self.retry(exc=e) # Retry on other unexpected errors