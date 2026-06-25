"""Crea las cuentas DEMO de la cátedra (RBAC equivalente a producción).

NO contiene datos reales: emails neutros @app1.academia.ar y una password demo
compartida (se rota en un entorno real). Idempotente: se puede correr varias veces.
Uso:  python manage.py seed_users  [--password erplg2303]
"""
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from auth_erp.models import UserProfile, UserRole

# Password demo compartida (solo para la práctica de cátedra; no es un secreto real).
DEMO_PASSWORD = 'erplg2303'

# Espejo del RBAC de producción (sin las cuentas personales id 9 y 10), con emails neutros.
# (username, email, is_superuser, is_staff, is_root, [(role, permission), ...])
DEMO_USERS = [
    ('admin',       'admin@app1.academia.ar',       True,  True,  False, []),
    ('gerencia',    'gerencia@app1.academia.ar',    False, False, False, [('gerencia', 'rw')]),
    ('gerencia.ro', 'gerencia.ro@app1.academia.ar', False, False, False, [('gerencia', 'r')]),
    ('comercial',   'comercial@app1.academia.ar',   False, False, False, [('comercial', 'rw')]),
    ('compras',     'compras@app1.academia.ar',     False, False, False, [('compras', 'rw'), ('panol', 'r')]),
    ('produccion',  'produccion@app1.academia.ar',  False, False, False, [('logistica', 'rw'), ('produccion', 'rw')]),
    ('root',        'root@app1.academia.ar',        False, False, True,  []),
]


class Command(BaseCommand):
    help = "Siembra cuentas demo de cátedra (RBAC espejo de producción, SIN datos reales). Idempotente."

    def add_arguments(self, parser):
        parser.add_argument('--password', default=DEMO_PASSWORD,
                            help=f'Password compartida de las cuentas demo (default: {DEMO_PASSWORD}).')

    @transaction.atomic
    def handle(self, *args, **opts):
        pwd = opts['password']

        # Garantizar un único root: desmarcar cualquier root previo (p. ej. de reset_root).
        UserProfile.objects.filter(is_root=True).update(is_root=False)

        for username, email, is_su, is_staff, is_root, roles in DEMO_USERS:
            u, created = User.objects.get_or_create(username=username, defaults={'email': email})
            u.email = email
            u.is_superuser = is_su
            u.is_staff = is_staff
            u.is_active = True
            u.set_password(pwd)
            u.save()

            prof, _ = UserProfile.objects.get_or_create(user=u)
            if is_root:
                prof.is_root = True
                prof.must_change_credentials = False  # usable directo en la demo
                prof.must_enable_2fa = False
                prof.totp_enabled = False
                prof.totp_secret = ''
                prof.save()

            # Reconciliar roles exactamente a la lista esperada.
            UserRole.objects.filter(user=u).delete()
            for role, perm in roles:
                UserRole.objects.create(user=u, role=role, permission=perm)

            tag = 'superuser' if is_su else ('root' if is_root else 'rol')
            rolestr = ', '.join(f'{r}:{p}' for r, p in roles) or '-'
            self.stdout.write(f"  {'creado    ' if created else 'actualizado'}: "
                              f"{username:12} {email:30} [{tag:9}] {rolestr}")

        self.stdout.write(self.style.SUCCESS(
            f"OK: {len(DEMO_USERS)} cuentas demo sembradas (password compartida: {pwd})"))
