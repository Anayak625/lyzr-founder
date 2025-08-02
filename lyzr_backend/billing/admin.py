from django.contrib import admin
from django.utils.html import format_html
from .models import Plan, Subscription, Usage

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'is_active', 'razorpay_plan_id', 'copy_razorpay_id')
    list_filter = ('is_active',)
    search_fields = ('name', 'razorpay_plan_id')

    def copy_razorpay_id(self, obj):
        if obj.razorpay_plan_id:
            return format_html(
                '<button type="button" onclick="navigator.clipboard.writeText(\'{}\')">Copy ID</button>',
                obj.razorpay_plan_id
            )
        return "Not Set"
    copy_razorpay_id.short_description = 'Copy Razorpay ID'

class UsageInline(admin.TabularInline):
    model = Usage
    extra = 0
    fields = ('date', 'messages_count', 'agents_count')
    readonly_fields = ('date', 'messages_count', 'agents_count')
    ordering = ('-date',)
    can_delete = False

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user_email', 'plan_name', 'status', 'start_date', 'end_date')
    list_filter = ('status', 'plan')
    search_fields = ('user__email', 'razorpay_subscription_id')
    readonly_fields = ('razorpay_subscription_id', 'razorpay_payment_id', 'start_date', 'end_date')
    inlines = [UsageInline]

    @admin.display(description='User Email', ordering='user__email')
    def user_email(self, obj):
        return obj.user.email

    @admin.display(description='Plan', ordering='plan__name')
    def plan_name(self, obj):
        return obj.plan.name if obj.plan else 'N/A'

@admin.register(Usage)
class UsageAdmin(admin.ModelAdmin):
    list_display = ('subscription', 'date', 'messages_count', 'agents_count')
    list_filter = ('date', 'subscription__plan')
    search_fields = ('subscription__user__email',)