from django.contrib import admin
from .models import Ticket, TicketNote

class TicketNoteInline(admin.TabularInline):
    model = TicketNote
    extra = 0
    fields = ('user', 'note', 'is_internal', 'created_at')
    readonly_fields = ('user', 'created_at')

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('ticket_id', 'title', 'status', 'priority', 'team', 'assigned_to', 'created_at')
    list_filter = ('status', 'priority', 'team')
    search_fields = ('ticket_id', 'title', 'conversation__end_user_id')
    readonly_fields = ('ticket_id', 'id_numeric', 'created_at', 'updated_at', 'resolved_at')
    inlines = [TicketNoteInline]

@admin.register(TicketNote)
class TicketNoteAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'user', 'created_at')
    search_fields = ('user__email', 'ticket__ticket_id')