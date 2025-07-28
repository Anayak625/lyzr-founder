from rest_framework import permissions
from .models import Agent

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user == request.user

class IsAgentOwner(permissions.BasePermission):
    def has_permission(self, request, view):
        agent_pk = view.kwargs.get('agent_pk')
        if not agent_pk:
            return False
        try:
            agent = Agent.objects.get(pk=agent_pk)
            return agent.user == request.user
        except Agent.DoesNotExist:
            return False