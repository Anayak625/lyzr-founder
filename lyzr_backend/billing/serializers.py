from rest_framework import serializers
from .models import Plan, Subscription, Usage

class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = ['id', 'name', 'price', 'features']

class SubscriptionSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)
    class Meta:
        model = Subscription
        fields = ['id', 'plan', 'status', 'start_date', 'end_date']

class UsageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usage
        fields = ['date', 'messages_count', 'agents_count']