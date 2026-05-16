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
    reset_token               = models.UUIDField(null=True, blank=True, db_index=True)
    reset_token_created_at    = models.DateTimeField(null=True, blank=True)

    # ─── Root user (bypass para administración) ───────────────────────────────
    is_root                   = models.BooleanField(default=False, db_index=True)
    # Fuerza cambio de email + contraseña en el primer ingreso del root.
    must_change_credentials   = models.BooleanField(default=False)
    # Fuerza configurar 2FA antes de acceder (root y admins de sistema creados).
    must_enable_2fa           = models.BooleanField(default=False)
    # Credenciales nuevas en espera de confirmación por email (rotación root).
    pending_email             = models.EmailField(blank=True, default='')
    pending_password          = models.CharField(max_length=255, blank=True, default='')  # hash
    cred_change_token         = models.UUIDField(null=True, blank=True, db_index=True)
    cred_change_token_created_at = models.DateTimeField(null=True, blank=True)

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


class PendingSystemAdmin(models.Model):
    """Alta de un admin de sistema pendiente de confirmación por email.

    El root inicia la creación; el admin recién se materializa cuando el root
    confirma vía el link enviado a su propia casilla (válido 1 hora).
    """
    first_name              = models.CharField(max_length=150, blank=True, default='')
    last_name               = models.CharField(max_length=150, blank=True, default='')
    dni                     = models.CharField(max_length=20, blank=True, default='')
    email                   = models.EmailField()
    confirm_token           = models.UUIDField(default=uuid.uuid4, db_index=True)
    confirm_token_created_at = models.DateTimeField(auto_now_add=True)
    requested_by            = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='pending_admins_requested',
    )

    class Meta:
        db_table = 'pending_system_admins'
