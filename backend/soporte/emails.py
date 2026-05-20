from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail
from auth_erp.models import UserRole


def soporte_recipients():
    """Lista de emails que reciben notificaciones de tickets nuevos.

    Incluye superusuarios y usuarios con rol 'soporte'. Filtra emails vacíos.
    """
    user_ids = set(
        User.objects.filter(is_superuser=True).values_list('id', flat=True)
    )
    user_ids.update(
        UserRole.objects.filter(role='soporte').values_list('user_id', flat=True)
    )
    return list(
        User.objects.filter(id__in=user_ids)
            .exclude(email='')
            .values_list('email', flat=True)
    )


def send_new_ticket_email(ticket):
    """Notifica a soporte por email cuando se abre un ticket nuevo."""
    recipients = soporte_recipients()
    if not recipients:
        return

    requester = ticket.snapshot_full_name or 'Usuario'
    subject = f"[ERP-LG] Ticket #{ticket.id} — {ticket.subject}"
    body = f"""Nuevo ticket de soporte abierto.

Ticket:       #{ticket.id}
Asunto:       {ticket.subject}
Prioridad:    {ticket.get_priority_display()}
Solicitante:  {requester}
Email:        {ticket.snapshot_email}
Rol:          {ticket.snapshot_role or '(sin rol)'}
Fecha:        {ticket.created_at.strftime('%Y-%m-%d %H:%M')}

Mensaje:
─────────────────────────────────────────────
{ticket.body}
─────────────────────────────────────────────

Ingresá al ERP para responder.
"""
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'no-reply@sibotec.com.ar',
            recipient_list=recipients,
            fail_silently=True,
        )
    except Exception:
        # No bloqueamos la creación del ticket si falla el envío.
        pass


def send_ticket_comment_email(comment):
    """Notifica al creador del ticket cuando soporte agrega un comentario.

    Si el autor del comentario es el propio creador, no se notifica (es noise).
    """
    ticket = comment.ticket
    if not ticket.created_by or not ticket.created_by.email:
        return
    if comment.author_id == ticket.created_by_id:
        return

    author_label = (
        f"{comment.author.first_name} {comment.author.last_name}".strip()
        if comment.author else 'Soporte'
    ) or 'Soporte'

    subject = f"[ERP-LG] Nueva respuesta en tu ticket #{ticket.id}"
    body = f"""Soporte respondió a tu ticket.

Ticket:  #{ticket.id} — {ticket.subject}
Estado:  {ticket.get_status_display()}
Por:     {author_label}

Mensaje:
─────────────────────────────────────────────
{comment.body}
─────────────────────────────────────────────

Ingresá al ERP para ver el hilo completo.
"""
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'no-reply@sibotec.com.ar',
            recipient_list=[ticket.created_by.email],
            fail_silently=True,
        )
    except Exception:
        pass
