from django.contrib import admin
from .models import Team, TeamMember, Invitation

@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'created_at')
    search_fields = ('name', 'owner__email')

@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ('team', 'user', 'role')
    list_filter = ('role', 'team')
    search_fields = ('team__name', 'user__email')

@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ('team', 'email', 'status', 'invited_by')
    list_filter = ('status', 'team')
    search_fields = ('email', 'team__name')