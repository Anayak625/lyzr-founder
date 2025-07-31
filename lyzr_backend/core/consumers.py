# chat/consumers.py

import json
import logging
import uuid
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from core.models import Agent, Conversation, Message, KnowledgeBase
from core.services.lyzr_client import LyzrClient, LyzrAPIError

logger = logging.getLogger(__name__)

class ChatConsumer(AsyncJsonWebsocketConsumer):
    """
    A robust WebSocket consumer for real-time chat that handles:
    - Connection authentication and validation.
    - Persistent conversation history with a database.
    - Real-time message broadcasting to the correct session.
    - Interaction with the Lyzr AI service.
    - Saving user feedback for messages.
    """
    
    async def connect(self):
        """
        Handles new WebSocket connections.
        Validates the agent, gets/creates a conversation, joins a group,
        and sends the chat history to the client.
        """
        self.agent_id = self.scope['url_route']['kwargs']['agent_id']
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.room_group_name = f'chat_{self.session_id}'

        try:
            # 1. Validate Agent
            self.agent = await self.get_agent(self.agent_id)
            if not self.agent or not self.agent.is_active or not self.agent.lyzr_agent_id:
                logger.warning(f"Connection denied for agent_id '{self.agent_id}': Agent not found, inactive, or not configured.")
                await self.close(code=4004)
                return

            # 2. Get or Create a Conversation record in the database
            self.conversation = await self.get_or_create_conversation(self.agent.id, self.session_id)
            
            # 3. Join the room group for this specific session
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            
            # 4. Accept the connection
            await self.accept()
            logger.info(f"WebSocket connected for agent '{self.agent_id}' in session '{self.session_id}'.")
            
            # 5. Send the existing chat history to the newly connected client
            await self.send_message_history()

        except Exception as e:
            logger.error(f"Unexpected error during connect for agent '{self.agent_id}': {e}", exc_info=True)
            await self.close()

    async def disconnect(self, close_code):
        """
        Handles WebSocket disconnections.
        Cleans up by leaving the room group.
        """
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        logger.info(f"WebSocket disconnected for session '{self.session_id}' with code: {close_code}")

    async def receive_json(self, content):
        """
        Receives messages from the WebSocket client.
        Routes the message to the appropriate handler based on 'event_type'.
        """
        event_type = content.get('event_type')
        
        handlers = {
            'user_message': self.handle_user_message,
            'feedback': self.handle_feedback,
        }
        
        handler = handlers.get(event_type)
        if handler:
            await handler(content)
        else:
            logger.warning(f"Unknown event type received in session '{self.session_id}': {event_type}")

    # --- Event Handlers ---

    async def handle_user_message(self, event_data):
        """
        Handles incoming messages from the user.
        Saves the message, gets a response from the AI, saves the AI response,
        and broadcasts it back to the client.
        """
        message_text = event_data.get('message', '').strip()
        if not message_text:
            return

        # 1. Save the user's message to the database
        await self.save_message('USER', message_text)
        
        # 2. Get a response from the Lyzr AI service
        try:
            client = LyzrClient()
            rag_id = await self.get_rag_id(self.agent)

            # Note: Using database_sync_to_async for the blocking network call
            response_data = await database_sync_to_async(client.get_chat_response)(
                agent_id=self.agent.lyzr_agent_id,
                session_id=self.session_id,
                message=message_text,
                user_email=self.session_id, # Use session_id as a unique user identifier for Lyzr
                rag_id=rag_id
            )
            
            ai_content = response_data.get('response', "I'm sorry, I encountered an error and couldn't respond.")
            
            # 3. Save the AI's response to the database
            ai_message_obj = await self.save_message('AI', ai_content)

            # 4. Broadcast the new AI message to the client
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'broadcast_message', # This calls the 'broadcast_message' method below
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
        """
        Handles feedback submissions from the client.
        Saves the feedback to the corresponding message in the database.
        """
        message_id = event_data.get('message_id')
        feedback = event_data.get('feedback') # Expects 'POSITIVE' or 'NEGATIVE'
        
        if not all([message_id, feedback]):
            logger.warning(f"Invalid feedback event received: {event_data}")
            return
            
        success = await self.save_feedback(message_id, feedback)
        
        # Send a confirmation back to the client so the UI can update
        if success:
            await self.send_json({
                'event_type': 'feedback_confirmation',
                'message_id': message_id
            })

    # --- Broadcasting and Sending Methods ---

    async def send_message_history(self):
        """

        Fetches all messages for the current conversation and sends them one by one
        to the client. This populates the chat on connection.
        """
        messages = await self.get_message_history()
        for msg in messages:
            # We use group_send to ensure it only goes to the single client in the group
            # that just connected, matching the `broadcast_message` format.
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'broadcast_message',
                    'message': msg
                }
            )

    async def broadcast_message(self, event):
        """
        This method is called by `channel_layer.group_send` with `type: 'broadcast_message'`.
        It sends the provided message data to the client.
        """
        await self.send_json({
            'event_type': 'new_message',
            'message': event['message']
        })

    async def send_error_message(self, error_text: str):
        """Sends a formatted error message to the client as if it were an AI message."""
        await self.send_json({
            'event_type': 'new_message',
            'message': {
                'id': f'error_{uuid.uuid4()}',
                'sender': 'AI',
                'content': error_text,
                'feedback': None,
                'is_error': True # Custom flag for the frontend if needed
            }
        })

    # --- Database Helper Methods (decorated with @database_sync_to_async) ---

    @database_sync_to_async
    def get_agent(self, agent_id: str):
        try:
            return Agent.objects.select_related('knowledge_base').get(id=agent_id)
        except Agent.DoesNotExist:
            return None

    @database_sync_to_async
    def get_or_create_conversation(self, agent_id: uuid.UUID, session_id: str):
        conversation, created = Conversation.objects.get_or_create(
            agent_id=agent_id,
            end_user_id=session_id,
            defaults={'status': Conversation.Status.ACTIVE}
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
        # Touch the conversation to update its 'updated_at' timestamp,
        # which is useful for sorting tickets.
        self.conversation.updated_at = timezone.now()
        self.conversation.save(update_fields=['updated_at'])
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
            # Validate feedback value
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
            # Efficiently check if knowledge_base exists and get its lyzr_rag_id
            return agent.knowledge_base.lyzr_rag_id
        except KnowledgeBase.DoesNotExist:
            return None