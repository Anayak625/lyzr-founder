# core/urls.py
from django.urls import path, include
from rest_framework_nested import routers
from .views import (
    RegisterView, MyTokenObtainPairView, UserDetailView,
    AgentViewSet, KnowledgeSourceViewSet,
    DashboardView, TicketListView, TicketDetailView,
    PublicAgentConfigView,ConversationViewSet
)

router = routers.DefaultRouter()
router.register(r'agents', AgentViewSet, basename='agent')

agents_router = routers.NestedDefaultRouter(router, r'agents', lookup='agent')
agents_router.register(r'knowledge', KnowledgeSourceViewSet, basename='agent-knowledge')
router.register(r'conversations', ConversationViewSet, basename='conversation')

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('me/', UserDetailView.as_view(), name='user-detail'),
    path('', include(router.urls)),
    path('', include(agents_router.urls)),
    path('public/agent-config/<uuid:id>/', PublicAgentConfigView.as_view(), name='public-agent-config'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('tickets/', TicketListView.as_view(), name='ticket-list'),
    path('tickets/<uuid:pk>/', TicketDetailView.as_view(), name='ticket-detail'),
]