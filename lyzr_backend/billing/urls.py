from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PlanViewSet, SubscriptionView, RazorpayWebhookView

router = DefaultRouter()
router.register(r'plans', PlanViewSet, basename='plan')

app_name = 'billing'

urlpatterns = [
    path('', include(router.urls)),
    path('subscription/', SubscriptionView.as_view(), name='subscription'),
    path('webhook/razorpay/', RazorpayWebhookView.as_view(), name='razorpay-webhook'),
]