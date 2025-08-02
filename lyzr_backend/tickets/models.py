import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from core.models import Conversation # Corrected Dependency
from teams.models import Team # Corrected Dependency

def get_next_ticket_id():
    last_ticket = Ticket.objects.order_by('id_numeric').last()
    if not last_ticket:
        return 1
    return last_ticket.id_numeric + 1

class Ticket(models.Model):
    class Status(models.TextChoices):
        NEW = 'NEW', 'New'
        OPEN = 'OPEN', 'Open'
        PENDING = 'PENDING', 'Pending Customer Response'
        ON_HOLD = 'ON_HOLD', 'On Hold'
        SOLVED = 'SOLVED', 'Solved'
        CLOSED = 'CLOSED', 'Closed'

    class Priority(models.TextChoices):
        LOW = 'LOW', 'Low'
        NORMAL = 'NORMAL', 'Normal'
        HIGH = 'HIGH', 'High'
        URGENT = 'URGENT', 'Urgent'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    id_numeric = models.PositiveIntegerField(unique=True, default=get_next_ticket_id, editable=False)
    ticket_id = models.CharField(max_length=20, unique=True, editable=False)
    
    conversation = models.OneToOneField('core.Conversation', on_delete=models.CASCADE, related_name='ticket')
    title = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL)
    
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tickets')
    team = models.ForeignKey('teams.Team', on_delete=models.SET_NULL, null=True, blank=True, related_name='team_tickets')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.ticket_id:
            if not self.id_numeric:
                self.id_numeric = get_next_ticket_id()
            self.ticket_id = f"LYZR-{self.id_numeric:06d}"
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['-created_at']
        app_label = 'tickets'

    def __str__(self):
        return f"Ticket {self.ticket_id}: {self.title}"


class TicketNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='notes')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ticket_notes')
    note = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_internal = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        app_label = 'tickets'

    def __str__(self):
        return f"Note by {self.user.email} on ticket {self.ticket.ticket_id}"