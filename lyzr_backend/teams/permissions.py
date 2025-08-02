from rest_framework import permissions
from .models import TeamMember

class IsTeamAdmin(permissions.BasePermission):
    """
    Allows access only to users who are admins of the team.
    """
    def has_object_permission(self, request, view, obj):
        # The object `obj` is the Team instance.
        return TeamMember.objects.filter(
            team=obj,
            user=request.user,
            role=TeamMember.Role.ADMIN
        ).exists()