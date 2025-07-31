import logging
from django.db import transaction, models
from django.utils import timezone
from datetime import timedelta
from rest_framework import generics, permissions, status, viewsets, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.decorators import action
from .models import User, Agent, KnowledgeBase, KnowledgeSource, Conversation, Message, TicketNote
from .serializers import (
    RegisterSerializer, UserSerializer, AgentSerializer, KnowledgeSourceSerializer,
    TicketListSerializer, TicketDetailSerializer, PublicAgentConfigSerializer,
    ConversationAnalyticsSerializer, DailyChatVolumeSerializer, TicketNoteSerializer
)
from .tasks import create_lyzr_stack_task, index_knowledge_source_task,update_lyzr_agent_task
from .permissions import IsOwnerOrReadOnly, IsAgentOwner

logger = logging.getLogger(__name__)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

class MyTokenObtainPairView(TokenObtainPairView):
    pass

class UserDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_object(self):
        return self.request.user

class AgentViewSet(viewsets.ModelViewSet):
    serializer_class = AgentSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        return Agent.objects.select_related(
            'knowledge_base', 'user'
        ).prefetch_related(
            'knowledge_base__sources'
        ).filter(user=self.request.user)

    def perform_create(self, serializer):
        """
        Atomically create an Agent, its KnowledgeBase, and a default
        KnowledgeSource with initial instructions. Then, trigger Celery tasks
        to build the Lyzr stack and index the new source.
        """
        DEFAULT_KNOWLEDGE_TEXT = """
Your primary role is to be a helpful and friendly customer support assistant.
Key Instructions:
1.  Greeting: Always start the conversation with a warm and friendly greeting.
2.  Source of Truth: Your answers must be based exclusively on the information provided in the documents within your knowledge base.
3.  Handling Unknowns: If a user asks a question and the answer is not in your documents, you MUST state that you cannot find the answer. A good response is: "I'm sorry, I can't find the answer to that in my documents. Would you like me to connect you with a support team member?" Do not invent information.
4.  Tone: Maintain a professional, positive, and helpful tone.
"""
        try:
            with transaction.atomic():
                agent = serializer.save(user=self.request.user)
                valid_collection_name = f"kb_coll_{agent.id.hex[:16]}"
                kb = KnowledgeBase.objects.create(agent=agent, collection_name=valid_collection_name)
                default_source = KnowledgeSource.objects.create(
                    knowledge_base=kb,
                    type=KnowledgeSource.SourceType.TEXT,
                    title="Default Support Instructions",
                    content=DEFAULT_KNOWLEDGE_TEXT
                )
            
            create_lyzr_stack_task.delay(agent.id)
            index_knowledge_source_task.delay(default_source.id)

        except Exception as e:
            logger.error(f"Agent creation failed for user {self.request.user.email}: {e}")
            raise serializers.ValidationError({"detail": "Failed to create the agent and its default knowledge base."})
        
    def perform_update(self, serializer):
        """
        THE FIX: Override this method to trigger a background task
        after a successful update to our local database.
        """
        instance = serializer.save()

        logger.info(f"Queuing Lyzr update task for agent {instance.id}")
        update_lyzr_agent_task.delay(instance.id)
        
        
class KnowledgeSourceViewSet(viewsets.ModelViewSet):
    serializer_class = KnowledgeSourceSerializer
    permission_classes = [permissions.IsAuthenticated, IsAgentOwner]

    def get_queryset(self):
        agent_pk = self.kwargs.get('agent_pk')
        return KnowledgeSource.objects.filter(knowledge_base__agent_id=agent_pk)

    def perform_create(self, serializer):
        agent_pk = self.kwargs.get('agent_pk')
        try:
            kb = KnowledgeBase.objects.get(agent_id=agent_pk, agent__user=self.request.user)
            source = serializer.save(knowledge_base=kb)
            index_knowledge_source_task.delay(source.id)
        except KnowledgeBase.DoesNotExist:
            raise serializers.ValidationError("Agent or KnowledgeBase not found for this user.")

class PublicAgentConfigView(generics.RetrieveAPIView):
    queryset = Agent.objects.filter(is_active=True)
    serializer_class = PublicAgentConfigSerializer
    permission_classes = (permissions.AllowAny,)
    lookup_field= 'id'
    lookup_url_kwarg = 'id'

class TicketViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TicketListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(
            agent__user=self.request.user, 
        ).order_by('-updated_at')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TicketDetailSerializer
        return TicketListSerializer
    
    @action(detail=True, methods=['post'], serializer_class=TicketNoteSerializer)
    def add_note(self, request, pk=None):
        conversation = self.get_object()
        serializer = TicketNoteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(conversation=conversation, user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        conversation = self.get_object()
        new_status = request.data.get('status')
        if new_status not in Conversation.Status.values:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        conversation.status = new_status
        conversation.save()
        return Response(TicketDetailSerializer(conversation).data, status=status.HTTP_200_OK)

class DashboardAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        conversations_last_30_days = Conversation.objects.filter(
            agent__user=user, 
            created_at__gte=thirty_days_ago
        )
        
        total = conversations_last_30_days.count()
        resolved = conversations_last_30_days.filter(status=Conversation.Status.RESOLVED).count()
        flagged = conversations_last_30_days.filter(status=Conversation.Status.FLAGGED).count()
        
        all_conversations = Conversation.objects.filter(agent__user=user)
        total_messages = Message.objects.filter(conversation__in=all_conversations).count()
        
        positive_feedback = Message.objects.filter(
            conversation__in=all_conversations,
            feedback=Message.Feedback.POSITIVE
        ).count()
        total_feedback = Message.objects.filter(
            conversation__in=all_conversations,
            feedback__isnull=False
        ).count()

        kpis = {
            "total_conversations": all_conversations.count(),
            "resolved_conversations": all_conversations.filter(status=Conversation.Status.RESOLVED).count(),
            "active_conversations": all_conversations.filter(status=Conversation.Status.ACTIVE).count(),
            "flagged_conversations": all_conversations.filter(status=Conversation.Status.FLAGGED).count(),
            "resolution_rate": (resolved / total * 100) if total > 0 else 0,
            "avg_messages_per_conversation": (total_messages / all_conversations.count()) if all_conversations.exists() else 0,
            "positive_feedback_rate": (positive_feedback / total_feedback * 100) if total_feedback > 0 else 0,
        }
        
        daily_counts = (
            conversations_last_30_days
            .annotate(date=models.functions.TruncDate('created_at'))
            .values('date')
            .annotate(count=models.Count('id'))
            .order_by('date')
        )
        
        recent_tickets = Conversation.objects.filter(
            agent__user=user,
            status=Conversation.Status.FLAGGED
        ).order_by('-updated_at')[:5]

        data = {
            "kpis": ConversationAnalyticsSerializer(kpis).data,
            "chat_volume_trends": DailyChatVolumeSerializer(daily_counts, many=True).data,
            "recent_tickets": TicketListSerializer(recent_tickets, many=True).data
        }
        return Response(data)