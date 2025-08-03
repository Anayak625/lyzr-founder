from django.core.exceptions import PermissionDenied
from django.db.models import Sum

from core.models import Agent, KnowledgeSource
from teams.models import TeamMember
from billing.models import Subscription, Usage
from datetime import timedelta
from django.utils import timezone

def check_plan_limit(user, feature_key):
    """
    Checks if a user has reached a specific feature limit based on their subscription plan.
    Raises PermissionDenied if the limit is reached.
    """
    try:
        subscription = user.subscription
        if subscription.status != 'ACTIVE':
            raise PermissionDenied("Your subscription is not active.")
    except Subscription.DoesNotExist:
        raise PermissionDenied("You do not have an active subscription.")

    plan = subscription.plan
    limit = plan.features.get(feature_key)

    # If the limit is not defined or set to "unlimited", allow the action.
    if limit is None or (isinstance(limit, str) and limit.lower() == 'unlimited'):
        return True

    current_count = 0
    if feature_key == 'agents':
        current_count = Agent.objects.filter(user=user).count()
    elif feature_key == 'team_members':
        # Limit applies to members in teams owned by the user.
        current_count = TeamMember.objects.filter(team__owner=user).count()
    elif feature_key == 'knowledge_sources':
        current_count = KnowledgeSource.objects.filter(knowledge_base__agent__user=user).count()

    if current_count >= limit:
        # Provide a user-friendly error message
        feature_name = feature_key.replace('_', ' ').title()
        raise PermissionDenied(f"You have reached the maximum number of {feature_name} ({limit}) for your current plan. Please upgrade to add more.")

    return True

def get_monthly_message_usage(subscription):
    """
    Calculates the total message count for the current billing cycle (approximated as last 30 days).
    """
    # A simple approach: use a rolling 30-day window.
    # For precise anniversary-based billing, a more complex library would be needed.
    start_date = timezone.now().date() - timedelta(days=30)
    
    usage = Usage.objects.filter(
        subscription=subscription,
        date__gte=start_date
    ).aggregate(total=Sum('messages_count'))
    
    return usage['total'] or 0