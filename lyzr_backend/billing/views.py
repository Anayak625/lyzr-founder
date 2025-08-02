import razorpay
import logging
from django.conf import settings
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Plan, Subscription
from .serializers import PlanSerializer, SubscriptionSerializer
from core.models import User 

logger = logging.getLogger(__name__)

class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Plan.objects.filter(is_active=True)
    serializer_class = PlanSerializer
    permission_classes = [permissions.IsAuthenticated]

class SubscriptionView(APIView):
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
            "customer_notify": 1,
            "notes": {
                "user_id": str(request.user.id),
                "plan_id": str(plan.id)
            }
        }
        
        try:
            razorpay_subscription = client.subscription.create(subscription_data)
            
            return Response({
                "razorpay_subscription_id": razorpay_subscription['id'],
                "razorpay_key_id": settings.RAZORPAY_KEY_ID,
            })

        except Exception as e:
            logger.error(f"Razorpay subscription creation failed for user {request.user.id}: {e}")
            return Response({"detail": "Could not initiate subscription process with payment provider."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RazorpayWebhookView(APIView):
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
            payload = event['payload']['subscription']['entity']
            razorpay_sub_id = payload['id']
            payment_id = event['payload']['payment']['entity']['id']
            
            notes = payload.get('notes', {})
            user_id = notes.get('user_id')
            plan_id = notes.get('plan_id')

            if not user_id or not plan_id:
                logger.error(f"Webhook received for subscription {razorpay_sub_id} but missing user_id or plan_id in notes.")
                return Response(status=status.HTTP_400_BAD_REQUEST)

            try:
                user = User.objects.get(id=user_id)
                plan = Plan.objects.get(id=plan_id)

                subscription, created = Subscription.objects.update_or_create(
                    user=user,
                    defaults={
                        'plan': plan,
                        'razorpay_subscription_id': razorpay_sub_id,
                        'status': 'ACTIVE', 
                    }
                )
                
                # Optionally, we can also store the specific payment ID for reference
                subscription.razorpay_payment_id = payment_id
                subscription.save()

                logger.info(f"Subscription for user {user.email} successfully activated/updated to plan '{plan.name}' via webhook.")
            
            except User.DoesNotExist:
                logger.error(f"Webhook error: User with ID {user_id} not found.")
            except Plan.DoesNotExist:
                logger.error(f"Webhook error: Plan with ID {plan_id} not found.")
            except Exception as e:
                logger.error(f"An unexpected error occurred while processing webhook for subscription {razorpay_sub_id}: {e}")
                return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(status=status.HTTP_200_OK)