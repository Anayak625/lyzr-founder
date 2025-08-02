# billing/models.py

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class Plan(models.Model):
    """
    Represents a subscription plan available to users.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    features = models.JSONField(default=dict, help_text="e.g., {'agents': 1, 'messages': 1000}")
    razorpay_plan_id = models.CharField(max_length=255, blank=True, null=True, help_text="The corresponding Plan ID from Razorpay")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class Subscription(models.Model):
    """
    Links a user to a specific plan.
    """
    class SubscriptionStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        INACTIVE = 'INACTIVE', 'Inactive'
        CANCELLED = 'CANCELLED', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='subscription')
    plan = models.ForeignKey(Plan, on_delete=models.SET_NULL, null=True, related_name='subscriptions')
    status = models.CharField(max_length=20, choices=SubscriptionStatus.choices, default=SubscriptionStatus.INACTIVE)
    
    razorpay_payment_id = models.CharField(max_length=255, blank=True, null=True)
    razorpay_subscription_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField(null=True, blank=True, help_text="Date when the subscription is set to expire")

    def __str__(self):
        return f"{self.user.email} - {self.plan.name if self.plan else 'No Plan'}"

class Usage(models.Model):
    """
    Tracks the usage metrics for a subscription on a daily basis.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='usage_records')
    messages_count = models.PositiveIntegerField(default=0)
    agents_count = models.PositiveIntegerField(default=0)
    date = models.DateField(default=timezone.now)

    class Meta:
        unique_together = ('subscription', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"Usage for {self.subscription.user.email} on {self.date}"