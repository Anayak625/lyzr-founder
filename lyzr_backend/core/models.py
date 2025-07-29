# Enhanced Django models with improved knowledge source handling

import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import MinValueValidator, MaxValueValidator, URLValidator
from django.core.exceptions import ValidationError
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
    
    def __str__(self): 
        return self.email


class Agent(models.Model):
    class LyzrModel(models.TextChoices):
        GPT_4O_MINI = 'gpt-4o-mini', 'GPT-4o Mini'
        GPT_4_TURBO = 'gpt-4-turbo', 'GPT-4 Turbo'
        GPT_3_5_TURBO = 'gpt-3.5-turbo', 'GPT-3.5 Turbo'
        GEMINI_1_5_PRO = 'gemini/gemini-1.5-pro-latest', 'Gemini 1.5 Pro'
        GEMINI_1_5_FLASH = 'gemini/gemini-1.5-flash-latest', 'Gemini 1.5 Flash'
        CLAUDE_3_SONNET = 'claude-3-sonnet-20240229', 'Claude 3 Sonnet'
        CLAUDE_3_HAIKU = 'claude-3-haiku-20240307', 'Claude 3 Haiku'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='agents')
    lyzr_agent_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    model = models.CharField(max_length=50, choices=LyzrModel.choices, default=LyzrModel.GPT_4O_MINI)
    system_prompt = models.TextField(
        blank=True, 
        default='You are a helpful customer support assistant. Answer questions accurately based on the provided documents. If you do not know the answer, say "I am not sure how to answer that, but I can connect you with a human agent."'
    )
    temperature = models.FloatField(default=0.2, validators=[MinValueValidator(0.0), MaxValueValidator(2.0)])
    top_p = models.FloatField(default=1.0, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)])
    widget_settings = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # New fields for better agent management
    description = models.TextField(blank=True, help_text="Description of what this agent does")
    max_tokens = models.IntegerField(default=1500, validators=[MinValueValidator(1), MaxValueValidator(8000)])
    timeout_seconds = models.IntegerField(default=30, validators=[MinValueValidator(5), MaxValueValidator(300)])
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self): 
        return f"Agent '{self.name}' for {self.user.email}"
    
    def clean(self):
        """Validate agent configuration"""
        super().clean()
        if self.temperature < 0 or self.temperature > 2:
            raise ValidationError("Temperature must be between 0 and 2")
        if self.top_p < 0 or self.top_p > 1:
            raise ValidationError("Top P must be between 0 and 1")


class KnowledgeBase(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent = models.OneToOneField(Agent, on_delete=models.CASCADE, related_name='knowledge_base')
    lyzr_rag_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    collection_name = models.CharField(max_length=255, unique=True, help_text="Internal vector DB collection name")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Enhanced fields
    description = models.TextField(blank=True, help_text="Description of the knowledge base content")
    total_documents = models.IntegerField(default=0, help_text="Total number of indexed documents")
    last_indexed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self): 
        return f"KnowledgeBase for Agent {self.agent.name}"


class KnowledgeSource(models.Model):
    class SourceType(models.TextChoices):
        URL = 'URL', 'URL/Website'
        FILE = 'FILE', 'File Upload'
        TEXT = 'TEXT', 'Raw Text'
        
    class FileType(models.TextChoices):
        PDF = 'pdf', 'PDF Document'
        DOCX = 'docx', 'Word Document'
        DOC = 'doc', 'Word Document (Legacy)'
        TXT = 'txt', 'Text File'
        CSV = 'csv', 'CSV File'
        JSON = 'json', 'JSON File'
        HTML = 'html', 'HTML File'
        MD = 'md', 'Markdown File'
        
    class IndexingStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        INDEXING = 'INDEXING', 'Indexing'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'
        RETRY = 'RETRY', 'Retrying'
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    knowledge_base = models.ForeignKey(KnowledgeBase, on_delete=models.CASCADE, related_name='sources')
    type = models.CharField(max_length=10, choices=SourceType.choices)
    file_type = models.CharField(max_length=10, choices=FileType.choices, blank=True, null=True)
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True, help_text="URL or raw text content")
    file = models.FileField(storage=PrivateAzureStorage(), upload_to='knowledge_sources/', blank=True, null=True)
    status = models.CharField(max_length=10, choices=IndexingStatus.choices, default=IndexingStatus.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Enhanced fields for better tracking
    file_size = models.BigIntegerField(null=True, blank=True, help_text="File size in bytes")
    processing_time = models.DurationField(null=True, blank=True, help_text="Time taken to process")
    error_message = models.TextField(blank=True, help_text="Error details if indexing failed")
    retry_count = models.IntegerField(default=0, help_text="Number of retry attempts")
    indexed_at = models.DateTimeField(null=True, blank=True)
    document_count = models.IntegerField(default=0, help_text="Number of documents extracted")
    
    # Metadata for different source types
    metadata = models.JSONField(default=dict, help_text="Additional metadata specific to source type")
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self): 
        return f"{self.get_type_display()}: {self.title}"
    
    def clean(self):
        """Validate knowledge source configuration"""
        super().clean()
        
        if self.type == self.SourceType.URL:
            if not self.content:
                raise ValidationError("URL content is required for URL sources")
            # Validate URL format
            validator = URLValidator()
            try:
                validator(self.content)
            except ValidationError:
                raise ValidationError("Invalid URL format")
                
        elif self.type == self.SourceType.FILE:
            if not self.file:
                raise ValidationError("File is required for FILE sources")
            # Auto-detect file type from extension
            if self.file and not self.file_type:
                file_extension = self.file.name.split('.')[-1].lower()
                if file_extension in dict(self.FileType.choices):
                    self.file_type = file_extension
                    
        elif self.type == self.SourceType.TEXT:
            if not self.content:
                raise ValidationError("Text content is required for TEXT sources")
    
    def save(self, *args, **kwargs):
        """Override save to handle file metadata"""
        if self.file and not self.file_size:
            try:
                self.file_size = self.file.size
            except (AttributeError, OSError):
                pass
                
        # Auto-set file type if not provided
        if self.type == self.SourceType.FILE and self.file and not self.file_type:
            file_extension = self.file.name.split('.')[-1].lower()
            if file_extension in dict(self.FileType.choices):
                self.file_type = file_extension
        
        super().save(*args, **kwargs)
    
    def get_file_extension(self):
        """Get file extension for file sources"""
        if self.file:
            return self.file.name.split('.')[-1].lower()
        return None
    
    def is_supported_file_type(self):
        """Check if file type is supported"""
        if self.type != self.SourceType.FILE:
            return True
        return self.file_type in dict(self.FileType.choices)
    
    def can_retry(self):
        """Check if source can be retried"""
        return self.status == self.IndexingStatus.FAILED and self.retry_count < 3


class Conversation(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        RESOLVED = 'RESOLVED', 'Resolved'
        FLAGGED = 'FLAGGED', 'Flagged for Review'
        ARCHIVED = 'ARCHIVED', 'Archived'
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name='conversations')
    end_user_id = models.CharField(max_length=255, help_text="Session or user identifier")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    summary = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Enhanced fields
    user_agent = models.TextField(blank=True, help_text="Browser user agent")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    referrer = models.URLField(blank=True, help_text="Referrer URL")
    session_duration = models.DurationField(null=True, blank=True)
    message_count = models.IntegerField(default=0)
    satisfaction_rating = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="User satisfaction rating (1-5)"
    )
    
    class Meta:
        unique_together = ('agent', 'end_user_id')
        ordering = ['-updated_at']
        
    def __str__(self): 
        return f"Conversation {self.id} with {self.end_user_id}"
    
    def update_message_count(self):
        """Update cached message count"""
        self.message_count = self.messages.count()
        self.save(update_fields=['message_count'])


class Message(models.Model):
    class Sender(models.TextChoices):
        USER = 'USER', 'User'
        AI = 'AI', 'AI Assistant'
        SYSTEM = 'SYSTEM', 'System'
        
    class Feedback(models.TextChoices):
        POSITIVE = 'POSITIVE', 'Positive'
        NEGATIVE = 'NEGATIVE', 'Negative'
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender_type = models.CharField(max_length=10, choices=Sender.choices)
    content = models.TextField()
    feedback = models.CharField(max_length=10, choices=Feedback.choices, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Enhanced fields
    response_time = models.DurationField(null=True, blank=True, help_text="Time taken to generate response")
    token_count = models.IntegerField(null=True, blank=True, help_text="Number of tokens in message")
    model_used = models.CharField(max_length=100, blank=True, help_text="Model used for AI responses")
    confidence_score = models.FloatField(
        null=True, blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text="AI confidence score"
    )
    
    # Metadata for additional context
    metadata = models.JSONField(default=dict, help_text="Additional message metadata")
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['sender_type', 'created_at']),
        ]
        
    def __str__(self): 
        return f"Message from {self.sender_type} at {self.created_at}"
    
    def save(self, *args, **kwargs):
        """Override save to update conversation message count"""
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new:
            # Update conversation message count
            self.conversation.update_message_count()
    
    def get_word_count(self):
        """Get word count of message content"""
        return len(self.content.split())


class TicketNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='notes')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ticket_notes')
    note = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Enhanced fields
    is_internal = models.BooleanField(default=True, help_text="Internal note not visible to end user")
    priority = models.CharField(
        max_length=10,
        choices=[('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('URGENT', 'Urgent')],
        default='MEDIUM'
    )
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self): 
        return f"Note by {self.user.email} on conversation {self.conversation.id}"


# New model for tracking API usage and costs
class APIUsage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_usage')
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name='api_usage', null=True, blank=True)
    
    # Usage metrics
    endpoint = models.CharField(max_length=100, help_text="API endpoint called")
    request_count = models.IntegerField(default=1)
    tokens_used = models.IntegerField(default=0)
    response_time = models.DurationField(null=True, blank=True)
    
    # Cost tracking
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=6, default=0.0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    date = models.DateField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['agent', 'date']),
        ]
        
    def __str__(self):
        return f"API Usage for {self.user.email} - {self.endpoint}"


# New model for system health monitoring
class SystemHealth(models.Model):
    class ComponentType(models.TextChoices):
        LYZR_API = 'LYZR_API', 'Lyzr API'
        DATABASE = 'DATABASE', 'Database'
        REDIS = 'REDIS', 'Redis'
        STORAGE = 'STORAGE', 'File Storage'
        
    class Status(models.TextChoices):
        HEALTHY = 'HEALTHY', 'Healthy'
        DEGRADED = 'DEGRADED', 'Degraded'
        DOWN = 'DOWN', 'Down'
        
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    component = models.CharField(max_length=20, choices=ComponentType.choices)
    status = models.CharField(max_length=10, choices=Status.choices)
    response_time = models.DurationField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    checked_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-checked_at']
        
    def __str__(self):
        return f"{self.component} - {self.status} at {self.checked_at}"