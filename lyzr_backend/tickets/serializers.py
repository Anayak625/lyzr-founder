from rest_framework import serializers
from .models import Ticket, TicketNote
from core.models import Conversation,Message
from core.users_serializers import UserSerializer
from teams.serializers import TeamSerializer

class TicketNoteSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = TicketNote
        fields = ['id', 'user', 'note', 'created_at', 'is_internal']
        read_only_fields = ['id', 'user', 'created_at']

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'sender_type', 'content','feedback', 'created_at']

class ConversationForTicketSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    class Meta:
        model = Conversation
        fields = ['id', 'end_user_id', 'summary', 'created_at', 'updated_at', 'messages']

class TicketListSerializer(serializers.ModelSerializer):
    customer = serializers.CharField(source='conversation.end_user_id', read_only=True)
    assigned_to = UserSerializer(read_only=True)
    team = TeamSerializer(read_only=True)

    class Meta:
        model = Ticket
        fields = ['id', 'ticket_id', 'title', 'status', 'priority', 'customer', 'assigned_to', 'team', 'created_at', 'updated_at']

class TicketDetailSerializer(TicketListSerializer):
    conversation = ConversationForTicketSerializer(read_only=True)
    notes = TicketNoteSerializer(many=True, read_only=True)

    class Meta(TicketListSerializer.Meta):
        fields = TicketListSerializer.Meta.fields + ['conversation', 'notes']

class CreateTicketSerializer(serializers.ModelSerializer):
    conversation_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Ticket
        fields = ['title', 'priority', 'conversation_id']

    def validate_conversation_id(self, value):
        if not Conversation.objects.filter(id=value).exists():
            raise serializers.ValidationError("Conversation not found.")
        if Ticket.objects.filter(conversation_id=value).exists():
            raise serializers.ValidationError("A ticket for this conversation already exists.")
        return value