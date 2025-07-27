# core/serializers.py
from rest_framework import serializers
from .models import User
from .models import Agent

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
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name']
        )
        return user
    

class AgentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agent
        fields = [
            'id', 
            'name', 
            'is_active', 
            'system_prompt', 
            'widget_settings'
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        user = self.context['request'].user
        agent = Agent.objects.create(user=user, **validated_data)
        return agent
    
    

from .models import KnowledgeSource

class KnowledgeSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeSource
        fields = ['id', 'type', 'title', 'content', 'file', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']

    def validate(self, data):
        source_type = data.get('type')
        if source_type == KnowledgeSource.SourceType.URL and not data.get('content'):
            raise serializers.ValidationError("Content (URL) is required for URL sources.")
        if source_type == KnowledgeSource.SourceType.FAQ and not data.get('content'):
            raise serializers.ValidationError("Content (Answer) is required for FAQ sources.")
        if source_type == KnowledgeSource.SourceType.FILE and not self.context['request'].FILES.get('file'):
            if not self.instance:
                 raise serializers.ValidationError("A file is required for FILE sources.")
        return data