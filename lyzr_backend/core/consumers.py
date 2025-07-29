# Enhanced WebSocket Consumer with comprehensive error handling and fixes

import json
import logging
import uuid
import asyncio
from typing import Dict, Any, Optional, List
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from channels.exceptions import DenyConnection
from django.core.exceptions import ValidationError
from .models import Agent, KnowledgeBase, Conversation, Message
from .services.lyzr_client import LyzrClient, LyzrAPIError
from .tasks import summarize_conversation_task
from django.utils import timezone


logger = logging.getLogger(__name__)


class ChatConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.agent = None
        self.conversation = None
        self.conversation_group_name = None
        self.client = None
        self.connection_established = False

    async def connect(self):
        """Enhanced connection handling with proper validation"""
        try:
            self.agent_id = self.scope['url_route']['kwargs']['agent_id']
            self.session_id = self.scope['url_route']['kwargs']['session_id']
            
            # Validate UUID format
            try:
                uuid.UUID(str(self.agent_id))
            except ValueError:
                logger.warning(f"Invalid agent_id format: {self.agent_id}")
                await self.close(code=4000)
                return
            
            # Get agent with error handling
            self.agent = await self.get_agent()
            if not self.agent:
                logger.warning(f"Agent not found: {self.agent_id}")
                await self.close(code=4004)
                return
                
            if not (self.agent.lyzr_agent_id and self.agent.is_active):
                logger.warning(f"Agent {self.agent_id} is not properly configured or inactive")
                await self.close(code=4003)
                return

            # Create or get conversation
            try:
                self.conversation = await self.get_or_create_conversation()
            except Exception as e:
                logger.error(f"Failed to create conversation: {e}")
                await self.close(code=4005)
                return
            
            # Setup group name and join group
            self.conversation_group_name = f'chat_{self.conversation.id}'
            await self.channel_layer.group_add(self.conversation_group_name, self.channel_name)
            
            # Accept connection
            await self.accept()
            self.connection_established = True
            
            logger.info(f"WebSocket connected for agent {self.agent_id}, session {self.session_id}")
            
            # Send connection confirmation with history
            try:
                history = await self.get_message_history()
                await self.send(text_data=json.dumps({
                    'event_type': 'connection_established',
                    'conversation_id': str(self.conversation.id),
                    'history': history,
                    'status': 'connected'
                }))
            except Exception as e:
                logger.error(f"Failed to send connection confirmation: {e}")
                # Don't close connection for this, just log the error
                
        except Exception as e:
            logger.error(f"Unexpected error during connection: {e}")
            await self.close(code=4500)

    async def disconnect(self, close_code):
        """Enhanced disconnect handling with cleanup"""
        logger.info(f"WebSocket disconnecting for session {self.session_id}, code: {close_code}")
        
        try:
            # Leave group if we joined it
            if hasattr(self, 'conversation_group_name') and self.conversation_group_name:
                await self.channel_layer.group_discard(self.conversation_group_name, self.channel_name)
            
            # Trigger conversation summarization if we have enough messages
            if hasattr(self, 'conversation') and self.conversation:
                try:
                    message_count = await self.get_message_count()
                    if message_count >= 4:  # Only summarize if enough messages
                        summarize_conversation_task.delay(self.conversation.id)
                except Exception as e:
                    logger.error(f"Failed to trigger summarization: {e}")
                    
        except Exception as e:
            logger.error(f"Error during disconnect cleanup: {e}")
        finally:
            # Mark connection as closed
            self.connection_established = False

    async def receive(self, text_data):
        """Enhanced message receiving with validation and error handling"""
        if not self.connection_established:
            logger.warning("Received message on non-established connection")
            return
            
        try:
            # Parse and validate message data  
            try:
                data = json.loads(text_data)
            except json.JSONDecodeError:
                await self.send_error("Invalid JSON format")
                return
            
            event_type = data.get('event_type')
            
            if event_type == 'user_message':
                await self.handle_user_message(data)
            elif event_type == 'feedback':
                await self.handle_feedback(data)
            elif event_type == 'ping':
                await self.handle_ping()
            else:
                logger.warning(f"Unknown event type received: {event_type}")
                await self.send_error(f"Unknown event type: {event_type}")
                
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            await self.send_error("Internal server error processing message")

    async def handle_user_message(self, data: Dict[str, Any]):
        """Enhanced user message handling with better error handling"""
        try:
            message_content = data.get('message', '').strip()
            
            if not message_content:
                await self.send_error("Empty message content")
                return
            
            if len(message_content) > 10000:  # Reasonable limit
                await self.send_error("Message too long")
                return
            
            # Save user message
            try:
                user_message = await self.save_message(
                    sender_type=Message.Sender.USER, 
                    content=message_content
                )
            except Exception as e:
                logger.error(f"Failed to save user message: {e}")
                await self.send_error("Failed to save message")
                return
            
            # Broadcast user message to group
            await self.channel_layer.group_send(self.conversation_group_name, {
                'type': 'chat_message',
                'message_id': str(user_message.id),
                'sender': 'USER',
                'content': user_message.content,
                'created_at': user_message.created_at.isoformat()
            })
            
            # Get AI response
            await self.get_ai_response(message_content)
            
        except Exception as e:
            logger.error(f"Error handling user message: {e}")
            await self.send_error("Failed to process message")

    async def get_ai_response(self, message_content: str):
        """Get AI response with comprehensive error handling"""
        try:
            # Initialize client if not exists
            if not self.client:
                self.client = LyzrClient()
            
            # Get RAG ID
            rag_id = await self.get_rag_id()
            
            # Make API call with timeout handling
            try:
                api_response_data = await database_sync_to_async(self.client.get_chat_response)(
                    agent_id=self.agent.lyzr_agent_id,
                    session_id=self.session_id,
                    message=message_content,
                    user_email=self.agent.user.email,
                    rag_id=rag_id
                )
                
                logger.debug(f"Received from Lyzr API: {api_response_data}")
                
            except LyzrAPIError as e:
                logger.error(f"Lyzr API error: {e}")
                await self.send_ai_error("I'm experiencing technical difficulties. Please try again.")
                return
            except Exception as e:
                logger.error(f"Unexpected API error: {e}")
                await self.send_ai_error("I'm sorry, I couldn't process that right now.")
                return
            
            # Parse AI response with fallbacks
            ai_response_content = self.parse_ai_response(api_response_data)
            
            # Save AI message
            try:
                ai_message = await self.save_message(
                    sender_type=Message.Sender.AI, 
                    content=ai_response_content
                )
            except Exception as e:
                logger.error(f"Failed to save AI message: {e}")
                # Still send the response even if save fails
                ai_message = type('obj', (object,), {
                    'id': 'temp_id',
                    'content': ai_response_content,
                    'created_at': timezone.now()
                })
            
            # Broadcast AI response
            await self.channel_layer.group_send(self.conversation_group_name, {
                'type': 'chat_message',
                'message_id': str(ai_message.id),
                'sender': 'AI',
                'content': ai_message.content,
                'created_at': ai_message.created_at.isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error getting AI response: {e}")
            await self.send_ai_error("I encountered an unexpected error. Please try again.")

    def parse_ai_response(self, api_response_data: Dict[str, Any]) -> str:
        """Parse AI response with multiple fallback strategies"""
        default_response = "I'm sorry, I could not process that request."
        
        if not isinstance(api_response_data, dict):
            logger.warning(f"Invalid response format: {type(api_response_data)}")
            return default_response
        
        # Try various response field names
        response_fields = ['response', 'message', 'answer', 'text', 'content', 'result']
        
        for field in response_fields:
            if field in api_response_data:
                response_value = api_response_data[field]
                
                if isinstance(response_value, dict):
                    # If nested, try common sub-fields
                    for subfield in ['response', 'message', 'text', 'content']:
                        if subfield in response_value:
                            content = response_value[subfield]
                            if isinstance(content, str) and content.strip():
                                return content.strip()
                elif isinstance(response_value, str) and response_value.strip():
                    return response_value.strip()
        
        logger.warning(f"Could not extract response from: {api_response_data}")
        return default_response

    async def handle_feedback(self, data: Dict[str, Any]):
        """Handle feedback with validation"""
        try:
            message_id = data.get('message_id')
            feedback_value = data.get('feedback')
            
            if not message_id or feedback_value not in ['positive', 'negative']:
                await self.send_error("Invalid feedback data")
                return
            
            await self.save_feedback(message_id, feedback_value)
            await self.send(text_data=json.dumps({
                'event_type': 'feedback_confirmation',
                'message_id': message_id,
                'status': 'saved'
            }))
            
        except Exception as e:
            logger.error(f"Error handling feedback: {e}")
            await self.send_error("Failed to save feedback")

    async def handle_ping(self):
        """Handle ping requests for connection health"""
        await self.send(text_data=json.dumps({
            'event_type': 'pong',
            'timestamp': timezone.now().isoformat()
        }))

    async def send_error(self, message: str):
        """Send error message to client"""
        await self.send(text_data=json.dumps({
            'event_type': 'error',
            'message': message,
            'timestamp': timezone.now().isoformat()
        }))

    async def send_ai_error(self, message: str):
        """Send AI error as a chat message"""
        await self.channel_layer.group_send(self.conversation_group_name, {
            'type': 'chat_message',
            'sender': 'AI',
            'content': message,
            'error': True,
            'timestamp': timezone.now().isoformat()
        })

    async def chat_message(self, event):
        """Send chat message to WebSocket"""
        message_data = {
            'event_type': 'new_message',
            'message': {
                'id': event.get('message_id'),
                'sender': event['sender'],
                'content': event['content'],
                'created_at': event.get('created_at'),
                'error': event.get('error', False)
            }
        }
        await self.send(text_data=json.dumps(message_data))
        
    @database_sync_to_async
    def get_agent(self) -> Optional[Agent]:
        """Get agent with proper error handling"""
        try:
            return Agent.objects.select_related('user').get(id=self.agent_id, is_active=True)
        except Agent.DoesNotExist:
            logger.warning(f"Agent {self.agent_id} not found")
            return None
        except Exception as e:
            logger.error(f"Error getting agent {self.agent_id}: {e}")
            return None
            
    @database_sync_to_async
    def get_or_create_conversation(self) -> Conversation:
        """Get or create conversation with error handling"""
        try:
            conversation, created = Conversation.objects.get_or_create(
                agent=self.agent,
                end_user_id=self.session_id,
                defaults={'status': Conversation.Status.ACTIVE}
            )
            
            if created:
                logger.info(f"Created new conversation {conversation.id}")
            else:
                logger.debug(f"Using existing conversation {conversation.id}")
                
            return conversation
        except Exception as e:
            logger.error(f"Error creating conversation: {e}")
            raise

    @database_sync_to_async
    def get_message_history(self) -> List[Dict[str, Any]]:
        """Get message history with pagination"""
        try:
            messages = Message.objects.filter(
                conversation=self.conversation
            ).order_by('created_at')[:50]  # Limit to recent messages
            
            return [
                {
                    'id': str(msg.id),
                    'sender': msg.sender_type,
                    'content': msg.content,
                    'created_at': msg.created_at.isoformat(),
                    'feedback': msg.feedback
                } for msg in messages
            ]
        except Exception as e:
            logger.error(f"Error getting message history: {e}")
            return []

    @database_sync_to_async
    def get_message_count(self) -> int:
        """Get message count for conversation"""
        try:
            return Message.objects.filter(conversation=self.conversation).count()
        except Exception as e:
            logger.error(f"Error getting message count: {e}")
            return 0

    @database_sync_to_async
    def save_message(self, sender_type: str, content: str) -> Message:
        """Save message with validation"""
        try:
            if len(content) > 10000:  # Reasonable limit
                content = content[:10000] + "... [truncated]"
                
            return Message.objects.create(
                conversation=self.conversation,
                sender_type=sender_type,
                content=content
            )
        except Exception as e:
            logger.error(f"Error saving message: {e}")
            raise

    @database_sync_to_async
    def save_feedback(self, message_id: str, feedback_value: str):
        """Save feedback with validation"""
        try:
            feedback = Message.Feedback.POSITIVE if feedback_value == 'positive' else Message.Feedback.NEGATIVE
            
            updated_count = Message.objects.filter(
                id=uuid.UUID(message_id),
                conversation=self.conversation
            ).update(feedback=feedback)
            
            if updated_count == 0:
                logger.warning(f"No message found to update feedback: {message_id}")
            else:
                logger.info(f"Updated feedback for message {message_id}: {feedback_value}")
                
        except (ValueError, ValidationError) as e:
            logger.warning(f"Invalid message_id format {message_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Error saving feedback: {e}")
            raise
    
    @database_sync_to_async
    def get_rag_id(self) -> Optional[str]:
        """Get RAG ID with error handling"""
        try:
            return self.agent.knowledge_base.lyzr_rag_id
        except KnowledgeBase.DoesNotExist:
            logger.debug(f"No knowledge base found for agent {self.agent_id}")
            return None
        except Exception as e:
            logger.error(f"Error getting RAG ID: {e}")
            return None


# Additional utility functions for WebSocket management

class ConnectionManager:
    """Manage WebSocket connections and health checks"""
    
    def __init__(self):
        self.active_connections = {}
    
    def add_connection(self, session_id: str, consumer):
        self.active_connections[session_id] = consumer
    
    def remove_connection(self, session_id: str):
        self.active_connections.pop(session_id, None)
    
    def get_connection_count(self) -> int:
        return len(self.active_connections)
    
    async def broadcast_to_all(self, message: Dict[str, Any]):
        """Broadcast message to all active connections"""
        disconnected = []
        
        for session_id, consumer in self.active_connections.items():
            try:
                await consumer.send(text_data=json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to send to {session_id}: {e}")
                disconnected.append(session_id)
        
        # Clean up disconnected sessions
        for session_id in disconnected:
            self.remove_connection(session_id)


# Global connection manager instance
connection_manager = ConnectionManager()