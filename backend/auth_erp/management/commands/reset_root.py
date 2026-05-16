"""Resetea el usuario root a credenciales de fábrica.

Uso: python manage.py reset_root

Restaura email/contraseña por defecto, limpia 2FA y vuelve a exigir el
cambio de credenciales en el próximo ingreso. Mecanismo de recuperación
explícito y deliberado (equivalente a ROOT_RESET=1 en el deploy).
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

from auth_erp.models import UserProfile

ROOT_DEFAULT_EMAIL = 'root@admin.com.ar'
ROOT_DEFAULT_PASSWORD = 'Admin2026!'


class Command(BaseCommand):
    help = 'Resetea el usuario root a credenciales de fábrica y limpia 2FA.'

    def handle(self, *args, **options):
        profile = UserProfile.objects.filter(is_root=True).select_related('user').first()

        if not profile:
            # No existe todavía: crearlo de cero.
            if User.objects.filter(username=ROOT_DEFAULT_EMAIL).exists():
                self.stderr.write(self.style.ERROR(
                    f'Existe un usuario {ROOT_DEFAULT_EMAIL} sin perfil root. Abortado.'))
                return
            u = User.objects.create_user(
                username=ROOT_DEFAULT_EMAIL,
                email=ROOT_DEFAULT_EMAIL,
                password=ROOT_DEFAULT_PASSWORD,
                first_name='Root',
            )
            u.is_active = True
            u.is_superuser = False
            u.is_staff = False
            u.save()
            UserProfile.objects.create(
                user=u, is_root=True, must_change_credentials=True, must_enable_2fa=False,
            )
            self.stdout.write(self.style.SUCCESS('Usuario root creado con credenciales de fábrica.'))
            return

        u = profile.user
        u.username = ROOT_DEFAULT_EMAIL
        u.email = ROOT_DEFAULT_EMAIL
        u.set_password(ROOT_DEFAULT_PASSWORD)
        u.is_active = True
        u.is_superuser = False
        u.is_staff = False
        u.save()

        profile.must_change_credentials = True
        profile.must_enable_2fa = False
        profile.totp_secret = ''
        profile.totp_enabled = False
        profile.pending_email = ''
        profile.pending_password = ''
        profile.cred_change_token = None
        profile.cred_change_token_created_at = None
        profile.save()

        self.stdout.write(self.style.SUCCESS(
            f'Root reseteado a fábrica ({ROOT_DEFAULT_EMAIL}). 2FA limpio, cambio de credenciales re-armado.'))
