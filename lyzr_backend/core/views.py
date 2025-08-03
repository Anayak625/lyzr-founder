import logging
from django.db import transaction, models
from django.utils import timezone
from datetime import timedelta
from rest_framework import generics, permissions, status, viewsets, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.decorators import action
from .models import User, Agent, KnowledgeBase, KnowledgeSource, Conversation, Message
from .serializers import (
    RegisterSerializer, UserSerializer, AgentSerializer, KnowledgeSourceSerializer,
    PublicAgentConfigSerializer, ConversationAnalyticsSerializer, DailyChatVolumeSerializer,
    VerifyOTPSerializer, ConversationSerializer, ConversationDetailSerializer
)
from tickets.models import Ticket
from tickets.serializers import TicketListSerializer

from .tasks import create_lyzr_stack_task, index_knowledge_source_task, update_lyzr_agent_task
from .permissions import IsOwnerOrReadOnly, IsAgentOwner
from django.core.cache import cache
import json
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.contrib.auth.hashers import make_password
from django.conf import settings
import random
from billing.models import Plan, Subscription, Usage
from teams.models import Team, TeamMember,Invitation
from billing.serializers import SubscriptionSerializer, UsageSerializer
from billing.utils import check_plan_limit

logger = logging.getLogger(__name__)


class RegisterView(generics.GenericAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        email = validated_data['email']

        if User.objects.filter(email=email, is_verified=True).exists():
            return Response({"detail": "A verified user with this email already exists. Please log in."}, status=status.HTTP_400_BAD_REQUEST)

        otp = str(random.randint(100000, 999999))
        hashed_password = make_password(validated_data['password'])

        cache_key = f"otp_verify_{email}"
        user_data = {
            "full_name": validated_data.get('full_name', ''),
            "email": email,
            "password": hashed_password,
            "otp": otp
        }
        cache.set(cache_key, json.dumps(user_data), timeout=600)

        context = {'otp': otp, 'user': user_data}
        html_message = render_to_string('emails/otp_verification.html', context)
        send_mail(
            subject='Verify your Lyzr account',
            message=f'Your verification code is: {otp}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=html_message,
            fail_silently=False,
        )

        return Response(
            {"detail": "Verification code sent to your email. Please check.", "email": email},
            status=status.HTTP_200_OK
        )

class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = VerifyOTPSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        otp = serializer.validated_data['otp']

        cache_key = f"otp_verify_{email}"
        cached_data_str = cache.get(cache_key)

        if not cached_data_str:
            return Response({"detail": "Invalid or expired OTP. Please sign up again."}, status=status.HTTP_400_BAD_REQUEST)

        cached_data = json.loads(cached_data_str)

        if cached_data.get('otp') != otp:
            return Response({"detail": "Incorrect OTP provided."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                user = User.objects.create(
                    email=cached_data['email'],
                    password=cached_data['password'],
                    full_name=cached_data['full_name'],
                    is_active=True,
                    is_verified=True
                )
                cache.delete(cache_key)

                pending_invitations = Invitation.objects.filter(email=user.email, status=Invitation.Status.PENDING)
                for inv in pending_invitations:
                    TeamMember.objects.get_or_create(
                        team=inv.team,
                        user=user,
                        defaults={'role': inv.role}
                    )
                    inv.status = Invitation.Status.ACCEPTED
                    inv.save()
                    logger.info(f"User {user.email} automatically joined team '{inv.team.name}' from a pending invitation.")

                free_plan, _ = Plan.objects.get_or_create(
                    name='Free',
                    defaults={
                        'price': 0.00,
                        'features': {
                            'agents': 1, 
                            'messages': 300,
                            'team_members': 2,
                            'knowledge_sources': 2
                        }
                    }
                )
                Subscription.objects.create(user=user, plan=free_plan, status='ACTIVE')

            return Response({"detail": "Account successfully created. You can now log in."}, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"An error occurred during user creation and setup: {e}")
            return Response({"detail": f"An error occurred: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
        check_plan_limit(self.request.user, 'agents')
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

            create_lyzr_stack_task.delay(str(agent.id))
            index_knowledge_source_task.delay(str(default_source.id))

        except Exception as e:
            logger.error(f"Agent creation failed for user {self.request.user.email}: {e}")
            raise serializers.ValidationError({"detail": "Failed to create the agent and its default knowledge base."})

    def perform_update(self, serializer):
        instance = serializer.save()
        logger.info(f"Queuing Lyzr update task for agent {instance.id}")
        update_lyzr_agent_task.delay(str(instance.id))

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """
        A lightweight endpoint to check if the agent's Lyzr stack
        has been created and is ready for use.
        """
        try:
            agent = self.get_object()
            is_ready = bool(agent.lyzr_agent_id and hasattr(agent, 'knowledge_base') and agent.knowledge_base.lyzr_rag_id)
            return Response({
                "agent_id": agent.id,
                "is_ready": is_ready
            })
        except Agent.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)



class KnowledgeSourceViewSet(viewsets.ModelViewSet):
    serializer_class = KnowledgeSourceSerializer
    permission_classes = [permissions.IsAuthenticated, IsAgentOwner]

    def get_queryset(self):
        agent_pk = self.kwargs.get('agent_pk')
        return KnowledgeSource.objects.filter(knowledge_base__agent_id=agent_pk)

    def perform_create(self, serializer):
        check_plan_limit(self.request.user, 'knowledge_sources')
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

# REMOVED TicketViewSet from here

class DashboardAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        thirty_days_ago = timezone.now() - timedelta(days=30)
        user_teams = TeamMember.objects.filter(user=user).values_list('team_id', flat=True)

        conversations_last_30_days = Conversation.objects.filter(
            agent__user=user,
            created_at__gte=thirty_days_ago
        )

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
            "avg_messages_per_conversation": (total_messages / all_conversations.count()) if all_conversations.exists() else 0,
            "positive_feedback_rate": (positive_feedback / total_feedback * 100) if total_feedback > 0 else 0,
            "open_tickets": Ticket.objects.filter(team_id__in=user_teams, status__in=[Ticket.Status.NEW, Ticket.Status.OPEN]).distinct().count(),
            "tickets_solved_last_30_days": Ticket.objects.filter(team_id__in=user_teams, resolved_at__gte=thirty_days_ago).distinct().count(),
        }

        daily_counts = (
            conversations_last_30_days
            .annotate(date=models.functions.TruncDate('created_at'))
            .values('date')
            .annotate(count=models.Count('id'))
            .order_by('date')
        )

        recent_tickets = Ticket.objects.filter(
            team_id__in=user_teams
        ).order_by('-updated_at')[:5]

        subscription_data = None
        usage_data = []
        if hasattr(user, 'subscription'):
            subscription_data = SubscriptionSerializer(user.subscription).data
            usage_records = Usage.objects.filter(
                subscription=user.subscription,
                date__gte=thirty_days_ago
            ).order_by('date')
            usage_data = UsageSerializer(usage_records, many=True).data

        data = {
            "kpis": ConversationAnalyticsSerializer(kpis).data,
            "chat_volume_trends": DailyChatVolumeSerializer(daily_counts, many=True).data,
            "recent_tickets": TicketListSerializer(recent_tickets, many=True, context={'request': request}).data,
            "subscription": subscription_data,
            "usage_analytics": usage_data,
        }
        return Response(data)
    
class ConversationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Provides a read-only list of conversations that have not yet been
    escalated to a ticket, allowing agents to monitor ongoing chats.
    """
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(
            agent__user=self.request.user,
        ).order_by('-updated_at')
        
    def retrieve(self, request, *args, **kwargs):
        """
        Retrieves a single conversation instance, including all its messages.
        """
        instance = self.get_object()
        # We need a more detailed serializer for this view
        serializer = ConversationDetailSerializer(instance)
        return Response(serializer.data)