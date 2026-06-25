"""Exige 2FA a usuarios privilegiados (root y superusuarios).

Uso:
    python manage.py enforce_2fa --dry-run   # muestra a quién afectaría
    python manage.py enforce_2fa             # aplica el flag

Marca ``must_enable_2fa=True`` en el perfil de root y de los superusuarios que
todavía no tengan 2FA activo. Es el mismo mecanismo que el sistema ya usa al
rotar credenciales de root y al crear admins de sistema: el backend sigue
emitiendo tokens, pero el flag obliga al frontend a empujar el setup de TOTP.

Idempotente: a quien ya tiene ``totp_enabled`` no se le toca; correrlo dos
veces no produce cambios adicionales.
"""
from django.core.management.base import BaseCommand
from django.db.models import Q

from auth_erp.models import UserProfile


class Command(BaseCommand):
    help = 'Marca must_enable_2fa=True para root y superusuarios sin 2FA activo.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Solo muestra a quién afectaría, sin escribir.',
        )

    def handle(self, *args, **options):
        dry = options['dry_run']

        # Privilegiados: root o superusuario. Excluye a quienes ya tienen 2FA
        # activo o ya tienen el flag puesto (idempotencia).
        qs = (UserProfile.objects
              .select_related('user')
              .filter(Q(is_root=True) | Q(user__is_superuser=True))
              .filter(totp_enabled=False, must_enable_2fa=False))

        if not qs:
            self.stdout.write(self.style.SUCCESS(
                'Nada que hacer: todos los privilegiados ya tienen 2FA activo o '
                'el flag must_enable_2fa puesto.'))
            return

        for p in qs:
            kind = 'root' if p.is_root else 'superuser'
            self.stdout.write(f'  - {p.user.username} ({kind})')

        if dry:
            self.stdout.write(self.style.WARNING(
                f'[dry-run] {qs.count()} perfil(es) quedarían con must_enable_2fa=True.'))
            return

        n = qs.update(must_enable_2fa=True)
        self.stdout.write(self.style.SUCCESS(
            f'Listo: must_enable_2fa=True aplicado a {n} perfil(es).'))
