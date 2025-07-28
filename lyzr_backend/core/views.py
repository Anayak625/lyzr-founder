# core/views.py

from django.conf import settings
from rest_framework import generics, permissions, status, viewsets, parsers, serializers
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.views import APIView
from django.db import transaction
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta
import uuid

from .models import User, Agent, KnowledgeBase, KnowledgeSource, Conversation,Message
from .serializers import (
    RegisterSerializer, UserSerializer, AgentSerializer, KnowledgeSourceSerializer,
    TicketListSerializer, TicketDetailSerializer, PublicAgentConfigSerializer
)
from .tasks import create_lyzr_stack_task, index_knowledge_source_task, make_lyzr_request

# --- Authentication and User Views ---
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

class MyTokenObtainPairView(TokenObtainPairView):
    pass

class UserDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    def get_object(self):
        return self.request.user

# --- Corrected Agent and Knowledge Source Views ---
class AgentViewSet(viewsets.ModelViewSet):
    """
    Handles all CRUD operations for Agents.
    """
    serializer_class = AgentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        This view should only return agents owned by the currently authenticated user.
        """
        return Agent.objects.select_related('knowledge_base').prefetch_related('knowledge_base__sources').filter(user=self.request.user)

    def perform_create(self, serializer):
        """
        Custom logic for when a new agent is created.
        - Associates the agent with the user.
        - Creates a KnowledgeBase with a valid collection name.
        - Triggers the background task to set up the Lyzr stack.
        """
        try:
            with transaction.atomic():
                agent = serializer.save(user=self.request.user)
                
                # CORRECTED: Generate a valid class name for the vector DB.
                # Starts with a capital letter and uses .hex to remove hyphens from the UUID.
                valid_collection_name = f"LyzrAgent{agent.id.hex}"
                
                KnowledgeBase.objects.create(
                    agent=agent,
                    collection_name=valid_collection_name
                )
            
            create_lyzr_stack_task.delay(agent.id)
        except Exception as e:
            raise serializers.ValidationError({"error": str(e)})


class KnowledgeSourceViewSet(viewsets.ModelViewSet):
    """
    Handles CRUD for KnowledgeSources nested under a specific agent.
    """
    serializer_class = KnowledgeSourceSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        """
        Return sources only for the agent specified in the URL.
        """
        agent_pk = self.kwargs.get('agent_pk')
        return KnowledgeSource.objects.filter(
            knowledge_base__agent__id=agent_pk,
            knowledge_base__agent__user=self.request.user
        )

    def perform_create(self, serializer):
        """
        Creates a new knowledge source and associates it with the agent from the URL.
        """
        agent_pk = self.kwargs.get('agent_pk')
        try:
            kb = KnowledgeBase.objects.get(agent_id=agent_pk, agent__user=self.request.user)
            source = serializer.save(knowledge_base=kb)
            index_knowledge_source_task.delay(source.id)
        except KnowledgeBase.DoesNotExist:
            raise serializers.ValidationError("Agent or KnowledgeBase not found for this user.")


# --- Other Application Views ---
class PublicAgentConfigView(generics.RetrieveAPIView):
    queryset = Agent.objects.filter(is_active=True)
    serializer_class = PublicAgentConfigSerializer
    permission_classes = (permissions.AllowAny,)
    lookup_field = 'id'

class TicketListView(generics.ListAPIView):
    serializer_class = TicketListSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Conversation.objects.filter(
            agent__user=self.request.user, 
            status=Conversation.Status.FLAGGED
        ).order_by('-updated_at')

class TicketDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = TicketDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Conversation.objects.filter(agent__user=self.request.user)

class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request, *args, **kwargs):
        agent = request.user.agents.first()
        if not agent:
            return Response({"error": "Agent not configured."}, status=status.HTTP_404_NOT_FOUND)
        
        one_month_ago = timezone.now() - timedelta(days=30)
        conversations = Conversation.objects.filter(agent=agent, created_at__gte=one_month_ago)
        total_chats = conversations.count()
        resolved_chats = conversations.filter(status=Conversation.Status.RESOLVED).count()
        resolution_rate = (resolved_chats / total_chats * 100) if total_chats > 0 else 0
        seven_days_ago = timezone.now().date() - timedelta(days=6)
        daily_counts = conversations.filter(created_at__date__gte=seven_days_ago).extra(select={'day': 'date(created_at)'}).values('day').annotate(chats=Count('id')).order_by('day')
        chat_volume = [{'day': item['day'].strftime('%a'), 'chats': item['chats']} for item in daily_counts]
        frequent_questions = TicketListSerializer(Conversation.objects.filter(agent=agent, status=Conversation.Status.FLAGGED).order_by('-updated_at')[:5], many=True).data
        
        return Response({
            "kpis": {"total_chats": total_chats, "resolution_rate": round(resolution_rate, 2), "flagged_tickets": Conversation.objects.filter(agent=agent, status=Conversation.Status.FLAGGED).count()},
            "chat_volume_trends": chat_volume, 
            "frequent_questions": frequent_questions
        })
        
        
from rest_framework.decorators import action
# --- Real-Time Chat Interaction View ---
class ConversationViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    @action(detail=False, methods=['post'], url_path='chat')
    def chat_interaction(self, request):
        agent_id = request.data.get('agentId')
        session_id = request.data.get('sessionId')
        message_content = request.data.get('message')

        if not all([agent_id, session_id, message_content]):
            return Response({"error": "agentId, sessionId, and message are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Note: We use .select_related('user') for efficiency
            agent = Agent.objects.select_related('user').get(id=agent_id, is_active=True)
        except Agent.DoesNotExist:
            return Response({"error": "Active agent not found."}, status=status.HTTP_404_NOT_FOUND)

        conversation, _ = Conversation.objects.get_or_create(agent=agent, end_user_id=session_id)
        Message.objects.create(conversation=conversation, sender_type=Message.Sender.USER, content=message_content)

        # --- REAL AI RESPONSE LOGIC ---
        # Construct the payload exactly as specified in the Lyzr API documentation.
        lyzr_payload = {
            "agent_id": agent.lyzr_agent_id,
            "session_id": session_id,
            "message": message_content,
            "user_id": agent.user.email,  # Using the agent owner's email
            "system_prompt_variables": {}, # Sending empty objects as per the example
            "filter_variables": {},
            "features": [],
            "assets": []
        }

        try:
            # Call the Lyzr Agent API directly for an immediate response.
            response_data = make_lyzr_request(
                settings.LYZR_AGENT_API_BASE_URL, 'POST', 'inference/chat/', json=lyzr_payload
            )
            # Extract the reply from the 'agent_response' key.
            ai_response_content = response_data.get("agent_response")
            if not ai_response_content:
                raise ValueError("Lyzr API response did not contain an 'agent_response' key.")

        except Exception as e:
            print(f"Error calling Lyzr Agent API: {e}")
            ai_response_content = "I'm sorry, I encountered an error. Please try again later."
            
        # Save the AI's message and send it back to the user.
        ai_message = Message.objects.create(
            conversation=conversation, sender_type=Message.Sender.AI, content=ai_response_content
        )

        return Response({
            "response": ai_message.content,
            "messageId": ai_message.id,
            "conversationId": conversation.id
        }, status=status.HTTP_200_OK)