import razorpay
import logging
from django.conf import settings
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Plan, Subscription
from .serializers import PlanSerializer, SubscriptionSerializer

logger = logging.getLogger(__name__)

class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows active plans to be viewed.
    """
    queryset = Plan.objects.filter(is_active=True)
    serializer_class = PlanSerializer
    permission_classes = [permissions.IsAuthenticated]

class SubscriptionView(APIView):
    """
    View to manage a user's subscription.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            subscription = request.user.subscription
            serializer = SubscriptionSerializer(subscription)
            return Response(serializer.data)
        except Subscription.DoesNotExist:
            return Response({"detail": "No active subscription found."}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request):
        plan_id = request.data.get('plan_id')
        try:
            plan = Plan.objects.get(id=plan_id, is_active=True)
            if not plan.razorpay_plan_id:
                return Response({"detail": "This plan is not configured for payment."}, status=status.HTTP_400_BAD_REQUEST)
        except Plan.DoesNotExist:
            return Response({"detail": "Plan not found."}, status=status.HTTP_404_NOT_FOUND)

        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        
        subscription_data = {
            "plan_id": plan.razorpay_plan_id,
            "total_count": 12,
            "quantity": 1,
        }
        
        try:
            razorpay_subscription = client.subscription.create(subscription_data)
            
            Subscription.objects.update_or_create(
                user=request.user,
                defaults={
                    'plan': plan,
                    'razorpay_subscription_id': razorpay_subscription['id'],
                    'status': 'INACTIVE'
                }
            )
            
            return Response({
                "razorpay_subscription_id": razorpay_subscription['id'],
                "razorpay_key_id": settings.RAZORPAY_KEY_ID,
                "plan_name": plan.name,
                "amount": plan.price,
                "user_name": request.user.full_name,
                "user_email": request.user.email
            })

        except Exception as e:
            logger.error(f"Razorpay subscription creation failed: {e}")
            return Response({"detail": "Could not create subscription."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RazorpayWebhookView(APIView):
    """
    Handles incoming webhooks from Razorpay to update subscription status.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        try:
            client.utility.verify_webhook_signature(
                request.body.decode('utf-8'), 
                request.headers.get('X-Razorpay-Signature'), 
                settings.RAZORPAY_WEBHOOK_SECRET
            )
        except razorpay.errors.SignatureVerificationError:
            logger.warning("Razorpay webhook signature verification failed.")
            return Response({"detail": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

        event = request.data
        event_type = event.get('event')

        if event_type == 'subscription.charged':
            subscription_id = event['payload']['subscription']['entity']['id']
            payment_id = event['payload']['payment']['entity']['id']
            
            try:
                subscription = Subscription.objects.get(razorpay_subscription_id=subscription_id)
                subscription.status = 'ACTIVE'
                subscription.razorpay_payment_id = payment_id
                subscription.save()
                logger.info(f"Subscription {subscription_id} activated successfully.")
            except Subscription.DoesNotExist:
                logger.error(f"Webhook received for unknown subscription: {subscription_id}")

        return Response(status=status.HTTP_200_OK)