from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid
from django.core.validators import MinValueValidator, MaxValueValidator

class User(AbstractUser):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    onboarding_completed = models.BooleanField(default=False)
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'full_name']
    def __str__(self): return self.email

class Agent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='agent')
    lyzr_agent_id = models.CharField(max_length=255, blank=True, null=True, unique=True, help_text="The agent ID from the Lyzr Agent API")
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    class LyzrModel(models.TextChoices):
        GPT_4_TURBO = 'gpt-4-turbo', 'GPT-4 Turbo'
        GPT_3_5_TURBO = 'gpt-3.5-turbo', 'GPT-3.5 Turbo'
    model = models.CharField(max_length=50, choices=LyzrModel.choices, default=LyzrModel.GPT_3_5_TURBO)
    system_prompt = models.TextField(blank=True, default='You are a helpful customer support assistant.')
    temperature = models.FloatField(default=0.7, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)])
    widget_settings = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return f"Agent '{self.name}' for {self.user.email}"

class KnowledgeBase(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent = models.OneToOneField(Agent, on_delete=models.CASCADE, related_name='knowledge_base')
    rag_config_id = models.CharField(max_length=255, blank=True, null=True, unique=True, help_text="The config_id from the Lyzr RAG API")
    collection_name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return f"KnowledgeBase for Agent {self.agent.name}"

class KnowledgeSource(models.Model):
    class SourceType(models.TextChoices):
        URL = 'URL', 'URL'
        FILE = 'FILE', 'File'
        TEXT = 'TEXT', 'Text'
    class IndexingStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        INDEXING = 'INDEXING', 'Indexing'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    knowledge_base = models.ForeignKey(KnowledgeBase, on_delete=models.CASCADE, related_name='sources')
    type = models.CharField(max_length=10, choices=SourceType.choices)
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True)
    file = models.FileField(upload_to='lyzr-db/', blank=True, null=True)
    status = models.CharField(max_length=10, choices=IndexingStatus.choices, default=IndexingStatus.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return f"{self.get_type_display()} source for {self.knowledge_base.agent.name}"

class Conversation(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        RESOLVED = 'RESOLVED', 'Resolved'
        FLAGGED = 'FLAGGED', 'Flagged'
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name='conversations')
    end_user_id = models.CharField(max_length=255, help_text="Session ID or unique identifier for the end-user")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self): return f"Conversation {self.id} for Agent {self.agent.name}"

class Message(models.Model):
    class Sender(models.TextChoices):
        USER = 'USER', 'User'
        AI = 'AI', 'AI'
    class Feedback(models.TextChoices):
        POSITIVE = 'POSITIVE', 'Positive'
        NEGATIVE = 'NEGATIVE', 'Negative'
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender_type = models.CharField(max_length=10, choices=Sender.choices)
    content = models.TextField()
    feedback = models.CharField(max_length=10, choices=Feedback.choices, blank=True, null=True)
    created_at = models.DateTimeField(auto_now=True)
    class Meta: ordering = ['created_at']
    def __str__(self): return f"Message from {self.sender_type} in Conversation {self.conversation.id}"