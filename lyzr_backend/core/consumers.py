import json
import logging
import uuid
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from core.models import Agent, Conversation, Message, KnowledgeBase
from core.services.lyzr_client import LyzrClient, LyzrAPIError
from billing.models import Subscription, Usage
from tickets.models import Ticket
from tickets.tasks import create_ticket_from_conversation_task

logger = logging.getLogger(__name__)

ESCALATION_KEYWORDS = ['help', 'agent', 'support', 'human', 'ticket', 'operator']

class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.agent_id = self.scope['url_route']['kwargs']['agent_id']
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.room_group_name = f'chat_{self.session_id}'

        try:
            self.agent = await self.get_agent(self.agent_id)
            if not self.agent or not self.agent.is_active or not self.agent.lyzr_agent_id:
                logger.warning(f"Connection denied for agent_id '{self.agent_id}': Agent not found, inactive, or not configured.")
                await self.close(code=4004)
                return

            self.conversation = await self.get_or_create_conversation(self.agent.id, self.session_id)
            
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            
            await self.accept()
            logger.info(f"WebSocket connected for agent '{self.agent_id}' in session '{self.session_id}'.")
            
            await self.send_message_history()

        except Exception as e:
            logger.error(f"Unexpected error during connect for agent '{self.agent_id}': {e}", exc_info=True)
            await self.close()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        logger.info(f"WebSocket disconnected for session '{self.session_id}' with code: {close_code}")

    async def receive_json(self, content):
        event_type = content.get('event_type')
        
        handlers = {
            'user_message': self.handle_user_message,
            'feedback': self.handle_feedback,
            'escalate_to_ticket': self.handle_escalation,
        }
        
        handler = handlers.get(event_type)
        if handler:
            await handler(content)
        else:
            logger.warning(f"Unknown event type received in session '{self.session_id}': {event_type}")


    async def handle_escalation(self, event_data):
        """
        Handles a request from the user to create a ticket from the conversation.
        """
        ticket_exists = await self.check_ticket_exists(self.conversation.id)
        if ticket_exists:
            await self.send_system_message("A support ticket has already been created for this conversation.")
            return

        create_ticket_from_conversation_task.delay(str(self.conversation.id))
        
        await self.send_system_message("We've received your request. A support ticket is being created...")


    async def ticket_created_message(self, event):
        """
        Receives the confirmation from the background task and sends it to the client.
        """
        await self.send_json({
            'event_type': 'new_message',
            'message': event['message']
        })
        
    async def handle_user_message(self, event_data):
        message_text = event_data.get('message', '').strip()
        if not message_text:
            return


        if message_text.lower() in ESCALATION_KEYWORDS:
            await self.save_message('USER', message_text)
            await self.handle_escalation(event_data) 
            return

        await self.save_message('USER', message_text)
        
        try:
            client = LyzrClient()
            rag_id = await self.get_rag_id(self.agent)

            response_data = await database_sync_to_async(client.get_chat_response)(
                agent_id=self.agent.lyzr_agent_id,
                session_id=self.session_id,
                message=message_text,
                user_email=self.session_id,
                rag_id=rag_id
            )
            
            ai_content = response_data.get('response', "I'm sorry, I encountered an error and couldn't respond.")
            
            ai_message_obj = await self.save_message('AI', ai_content)

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'broadcast_message',
                    'message': {
                        'id': str(ai_message_obj.id),
                        'sender': 'AI',
                        'content': ai_content,
                        'feedback': None
                    }
                }
            )

        except LyzrAPIError as e:
            logger.error(f"Lyzr API Error for agent '{self.agent.id}': {e}")
            await self.send_error_message("My apologies, I'm having trouble connecting to my core functions right now. Please try again in a moment.")
        except Exception as e:
            logger.error(f"General Error handling user message for agent '{self.agent.id}': {e}", exc_info=True)
            await self.send_error_message("An unexpected error occurred. Please try your message again.")

    async def handle_feedback(self, event_data):
        message_id = event_data.get('message_id')
        feedback = event_data.get('feedback')
        
        if not all([message_id, feedback]):
            logger.warning(f"Invalid feedback event received: {event_data}")
            return
            
        success = await self.save_feedback(message_id, feedback)
        
        if success:
            await self.send_json({
                'event_type': 'feedback_confirmation',
                'message_id': message_id
            })

    async def send_message_history(self):
        messages = await self.get_message_history()
        for msg in messages:
            await self.send_json({
                'event_type': 'new_message',
                'message': msg
            })

    async def broadcast_message(self, event):
        await self.send_json({
            'event_type': 'new_message',
            'message': event['message']
        })

    async def send_system_message(self, text: str):
        await self.send_json({
            'event_type': 'new_message',
            'message': {
                'id': f'system_{uuid.uuid4()}',
                'sender': 'SYSTEM',
                'content': text,
                'feedback': None,
            }
        })
        
    async def send_error_message(self, error_text: str):
        await self.send_json({
            'event_type': 'new_message',
            'message': {
                'id': f'error_{uuid.uuid4()}',
                'sender': 'AI',
                'content': error_text,
                'feedback': None,
                'is_error': True
            }
        })

    @database_sync_to_async
    def get_agent(self, agent_id: str):
        try:
            return Agent.objects.select_related('knowledge_base', 'user__subscription').get(id=agent_id)
        except Agent.DoesNotExist:
            return None

    @database_sync_to_async
    def get_or_create_conversation(self, agent_id: uuid.UUID, session_id: str):
        conversation, created = Conversation.objects.get_or_create(
            agent_id=agent_id,
            end_user_id=session_id,
        )
        if created:
            logger.info(f"Created new conversation '{conversation.id}' for session '{session_id}'.")
        return conversation

    @database_sync_to_async
    def save_message(self, sender: str, content: str):
        msg = Message.objects.create(
            conversation=self.conversation,
            sender_type=sender,
            content=content
        )
        self.conversation.updated_at = timezone.now()
        self.conversation.save(update_fields=['updated_at'])
        
        try:
            if hasattr(self.agent.user, 'subscription') and self.agent.user.subscription.status == 'ACTIVE':
                usage, _ = Usage.objects.get_or_create(
                    subscription=self.agent.user.subscription,
                    date=timezone.now().date()
                )
                usage.messages_count += 1
                usage.save()
        except Subscription.DoesNotExist:
            logger.warning(f"User {self.agent.user.email} has no subscription to track usage against.")
            pass
        except Exception as e:
            logger.error(f"Could not track usage for user {self.agent.user.email}: {e}")

        return msg

    @database_sync_to_async
    def get_message_history(self):
        messages = Message.objects.filter(conversation=self.conversation).order_by('created_at')
        return [
            {
                'id': str(msg.id),
                'sender': msg.sender_type,
                'content': msg.content,
                'feedback': msg.feedback,
            }
            for msg in messages
        ]

    @database_sync_to_async
    def save_feedback(self, message_id: str, feedback: str):
        try:
            if feedback not in [Message.Feedback.POSITIVE, Message.Feedback.NEGATIVE]:
                return False
                
            message = Message.objects.get(id=message_id, conversation=self.conversation)
            message.feedback = feedback
            message.save()
            logger.info(f"Feedback '{feedback}' saved for message '{message_id}'.")
            return True
        except Message.DoesNotExist:
            logger.warning(f"Attempted to save feedback for non-existent message_id: {message_id}")
            return False
        except Exception as e:
            logger.error(f"Error saving feedback for message '{message_id}': {e}")
            return False

    @database_sync_to_async
    def get_rag_id(self, agent: Agent):
        try:
            return agent.knowledge_base.lyzr_rag_id
        except KnowledgeBase.DoesNotExist:
            return None
        
    @database_sync_to_async
    def check_ticket_exists(self, conversation_id: uuid.UUID):
        return Ticket.objects.filter(conversation_id=conversation_id).exists()