from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.views import APIView
from django.db import transaction
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta
from rest_framework import parsers
import uuid
from .models import User, Agent, KnowledgeBase, KnowledgeSource, Conversation
from .serializers import (
    RegisterSerializer, UserSerializer, AgentSerializer, KnowledgeSourceSerializer,
    TicketListSerializer, TicketDetailSerializer, PublicAgentConfigSerializer
)
from .tasks import index_knowledge_source_task, create_lyzr_stack_task

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

class MyTokenObtainPairView(TokenObtainPairView): pass

class UserDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    def get_object(self): return self.request.user

class AgentDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = AgentSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_object(self):
        try:
            return Agent.objects.select_related('knowledge_base').prefetch_related('knowledge_base__sources').get(user=self.request.user)
        except Agent.DoesNotExist: return None

class AgentCreateView(generics.CreateAPIView):
    serializer_class = AgentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                agent = Agent.objects.create(user=request.user, **serializer.validated_data)
                kb = KnowledgeBase.objects.create(agent=agent, collection_name=f"agent_{agent.id}_kb_{uuid.uuid4().hex[:6]}")
            create_lyzr_stack_task.delay(agent.id)
            response_serializer = self.get_serializer(agent)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=self.get_success_headers(response_serializer.data))
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class KnowledgeSourceView(generics.ListCreateAPIView):
    serializer_class = KnowledgeSourceSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    def get_queryset(self):
        try: return self.request.user.agent.knowledge_base.sources.all()
        except (Agent.DoesNotExist, KnowledgeBase.DoesNotExist): return KnowledgeSource.objects.none()
    def perform_create(self, serializer):
        try:
            kb = self.request.user.agent.knowledge_base
            source = serializer.save(knowledge_base=kb)
            index_knowledge_source_task.delay(source.id)
        except (Agent.DoesNotExist, KnowledgeBase.DoesNotExist):
            raise serializers.ValidationError("Agent or KnowledgeBase not configured for this user.")

class PublicAgentConfigView(generics.RetrieveAPIView):
    queryset = Agent.objects.filter(is_active=True)
    serializer_class = PublicAgentConfigSerializer
    permission_classes = (permissions.AllowAny,)
    lookup_field = 'id'

class TicketListView(generics.ListAPIView):
    serializer_class = TicketListSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self): return Conversation.objects.filter(agent__user=self.request.user, status=Conversation.Status.FLAGGED).order_by('-updated_at')

class TicketDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = TicketDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self): return Conversation.objects.filter(agent__user=self.request.user)

class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request, *args, **kwargs):
        try: agent = request.user.agent
        except Agent.DoesNotExist: return Response({"error": "Agent not configured."}, status=status.HTTP_404_NOT_FOUND)
        one_month_ago = timezone.now() - timedelta(days=30)
        conversations = Conversation.objects.filter(agent=agent, created_at__gte=one_month_ago)
        total_chats = conversations.count()
        resolved_chats = conversations.filter(status=Conversation.Status.RESOLVED).count()
        resolution_rate = (resolved_chats / total_chats * 100) if total_chats > 0 else 0
        seven_days_ago = timezone.now().date() - timedelta(days=6)
        daily_counts = conversations.filter(created_at__date__gte=seven_days_ago).extra(select={'day': 'date(created_at)'}).values('day').annotate(chats=Count('id')).order_by('day')
        chat_volume = [{'day': item['day'].strftime('%a'), 'chats': item['chats']} for item in daily_counts]
        frequent_questions = TicketListSerializer(Conversation.objects.filter(agent=agent, status=Conversation.Status.FLAGGED).order_by('-updated_at')[:5], many=True).data
        return Response({"kpis": {"total_chats": total_chats, "resolution_rate": round(resolution_rate, 2), "flagged_tickets": Conversation.objects.filter(agent=agent, status=Conversation.Status.FLAGGED).count()}, "chat_volume_trends": chat_volume, "frequent_questions": frequent_questions})