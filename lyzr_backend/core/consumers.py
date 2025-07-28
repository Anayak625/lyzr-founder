import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Agent, KnowledgeBase, Conversation, Message
from .tasks import make_lyzr_request
from django.conf import settings
import uuid

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.local_agent_id = self.scope['url_route']['kwargs']['agent_id']
        self.agent, self.kb = await self.get_agent_and_kb()
        if not (self.agent and self.kb and self.agent.lyzr_agent_id and self.kb.rag_config_id):
            print("Chat connection rejected: Full Lyzr stack not configured.")
            await self.close()
            return
        self.end_user_id = self.scope['query_string'].decode() or self.channel_name
        self.conversation, _ = await self.get_or_create_conversation()
        self.conversation_group_name = f'chat_{self.conversation.id}'
        await self.channel_layer.group_add(self.conversation_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'conversation_group_name'):
            await self.channel_layer.group_discard(self.conversation_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get('event_type') == 'user_message': await self.handle_user_message(data['message'])
        elif data.get('event_type') == 'feedback': await self.handle_feedback(data['message_id'], data['feedback'])

    async def handle_user_message(self, message_content):
        await self.save_message(sender_type=Message.Sender.USER, content=message_content)
        try:
            # Note: Using v3 endpoint as per your examples
            endpoint = "inference/chat/"
            payload = { 
                "agent_id": self.agent.lyzr_agent_id, 
                "session_id": str(self.conversation.id), 
                "message": message_content, 
                # The 'assets' key should contain the RAG config ID
                "assets": [self.kb.rag_config_id] 
            }
            api_response_data = await database_sync_to_async(make_lyzr_request)(settings.LYZR_AGENT_API_BASE_URL, 'POST', endpoint, json=payload)
            
            # Parsing response based on your API example
            ai_response_content = api_response_data.get("agent_response", "Sorry, I could not process that.")
            ai_message = await self.save_message(sender_type=Message.Sender.AI, content=ai_response_content)
            
            await self.channel_layer.group_send(self.conversation_group_name, {
                'type': 'chat_message', 
                'message': ai_response_content, 
                'message_id': str(ai_message.id), 
                'sender': 'AI'
            })
        except Exception as e:
            print(f"Error during chat inference: {e}")
            await self.channel_layer.group_send(self.conversation_group_name, {
                'type': 'chat_message', 
                'message': "An error occurred while processing your request.", 
                'sender': 'AI', 'error': True
            })

    async def chat_message(self, event): await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def get_agent_and_kb(self):
        try:
            agent = Agent.objects.select_related('knowledge_base').get(id=self.local_agent_id)
            return agent, agent.knowledge_base
        except (Agent.DoesNotExist, KnowledgeBase.DoesNotExist): return None, None
            
    async def handle_feedback(self, message_id, feedback_value):
        await self.save_feedback(message_id, feedback_value)
        await self.send(text_data=json.dumps({'event_type': 'feedback_confirmation', 'message_id': message_id}))

    @database_sync_to_async
    def get_or_create_conversation(self):
        return Conversation.objects.get_or_create(agent=self.agent, end_user_id=self.end_user_id, defaults={'status': Conversation.Status.ACTIVE})

    @database_sync_to_async
    def save_message(self, sender_type, content):
        return Message.objects.create(conversation=self.conversation, sender_type=sender_type, content=content)

    @database_sync_to_async
    def save_feedback(self, message_id, feedback_value):
        try:
            msg_id = uuid.UUID(message_id)
            feedback = Message.Feedback.POSITIVE if feedback_value == 'positive' else Message.Feedback.NEGATIVE
            Message.objects.filter(id=msg_id, conversation__agent=self.agent).update(feedback=feedback)
        except (ValueError, Message.DoesNotExist):
            print(f"Could not save feedback for invalid message_id: {message_id}")