from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

class User(AbstractUser):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    onboarding_completed = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'full_name']

    def __str__(self):
        return self.email
    
class Agent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='agent')
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    
    # For personality and prompt engineering
    system_prompt = models.TextField(blank=True, null=True)
    
    # For the widget's look and feel
    widget_settings = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Agent '{self.name}' for {self.user.email}"


class KnowledgeSource(models.Model):
    class SourceType(models.TextChoices):
        URL = 'URL', 'URL'
        FILE = 'FILE', 'File'
        FAQ = 'FAQ', 'FAQ'

    class IndexingStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        INDEXING = 'INDEXING', 'Indexing'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name='knowledge_sources')
    type = models.CharField(max_length=10, choices=SourceType.choices)
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True)
    
    file = models.FileField(upload_to='lyzr-db/', blank=True, null=True)

    status = models.CharField(
        max_length=10, 
        choices=IndexingStatus.choices, 
        default=IndexingStatus.PENDING
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_type_display()} source for {self.agent.name}: {self.title}"