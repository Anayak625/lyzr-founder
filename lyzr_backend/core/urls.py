from django.urls import path
from .views import (
    RegisterView, MyTokenObtainPairView, UserDetailView,
    AgentCreateView, AgentDetailView,
    KnowledgeSourceView,
    DashboardView, TicketListView, TicketDetailView,
    PublicAgentConfigView 
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('me/', UserDetailView.as_view(), name='user-detail'),
    path('agents/', AgentCreateView.as_view(), name='agent-create'),
    path('agents/me/', AgentDetailView.as_view(), name='agent-detail'),
    path('knowledge/', KnowledgeSourceView.as_view(), name='knowledge-source-list-create'),
    path('public/agent-config/<uuid:id>/', PublicAgentConfigView.as_view(), name='public-agent-config'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('tickets/', TicketListView.as_view(), name='ticket-list'),
    path('tickets/<uuid:pk>/', TicketDetailView.as_view(), name='ticket-detail'),
]