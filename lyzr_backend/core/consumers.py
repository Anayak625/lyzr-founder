import json
import logging
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Agent, KnowledgeBase, Conversation, Message
from .services.lyzr_client import LyzrClient
from .tasks import summarize_conversation_task

logger = logging.getLogger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.agent_id = self.scope['url_route']['kwargs']['agent_id']
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        
        self.agent = await self.get_agent()
        if not (self.agent and self.agent.lyzr_agent_id and self.agent.is_active):
            logger.warning(f"Connection rejected for agent {self.agent_id}. Not found, inactive, or not configured.")
            await self.close()
            return

        self.conversation = await self.get_or_create_conversation()
        self.conversation_group_name = f'chat_{self.conversation.id}'
        
        await self.channel_layer.group_add(self.conversation_group_name, self.channel_name)
        await self.accept()
        logger.info(f"WebSocket connected for agent {self.agent_id}, session {self.session_id}")
        
        history = await self.get_message_history()
        await self.send(text_data=json.dumps({
            'event_type': 'connection_established',
            'conversation_id': str(self.conversation.id),
            'history': history,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, 'conversation_group_name'):
            await self.channel_layer.group_discard(self.conversation_group_name, self.channel_name)
        
        if hasattr(self, 'conversation'):
            summarize_conversation_task.delay(self.conversation.id)
            
        logger.info(f"WebSocket disconnected for session {self.session_id}")

    async def receive(self, text_data):
        data = json.loads(text_data)
        event_type = data.get('event_type')
        
        if event_type == 'user_message':
            await self.handle_user_message(data['message'])
        elif event_type == 'feedback':
            await self.handle_feedback(data['message_id'], data['feedback'])
        else:
            logger.warning(f"Unknown event type received: {event_type}")

    async def handle_user_message(self, message_content):
        user_message = await self.save_message(sender_type=Message.Sender.USER, content=message_content)
        await self.channel_layer.group_send(self.conversation_group_name, {
            'type': 'chat_message',
            'message_id': str(user_message.id),
            'sender': 'USER',
            'content': user_message.content,
            'created_at': user_message.created_at.isoformat()
        })
        
        try:
            client = LyzrClient()
            rag_id = await self.get_rag_id()
            api_response_data = await database_sync_to_async(client.get_chat_response)(
                agent_id=self.agent.lyzr_agent_id,
                session_id=self.session_id,
                message=message_content,
                user_email=self.agent.user.email,
                rag_id=rag_id 
            )
            logger.debug(f"Received from Lyzr API: {api_response_data}")
            ai_response_content = "I'm sorry, I could not process that."
            if isinstance(api_response_data, dict):
                response_value = api_response_data.get("response")
                if isinstance(response_value, dict):
                    ai_response_content = response_value.get("response", ai_response_content)
                elif isinstance(response_value, str):
                    ai_response_content = response_value
                    
            ai_message = await self.save_message(sender_type=Message.Sender.AI, content=ai_response_content)
            
            await self.channel_layer.group_send(self.conversation_group_name, {
                'type': 'chat_message',
                'message_id': str(ai_message.id),
                'sender': 'AI',
                'content': ai_message.content,
                'created_at': ai_message.created_at.isoformat()
            })
        except Exception as e:
            logger.error(f"Error during chat inference for session {self.session_id}: {e}")
            error_message = "An error occurred. Our team has been notified. Please try again shortly."
            await self.channel_layer.group_send(self.conversation_group_name, {
                'type': 'chat_message',
                'sender': 'AI',
                'content': error_message,
                'error': True
            })

    async def handle_feedback(self, message_id, feedback_value):
        await self.save_feedback(message_id, feedback_value)
        await self.send(text_data=json.dumps({
            'event_type': 'feedback_confirmation',
            'message_id': message_id
        }))

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'event_type': 'new_message',
            'message': {
                'id': event.get('message_id'),
                'sender': event['sender'],
                'content': event['content'],
                'created_at': event.get('created_at'),
            }
        }))
        
    @database_sync_to_async
    def get_agent(self):
        try:
            return Agent.objects.select_related('user').get(id=self.agent_id)
        except Agent.DoesNotExist:
            return None
            
    @database_sync_to_async
    def get_or_create_conversation(self):
        conversation, created = Conversation.objects.get_or_create(
            agent=self.agent,
            end_user_id=self.session_id,
            defaults={'status': Conversation.Status.ACTIVE}
        )
        return conversation

    @database_sync_to_async
    def get_message_history(self):
        messages = Message.objects.filter(conversation=self.conversation).order_by('created_at')[:50]
        return [
            {
                'id': str(msg.id),
                'sender': msg.sender_type,
                'content': msg.content,
                'created_at': msg.created_at.isoformat(),
            } for msg in messages
        ]

    @database_sync_to_async
    def save_message(self, sender_type, content):
        return Message.objects.create(
            conversation=self.conversation,
            sender_type=sender_type,
            content=content
        )

    @database_sync_to_async
    def save_feedback(self, message_id, feedback_value):
        try:
            feedback = Message.Feedback.POSITIVE if feedback_value == 'positive' else Message.Feedback.NEGATIVE
            Message.objects.filter(
                id=uuid.UUID(message_id),
                conversation=self.conversation
            ).update(feedback=feedback)
        except (ValueError, Message.DoesNotExist):
            logger.warning(f"Could not save feedback for invalid message_id: {message_id}")
            
    
    @database_sync_to_async
    def get_rag_id(self):
        try:
            return self.agent.knowledge_base.lyzr_rag_id
        except KnowledgeBase.DoesNotExist:
            return None