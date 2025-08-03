import logging
from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from .models import Invitation

logger = logging.getLogger(__name__)

@shared_task
def send_invitation_email_task(invitation_id: str):
    """
    Sends an invitation email to a user to join a team.
    """
    try:
        invitation = Invitation.objects.select_related('team', 'invited_by').get(id=invitation_id)
        
        frontend_url = "https://lyzr-founder.vercel.app/invitations"
        
        context = {
            'team_name': invitation.team.name,
            'inviter_name': invitation.invited_by.email,
            'invitation_link': frontend_url
        }
        
        html_message = render_to_string('emails/team_invitation.html', context)
        text_message = f"You have been invited to join the team '{invitation.team.name}' on Lyzr. Please log in and visit the invitations page to accept."

        send_mail(
            subject=f"Invitation to join team '{invitation.team.name}' on Lyzr",
            message=text_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invitation.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Successfully sent invitation email for invitation {invitation.id} to {invitation.email}")

    except Invitation.DoesNotExist:
        logger.error(f"Invitation with ID {invitation_id} not found for sending email.")
    except Exception as e:
        logger.error(f"Failed to send invitation email for invitation {invitation_id}: {e}", exc_info=True)