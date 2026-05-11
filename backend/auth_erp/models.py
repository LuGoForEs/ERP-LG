import uuid
from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user                      = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    totp_secret               = models.CharField(max_length=64, blank=True, default='')
    totp_enabled              = models.BooleanField(default=False)
    dni                       = models.CharField(max_length=20, blank=True, default='')
    expiration_date           = models.DateField(null=True, blank=True)
    activation_token          = models.UUIDField(null=True, blank=True, db_index=True)
    activation_token_created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'user_profiles'


class UserRole(models.Model):
    ROLE_CHOICES = [
        ('comercial',      'Comercial'),
        ('administracion', 'Administración'),
        ('desarrollo',     'Desarrollo'),
        ('compras',        'Compras'),
        ('panol',          'Pañol'),
        ('produccion',     'Producción'),
        ('logistica',      'Logística'),
        ('gerencia',       'Gerencia'),
    ]
    PERM_CHOICES = [
        ('rw', 'Lectura/Escritura'),
        ('r',  'Solo lectura'),
    ]

    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='roles')
    role       = models.CharField(max_length=20, choices=ROLE_CHOICES)
    permission = models.CharField(max_length=2, choices=PERM_CHOICES, default='rw')

    class Meta:
        db_table        = 'user_roles'
        unique_together = [('user', 'role')]
