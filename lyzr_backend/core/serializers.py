from rest_framework import serializers
from .models import User, Agent, KnowledgeBase, KnowledgeSource, Conversation, Message

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'onboarding_completed']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=6)
    class Meta:
        model = User
        fields = ('email', 'password', 'full_name')
    def create(self, validated_data):
        return User.objects.create_user(username=validated_data['email'], email=validated_data['email'], password=validated_data['password'], full_name=validated_data['full_name'])

class KnowledgeSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeSource
        fields = ['id', 'type', 'title', 'content', 'file', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']

class KnowledgeBaseSerializer(serializers.ModelSerializer):
    sources = KnowledgeSourceSerializer(many=True, read_only=True)
    class Meta:
        model = KnowledgeBase
        fields = ['id', 'rag_config_id', 'collection_name', 'sources']
        read_only_fields = ['id', 'rag_config_id']

class AgentSerializer(serializers.ModelSerializer):
    knowledge_base = KnowledgeBaseSerializer(read_only=True)
    class Meta:
        model = Agent
        fields = ['id', 'lyzr_agent_id', 'name', 'is_active', 'system_prompt', 'model', 'temperature', 'widget_settings', 'knowledge_base']
        read_only_fields = ['id', 'lyzr_agent_id']

class PublicAgentConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agent
        fields = ['name', 'widget_settings', 'system_prompt']

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'sender_type', 'content', 'feedback', 'created_at']

class TicketListSerializer(serializers.ModelSerializer):
    customer = serializers.CharField(source='end_user_id')
    subject = serializers.SerializerMethodField()
    class Meta:
        model = Conversation
        fields = ['id', 'customer', 'subject', 'status', 'updated_at']
    def get_subject(self, obj):
        first_user_message = obj.messages.filter(sender_type=Message.Sender.USER).first()
        return first_user_message.content if first_user_message else "No subject"

class TicketDetailSerializer(TicketListSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    class Meta(TicketListSerializer.Meta):
        fields = TicketListSerializer.Meta.fields + ['messages']