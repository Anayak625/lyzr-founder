from django.urls import path, include
from rest_framework_nested import routers
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, MyTokenObtainPairView, UserDetailView,
    AgentViewSet, KnowledgeSourceViewSet, VerifyOTPView,
    PublicAgentConfigView, DashboardAnalyticsView, ConversationViewSet
)

router = routers.DefaultRouter()
router.register(r'agents', AgentViewSet, basename='agent')
router.register(r'conversations', ConversationViewSet, basename='conversation')

agents_router = routers.NestedDefaultRouter(router, r'agents', lookup='agent')
agents_router.register(r'knowledge-sources', KnowledgeSourceViewSet, basename='agent-knowledge-source')

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/verify-otp/', VerifyOTPView.as_view(), name='auth_verify_otp'),
    path('auth/login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', UserDetailView.as_view(), name='user-detail'),
    
    path('', include(router.urls)),
    path('', include(agents_router.urls)),
    
    path('public/agent-config/<uuid:id>/', PublicAgentConfigView.as_view(), name='public-agent-config'),
    path('dashboard/analytics/', DashboardAnalyticsView.as_view(), name='dashboard-analytics'),
]