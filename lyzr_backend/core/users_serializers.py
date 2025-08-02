from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    """
    This serializer is now in its own file to prevent circular imports.
    """
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'onboarding_completed', 'date_joined']
        read_only_fields = ['id', 'date_joined']