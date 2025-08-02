from rest_framework import serializers
from .models import Team, TeamMember, Invitation
from core.users_serializers import UserSerializer

class TeamMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = TeamMember
        fields = ['id', 'user', 'role']

class TeamSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)

    class Meta:
        model = Team
        fields = ['id', 'name', 'owner', 'created_at']
        read_only_fields = ['owner', 'created_at']

class TeamDetailSerializer(TeamSerializer):
    members = TeamMemberSerializer(many=True, read_only=True)

    class Meta(TeamSerializer.Meta):
        fields = TeamSerializer.Meta.fields + ['members']

class InviteMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=TeamMember.Role.choices, default=TeamMember.Role.MEMBER)

class InvitationSerializer(serializers.ModelSerializer):
    team = TeamSerializer(read_only=True)
    invited_by = UserSerializer(read_only=True)
    
    class Meta:
        model = Invitation
        fields = ['id', 'team', 'email', 'role', 'status', 'invited_by', 'created_at']
        read_only_fields = ['status', 'created_at', 'team', 'invited_by']