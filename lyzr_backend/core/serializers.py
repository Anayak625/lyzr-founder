from rest_framework import serializers
from .models import User, Agent, KnowledgeBase, KnowledgeSource, Conversation, Message
from .users_serializers import UserSerializer # CORRECTED IMPORT


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    class Meta:
        model = User
        fields = ('email', 'password', 'full_name')

class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6, required=True)
    
    
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
    system_prompt = serializers.SerializerMethodField()
    class Meta:
        model = Agent
        fields = ['name', 'widget_settings', 'system_prompt']
    
    def get_system_prompt(self, obj):
        """
        Calls the get_system_prompt() method on the Agent model instance.
        'obj' is the Agent object being serialized.
        """
        return obj.get_system_prompt()

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'sender_type', 'content', 'feedback', 'created_at']

class ConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = ['id', 'end_user_id', 'summary', 'created_at', 'updated_at']


class ConversationAnalyticsSerializer(serializers.Serializer):
    total_conversations = serializers.IntegerField()
    avg_messages_per_conversation = serializers.FloatField()
    positive_feedback_rate = serializers.FloatField()
    open_tickets = serializers.IntegerField()
    tickets_solved_last_30_days = serializers.IntegerField()

class DailyChatVolumeSerializer(serializers.Serializer):
    date = serializers.DateField()
    count = serializers.IntegerField()