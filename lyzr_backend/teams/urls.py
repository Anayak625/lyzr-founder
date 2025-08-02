from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TeamViewSet, InvitationViewSet

router = DefaultRouter()

router.register(r'teams', TeamViewSet, basename='team')
router.register(r'invitations', InvitationViewSet, basename='invitation')

urlpatterns = [
    path('', include(router.urls)),
]