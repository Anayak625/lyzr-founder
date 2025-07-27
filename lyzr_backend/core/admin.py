from django.contrib import admin
from .models import User,KnowledgeSource, Agent, Conversation, Message

admin.site.register(User) 
admin.site.register(KnowledgeSource)
admin.site.register(Agent)
admin.site.register(Conversation)
admin.site.register(Message)