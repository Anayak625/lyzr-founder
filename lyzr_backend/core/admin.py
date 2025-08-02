from django.contrib import admin
from .models import User, Agent, KnowledgeBase, KnowledgeSource, Conversation, Message

class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'full_name', 'is_staff', 'date_joined')
    search_fields = ('email', 'full_name')

class AgentAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'model', 'is_active', 'created_at')
    list_filter = ('is_active', 'model')
    search_fields = ('name', 'user__email')

class KnowledgeBaseAdmin(admin.ModelAdmin):
    list_display = ('agent', 'lyzr_rag_id', 'collection_name')
    search_fields = ('agent__name',)

class KnowledgeSourceAdmin(admin.ModelAdmin):
    list_display = ('title', 'type', 'status', 'knowledge_base', 'created_at')
    list_filter = ('type', 'status')
    search_fields = ('title', 'knowledge_base__agent__name')

class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ('id', 'sender_type', 'content', 'feedback', 'created_at')

class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'agent', 'end_user_id', 'updated_at')
    list_filter = ('agent',)
    search_fields = ('end_user_id', 'agent__name')
    inlines = [MessageInline]
    readonly_fields = ('created_at', 'updated_at')


admin.site.register(User, UserAdmin)
admin.site.register(Agent, AgentAdmin)
admin.site.register(KnowledgeBase, KnowledgeBaseAdmin)
admin.site.register(KnowledgeSource, KnowledgeSourceAdmin)
admin.site.register(Conversation, ConversationAdmin)