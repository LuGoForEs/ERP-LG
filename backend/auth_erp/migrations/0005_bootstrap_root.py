"""Bootstrap idempotente del usuario root.

Corre en cada `migrate`. Crea el root SOLO si no existe.
Si la env var ROOT_RESET es truthy, restaura el root existente a fábrica
(credenciales por defecto, 2FA limpio, must_change re-armado). Deploys de
rutina nunca pisan un root ya rotado.
"""
import os
from django.db import migrations
from django.contrib.auth.hashers import make_password

ROOT_DEFAULT_EMAIL = 'root@admin.com.ar'
ROOT_DEFAULT_PASSWORD = 'Admin2026!'


def _truthy(val):
    return str(val).strip().lower() in ('1', 'true', 'yes', 'on')


def bootstrap_root(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    UserProfile = apps.get_model('auth_erp', 'UserProfile')

    existing = UserProfile.objects.filter(is_root=True).select_related('user').first()

    if existing:
        if not _truthy(os.environ.get('ROOT_RESET', '')):
            return  # idempotente: root ya existe y no se pidió reset
        # Reset explícito a fábrica
        u = existing.user
        u.username = ROOT_DEFAULT_EMAIL
        u.email = ROOT_DEFAULT_EMAIL
        u.password = make_password(ROOT_DEFAULT_PASSWORD)
        u.is_active = True
        u.is_superuser = False
        u.is_staff = False
        u.save()
        existing.must_change_credentials = True
        existing.must_enable_2fa = False
        existing.totp_secret = ''
        existing.totp_enabled = False
        existing.pending_email = ''
        existing.pending_password = ''
        existing.cred_change_token = None
        existing.cred_change_token_created_at = None
        existing.save()
        return

    # No existe: crear de cero (idempotente respecto a email duplicado)
    if User.objects.filter(username=ROOT_DEFAULT_EMAIL).exists():
        return

    u = User.objects.create(
        username=ROOT_DEFAULT_EMAIL,
        email=ROOT_DEFAULT_EMAIL,
        first_name='Root',
        last_name='',
        password=make_password(ROOT_DEFAULT_PASSWORD),
        is_active=True,
        is_superuser=False,
        is_staff=False,
    )
    UserProfile.objects.create(
        user=u,
        is_root=True,
        must_change_credentials=True,
        must_enable_2fa=False,
    )


def noop_reverse(apps, schema_editor):
    # No borramos el root al revertir (operación destructiva e indeseada).
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('auth_erp', '0004_root_user'),
    ]

    operations = [
        migrations.RunPython(bootstrap_root, noop_reverse),
    ]
