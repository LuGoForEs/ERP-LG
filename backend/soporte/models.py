from django.conf import settings
from django.db import models


class Ticket(models.Model):
    STATUS_CHOICES = [
        ('abierto',    'Abierto'),
        ('en_proceso', 'En proceso'),
        ('resuelto',   'Resuelto'),
        ('cerrado',    'Cerrado'),
    ]
    PRIORITY_CHOICES = [
        ('baja',  'Baja'),
        ('media', 'Media'),
        ('alta',  'Alta'),
        ('urgente', 'Urgente'),
    ]

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='tickets_created', db_column='created_by_id',
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='tickets_assigned', db_column='assignee_id',
    )
    subject = models.CharField(max_length=200)
    body = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='abierto', db_index=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='media')

    # Snapshot del rol/contexto del usuario al momento de abrir el ticket (campo de
    # ayuda para soporte; no se actualiza si después cambia el rol).
    snapshot_full_name = models.CharField(max_length=255, blank=True, default='')
    snapshot_email     = models.EmailField(blank=True, default='')
    snapshot_role      = models.CharField(max_length=80, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'soporte_tickets'
        ordering = ['-created_at']


class TicketComment(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='comments', db_column='ticket_id')
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='ticket_comments', db_column='author_id',
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'soporte_ticket_comments'
        ordering = ['created_at']


class TicketAttachment(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='attachments', db_column='ticket_id')
    file = models.FileField(upload_to='tickets/')
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=120, blank=True, default='')
    size = models.PositiveIntegerField(default=0)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='ticket_attachments', db_column='uploaded_by_id',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'soporte_ticket_attachments'
        ordering = ['created_at']
