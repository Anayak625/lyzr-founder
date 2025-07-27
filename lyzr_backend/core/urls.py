# core/urls.py
from django.urls import path
from .views import RegisterView, MyTokenObtainPairView, UserDetailView
from rest_framework_simplejwt.views import TokenRefreshView

from .views import AgentCreateView, AgentDetailView
from .views import KnowledgeSourceView, KnowledgeSourceDetailView

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    path('agent/create/', AgentCreateView.as_view(), name='agent-create'),
    path('agent/settings/', AgentDetailView.as_view(), name='agent-settings'),
    
    
    path('agent/knowledge/', KnowledgeSourceView.as_view(), name='knowledge-list-create'),
    path('agent/knowledge/<uuid:pk>/', KnowledgeSourceDetailView.as_view(), name='knowledge-detail'),
    
    path('me/', UserDetailView.as_view(), name='user-detail'),
]