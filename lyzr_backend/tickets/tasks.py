import logging
from celery import shared_task
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction

from core.models import Conversation
from core.services.lyzr_client import LyzrClient, LyzrAPIError
from teams.models import Team
from .models import Ticket

logger = logging.getLogger(__name__)

@shared_task
def create_ticket_from_conversation_task(conversation_id: str):
    """
    Summarizes a conversation and creates a ticket, then notifies the client via WebSocket.
    """
    channel_layer = get_channel_layer()
    
    try:
        with transaction.atomic():
            conversation = Conversation.objects.select_for_update().prefetch_related('messages', 'agent__user').get(id=conversation_id)
            
            # Prevent duplicate ticket creation
            if hasattr(conversation, 'ticket'):
                logger.warning(f"Ticket already exists for conversation {conversation_id}. Aborting task.")
                return

            # 1. Generate a summary for the ticket title
            transcript = "\n".join([f"{msg.sender_type}: {msg.content}" for msg in conversation.messages.all().order_by('created_at')])
            summary = "User needs assistance" # Default title
            if transcript:
                try:
                    client = LyzrClient()
                    response = client.summarize_text(transcript)
                    if response.get('summary'):
                        summary = response['summary']
                    conversation.summary = summary
                    conversation.save()
                except LyzrAPIError as e:
                    logger.error(f"Lyzr API error summarizing conversation {conversation_id}: {e}")
            
            # 2. Find the default team of the agent's owner to assign the ticket
            agent_owner = conversation.agent.user
            default_team = Team.objects.filter(owner=agent_owner).first()
            
            # 3. Create the ticket
            ticket = Ticket.objects.create(
                conversation=conversation,
                title=summary[:255], # Truncate title to fit model max_length
                status=Ticket.Status.NEW,
                priority=Ticket.Priority.NORMAL,
                team=default_team
            )
            logger.info(f"Successfully created ticket {ticket.ticket_id} from conversation {conversation_id}")
            
            # 4. Send a confirmation message back to the user via WebSocket
            message_to_send = {
                'id': f'ticket_created_{ticket.id}',
                'sender': 'SYSTEM',
                'content': f"A new support ticket (#{ticket.ticket_id}) has been created for you. Our team will review your request and get back to you shortly."
            }
        
        # Send notification after the transaction is successfully committed
        async_to_sync(channel_layer.group_send)(
            f'chat_{conversation.end_user_id}',
            {
                'type': 'ticket.created.message',
                'message': message_to_send
            }
        )

    except Conversation.DoesNotExist:
        logger.error(f"Conversation {conversation_id} not found for ticket creation.")
    except Exception as e:
        logger.error(f"Failed to create ticket from conversation {conversation_id}: {e}", exc_info=True)