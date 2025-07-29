from rest_framework import serializers
from .models import User, Agent, KnowledgeBase, KnowledgeSource, Conversation, Message, TicketNote

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'onboarding_completed', 'date_joined']
        read_only_fields = ['id', 'date_joined']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    class Meta:
        model = User
        fields = ('email', 'password', 'full_name')
    def create(self, validated_data):
        return User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data.get('full_name', '')
        )

class KnowledgeSourceSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    class Meta:
        model = KnowledgeSource
        fields = ['id', 'type', 'title', 'content', 'file', 'file_url', 'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'status', 'created_at', 'updated_at', 'file_url']
    
    def get_file_url(self, obj):
        if obj.type == 'FILE' and obj.file:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.file.url)
        return None

class KnowledgeBaseSerializer(serializers.ModelSerializer):
    sources = KnowledgeSourceSerializer(many=True, read_only=True)
    class Meta:
        model = KnowledgeBase
        fields = ['id', 'lyzr_rag_id', 'collection_name', 'sources']
        read_only_fields = ['id', 'lyzr_rag_id', 'collection_name']

class AgentSerializer(serializers.ModelSerializer):
    knowledge_base = KnowledgeBaseSerializer(read_only=True)
    user = UserSerializer(read_only=True)
    class Meta:
        model = Agent
        fields = [
            'id', 'user', 'lyzr_agent_id', 'name', 'is_active', 'description', 'agent_role', 'agent_goal', 'agent_instructions', 'examples',
            'model', 'temperature', 'top_p', 'widget_settings', 'knowledge_base',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'lyzr_agent_id', 'user', 'knowledge_base', 'created_at', 'updated_at']

class PublicAgentConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agent
        fields = ['name', 'widget_settings', 'system_prompt']

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'sender_type', 'content', 'feedback', 'created_at']

class TicketNoteSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = TicketNote
        fields = ['id', 'user', 'note', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

class TicketListSerializer(serializers.ModelSerializer):
    customer = serializers.CharField(source='end_user_id')
    subject = serializers.SerializerMethodField()
    class Meta:
        model = Conversation
        fields = ['id', 'customer', 'subject', 'status', 'updated_at', 'summary']
    def get_subject(self, obj):
        first_user_message = obj.messages.filter(sender_type=Message.Sender.USER).first()
        return (first_user_message.content[:75] + '...') if first_user_message and len(first_user_message.content) > 75 else (first_user_message.content if first_user_message else "No subject")

class TicketDetailSerializer(TicketListSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    notes = TicketNoteSerializer(many=True, read_only=True)
    agent = AgentSerializer(read_only=True)
    class Meta(TicketListSerializer.Meta):
        fields = TicketListSerializer.Meta.fields + ['messages', 'notes', 'agent']

class ConversationAnalyticsSerializer(serializers.Serializer):
    total_conversations = serializers.IntegerField()
    resolved_conversations = serializers.IntegerField()
    active_conversations = serializers.IntegerField()
    flagged_conversations = serializers.IntegerField()
    resolution_rate = serializers.FloatField()
    avg_messages_per_conversation = serializers.FloatField()
    positive_feedback_rate = serializers.FloatField()

class DailyChatVolumeSerializer(serializers.Serializer):
    date = serializers.DateField()
    count = serializers.IntegerField()