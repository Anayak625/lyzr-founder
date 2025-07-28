import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import MinValueValidator, MaxValueValidator
from lyzr_backend.storages import PrivateAzureStorage

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    username = None
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    onboarding_completed = models.BooleanField(default=False)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']
    objects = UserManager()
    def __str__(self): return self.email

class Agent(models.Model):
    class LyzrModel(models.TextChoices):
        GPT_4O = 'gpt-4o', 'GPT-4o'
        GPT_4_TURBO = 'gpt-4-turbo', 'GPT-4 Turbo'
        GPT_3_5_TURBO = 'gpt-3.5-turbo', 'GPT-3.5 Turbo'
        GEMINI_1_5_PRO = 'gemini/gemini-1.5-pro-latest', 'Gemini 1.5 Pro'
        GEMINI_1_5_FLASH = 'gemini/gemini-1.5-flash-latest', 'Gemini 1.5 Flash'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='agents')
    lyzr_agent_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    model = models.CharField(max_length=50, choices=LyzrModel.choices, default=LyzrModel.GPT_4O)
    system_prompt = models.TextField(blank=True, default='You are a helpful customer support assistant. Answer questions accurately based on the provided documents. If you do not know the answer, say "I am not sure how to answer that, but I can connect you with a human agent."')
    temperature = models.FloatField(default=0.2, validators=[MinValueValidator(0.0), MaxValueValidator(2.0)])
    top_p = models.FloatField(default=1.0, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)])
    widget_settings = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self): return f"Agent '{self.name}' for {self.user.email}"

class KnowledgeBase(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent = models.OneToOneField(Agent, on_delete=models.CASCADE, related_name='knowledge_base')
    lyzr_rag_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    collection_name = models.CharField(max_length=255, unique=True, help_text="Internal vector DB collection name")
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
    file = models.FileField(storage=PrivateAzureStorage(), upload_to='knowledge_sources/', blank=True, null=True)
    status = models.CharField(max_length=10, choices=IndexingStatus.choices, default=IndexingStatus.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self): return f"{self.get_type_display()}: {self.title}"

class Conversation(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        RESOLVED = 'RESOLVED', 'Resolved'
        FLAGGED = 'FLAGGED', 'Flagged for Review'
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name='conversations')
    end_user_id = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    summary = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        unique_together = ('agent', 'end_user_id')
    def __str__(self): return f"Conversation {self.id} with {self.end_user_id}"

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
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ['created_at']
    def __str__(self): return f"Message from {self.sender_type} at {self.created_at}"

class TicketNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='notes')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ticket_notes')
    note = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ['-created_at']
    def __str__(self): return f"Note by {self.user.email} on conversation {self.conversation.id}"