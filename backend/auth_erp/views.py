import io
import uuid
import base64
import requests
import pyotp
import qrcode

from datetime import timedelta, date
from django.conf import settings
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission, SAFE_METHODS
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import UserProfile, UserRole, PendingSystemAdmin
from .emails import (
    send_activation_email, send_reset_email,
    send_cred_change_email, send_admin_creation_confirm_email,
)

# Ventana de validez de los links de confirmación del root (rotación de
# credenciales y alta de admin de sistema).
ROOT_LINK_TTL = timedelta(hours=1)

ALL_PANELS = ['comercial', 'administracion', 'desarrollo', 'compras', 'panol', 'produccion', 'logistica']


# ─── Permissions ──────────────────────────────────────────────────────────────

class IsSuperUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsRoot(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated):
            return False
        profile = getattr(u, 'profile', None)
        return bool(profile and profile.is_root)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _verify_recaptcha(token):
    secret = getattr(settings, 'RECAPTCHA_SECRET_KEY', '')
    if not secret:
        return True
    try:
        r = requests.post(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            data={'secret': secret, 'response': token},
            timeout=5,
        )
        return r.json().get('success', False)
    except Exception:
        return False


def _build_roles_payload(user):
    """Returns list of {role, perm} dicts. Gerencia expands to all 7 panels."""
    if user.is_superuser:
        return [{'role': p, 'perm': 'rw'} for p in ALL_PANELS + ['usuarios']]

    perms = {}
    for ur in UserRole.objects.filter(user=user):
        if ur.role == 'gerencia':
            for panel in ALL_PANELS:
                if panel not in perms:
                    perms[panel] = ur.permission
        else:
            perms[ur.role] = ur.permission  # individual role overrides gerencia

    return [{'role': k, 'perm': v} for k, v in perms.items()]


def _issue_tokens(user, response_data=None):
    refresh = RefreshToken.for_user(user)
    roles = _build_roles_payload(user)
    profile, _ = UserProfile.objects.get_or_create(user=user)
    data = {
        'access': str(refresh.access_token),
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': f'{user.first_name} {user.last_name}'.strip() or user.username,
            'is_superuser': user.is_superuser,
            'totp_enabled': profile.totp_enabled,
            'is_root': profile.is_root,
            'must_enable_2fa': profile.must_enable_2fa,
            'roles': roles,
        },
        **(response_data or {}),
    }
    response = Response(data)
    response.set_cookie(
        'refresh_token',
        str(refresh),
        httponly=True,
        samesite='Lax',
        secure=not getattr(settings, 'DEBUG', False),
        max_age=7 * 24 * 3600,
        path='/api/v1/auth/refresh/',
    )
    return response


# ─── Auth Views ───────────────────────────────────────────────────────────────

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email     = request.data.get('email', '').strip()
        password  = request.data.get('password', '')
        turnstile = request.data.get('turnstile_token', '')

        if not _verify_recaptcha(turnstile):
            return Response({'detail': 'Verificación de seguridad fallida. Intentá de nuevo.'}, status=400)

        user = None
        try:
            u = User.objects.get(email=email)
            from django.contrib.auth import authenticate
            user = authenticate(request, username=u.username, password=password)
        except User.DoesNotExist:
            from django.contrib.auth import authenticate
            user = authenticate(request, username=email, password=password)

        if not user:
            return Response({'detail': 'Email o contraseña incorrectos.'}, status=401)

        profile, _ = UserProfile.objects.get_or_create(user=user)

        # Check account expiration
        if profile.expiration_date and profile.expiration_date < date.today():
            return Response({'detail': 'Tu cuenta ha expirado. Contactá al administrador.'}, status=401)

        # Root con cambio de credenciales pendiente: no se emiten tokens.
        if profile.is_root and profile.must_change_credentials:
            token = AccessToken()
            token['user_id'] = user.id
            token['cred_change_pending'] = True
            token.set_exp(lifetime=timedelta(minutes=15))
            return Response({'requires_cred_change': True, 'partial_token': str(token)})

        if profile.totp_enabled:
            token = AccessToken()
            token['user_id'] = user.id
            token['2fa_pending'] = True
            token.set_exp(lifetime=timedelta(minutes=5))
            return Response({'requires_2fa': True, 'partial_token': str(token)})

        return _issue_tokens(user)


class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        raw = request.COOKIES.get('refresh_token')
        if not raw:
            return Response({'detail': 'Sin sesión activa.'}, status=401)
        try:
            refresh = RefreshToken(raw)
            user_id = refresh['user_id']
            user = User.objects.get(id=user_id)
        except (TokenError, User.DoesNotExist):
            return Response({'detail': 'Sesión expirada. Iniciá sesión nuevamente.'}, status=401)

        # Lazy expiration check
        profile, _ = UserProfile.objects.get_or_create(user=user)
        if profile.expiration_date and profile.expiration_date < date.today():
            return Response({'detail': 'Cuenta expirada.'}, status=401)

        return _issue_tokens(user)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({'detail': 'Sesión cerrada.'})
        response.delete_cookie('refresh_token', path='/api/v1/auth/refresh/')
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': f'{user.first_name} {user.last_name}'.strip() or user.username,
            'totp_enabled': profile.totp_enabled,
            'is_superuser': user.is_superuser,
            'is_root': profile.is_root,
            'must_enable_2fa': profile.must_enable_2fa,
            'roles': _build_roles_payload(user),
        })


# ─── 2FA Views ────────────────────────────────────────────────────────────────

class TwoFAVerifyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        partial_token_str = request.data.get('partial_token', '')
        code = request.data.get('code', '').replace(' ', '')

        try:
            token = AccessToken(partial_token_str)
            if not token.get('2fa_pending'):
                raise TokenError('Not a 2FA token')
            user_id = token['user_id']
        except TokenError:
            return Response({'detail': 'Token inválido o expirado.'}, status=401)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'Usuario no encontrado.'}, status=404)

        profile = user.profile
        totp = pyotp.TOTP(profile.totp_secret)
        if not totp.verify(code, valid_window=1):
            return Response({'detail': 'Código incorrecto. Verificá la hora de tu dispositivo.'}, status=400)

        return _issue_tokens(user)


class TwoFASetupView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)

        if profile.totp_enabled:
            return Response({'detail': '2FA ya está activo.'}, status=400)

        secret = pyotp.random_base32()
        profile.totp_secret = secret
        profile.save()

        uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user.email or user.username,
            issuer_name='ERP-LG',
        )

        img = qrcode.make(uri)
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        qr_b64 = base64.b64encode(buf.getvalue()).decode()

        return Response({
            'secret': secret,
            'qr_code': f'data:image/png;base64,{qr_b64}',
            'uri': uri,
        })


class TwoFAEnableView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get('code', '').replace(' ', '')
        profile, _ = UserProfile.objects.get_or_create(user=request.user)

        if not profile.totp_secret:
            return Response({'detail': 'Primero generá el QR desde /auth/2fa/setup/'}, status=400)

        totp = pyotp.TOTP(profile.totp_secret)
        if not totp.verify(code, valid_window=1):
            return Response({'detail': 'Código incorrecto.'}, status=400)

        profile.totp_enabled = True
        profile.must_enable_2fa = False
        profile.save()
        return Response({'detail': '2FA activado correctamente.'})


class TwoFADisableView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get('code', '').replace(' ', '')
        profile, _ = UserProfile.objects.get_or_create(user=request.user)

        if profile.is_root:
            return Response({'detail': 'El usuario root no puede desactivar 2FA.'}, status=403)

        if not profile.totp_enabled:
            return Response({'detail': '2FA no está activo.'}, status=400)

        totp = pyotp.TOTP(profile.totp_secret)
        if not totp.verify(code, valid_window=1):
            return Response({'detail': 'Código incorrecto.'}, status=400)

        profile.totp_enabled = False
        profile.totp_secret = ''
        profile.save()
        return Response({'detail': '2FA desactivado.'})


# ─── User Management Views (SuperUser only) ───────────────────────────────────

def _serialize_user(user):
    profile = getattr(user, 'profile', None)
    roles = list(UserRole.objects.filter(user=user).values('id', 'role', 'permission'))
    return {
        'id': user.id,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'username': user.username,
        'is_active': user.is_active,
        'is_superuser': user.is_superuser,
        'is_root': profile.is_root if profile else False,
        'dni': profile.dni if profile else '',
        'expiration_date': profile.expiration_date.isoformat() if profile and profile.expiration_date else None,
        'roles': roles,
    }


def _is_root_user(user):
    profile = getattr(user, 'profile', None)
    return bool(profile and profile.is_root)


class UserListView(APIView):
    permission_classes = [IsSuperUser]

    def get(self, request):
        # El root nunca aparece en el nodo Usuarios normal.
        users = (User.objects
                 .prefetch_related('roles', 'profile')
                 .exclude(profile__is_root=True)
                 .order_by('last_name', 'first_name'))
        return Response([_serialize_user(u) for u in users])


class UserCreateView(APIView):
    permission_classes = [IsSuperUser]

    def post(self, request):
        data = request.data
        first_name      = data.get('first_name', '').strip()
        last_name       = data.get('last_name', '').strip()
        dni             = data.get('dni', '').strip()
        email           = data.get('email', '').strip().lower()
        roles_input     = data.get('roles', [])
        has_expiration  = data.get('has_expiration', False)
        expiration_date = data.get('expiration_date', None)

        if not email:
            return Response({'detail': 'El email es requerido.'}, status=400)
        if User.objects.filter(email=email).exists():
            return Response({'detail': 'Ya existe un usuario con ese email.'}, status=400)

        user = User.objects.create(
            username=email,
            email=email,
            first_name=first_name,
            last_name=last_name,
            is_active=False,
        )
        user.set_unusable_password()
        user.save()

        token = uuid.uuid4()
        profile = UserProfile.objects.create(
            user=user,
            dni=dni,
            expiration_date=expiration_date if has_expiration else None,
            activation_token=token,
            activation_token_created_at=timezone.now(),
        )

        for r in roles_input:
            role = r.get('role', '')
            perm = r.get('permission', 'rw')
            if role in dict(UserRole.ROLE_CHOICES):
                UserRole.objects.get_or_create(user=user, role=role, defaults={'permission': perm})

        try:
            send_activation_email(user, token, settings.FRONTEND_URL)
        except Exception as e:
            user.delete()
            return Response({'detail': f'Error al enviar email de activación: {e}'}, status=500)

        return Response(_serialize_user(user), status=201)


class UserDetailView(APIView):
    permission_classes = [IsSuperUser]

    def get(self, request, pk):
        try:
            user = User.objects.prefetch_related('roles', 'profile').get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Usuario no encontrado.'}, status=404)
        if _is_root_user(user):
            return Response({'detail': 'Usuario no encontrado.'}, status=404)
        return Response(_serialize_user(user))

    def put(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Usuario no encontrado.'}, status=404)
        if _is_root_user(user):
            return Response({'detail': 'Usuario no encontrado.'}, status=404)

        data = request.data
        if 'first_name' in data:
            user.first_name = data['first_name'].strip()
        if 'last_name' in data:
            user.last_name = data['last_name'].strip()
        user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        if 'dni' in data:
            profile.dni = data['dni'].strip()
        if 'has_expiration' in data:
            profile.expiration_date = data.get('expiration_date') if data['has_expiration'] else None
        profile.save()

        # Replace roles entirely
        if 'roles' in data:
            UserRole.objects.filter(user=user).delete()
            for r in data['roles']:
                role = r.get('role', '')
                perm = r.get('permission', 'rw')
                if role in dict(UserRole.ROLE_CHOICES):
                    UserRole.objects.create(user=user, role=role, permission=perm)

        return Response(_serialize_user(user))

    def delete(self, request, pk):
        if str(pk) == str(request.user.pk):
            return Response({'detail': 'No podés eliminar tu propia cuenta.'}, status=400)
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Usuario no encontrado.'}, status=404)
        if _is_root_user(user):
            return Response({'detail': 'Usuario no encontrado.'}, status=404)
        user.delete()
        return Response(status=204)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email    = request.data.get('email', '').strip().lower()
        dni      = request.data.get('dni', '').strip()
        roles    = request.data.get('roles', [])

        if not email or not dni:
            return Response({'detail': 'Email y DNI son requeridos.'}, status=400)
        if not roles:
            return Response({'detail': 'Ingresá al menos un rol.'}, status=400)

        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            return Response({'detail': 'No se encontró una cuenta activa con ese email.'}, status=404)

        profile = getattr(user, 'profile', None)
        if not profile or profile.dni.strip() != dni:
            return Response({'detail': 'El documento no coincide con el email ingresado.'}, status=400)

        submitted = {r.strip().lower() for r in roles if r.strip()}
        valid_keys = set(dict(UserRole.ROLE_CHOICES).keys())
        if not submitted.issubset(valid_keys):
            return Response({'detail': 'Uno o más roles son inválidos.'}, status=400)

        if user.is_superuser:
            pass  # superuser acepta cualquier rol válido
        else:
            user_roles = set(UserRole.objects.filter(user=user).values_list('role', flat=True))
            if not submitted.intersection(user_roles):
                return Response({'detail': 'Los roles ingresados no coinciden con los de la cuenta.'}, status=400)

        token = uuid.uuid4()
        profile.reset_token = token
        profile.reset_token_created_at = timezone.now()
        profile.save()

        try:
            send_reset_email(user, token, settings.FRONTEND_URL)
        except Exception as e:
            return Response({'detail': f'Error al enviar email: {str(e)}'}, status=500)

        return Response({'message': f'Email de recuperación enviado a {email}'})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = request.data.get('token', '').strip()
        password  = request.data.get('password', '')

        if not token_str or not password:
            return Response({'detail': 'Token y contraseña son requeridos.'}, status=400)

        try:
            token_uuid = uuid.UUID(token_str)
        except ValueError:
            return Response({'detail': 'Token inválido.'}, status=400)

        try:
            profile = UserProfile.objects.select_related('user').get(reset_token=token_uuid)
        except UserProfile.DoesNotExist:
            return Response({'detail': 'El enlace es inválido o ya fue utilizado.'}, status=400)

        if not profile.user.is_active:
            return Response({'detail': 'Esta cuenta no está activa.'}, status=400)

        if profile.reset_token_created_at:
            age = timezone.now() - profile.reset_token_created_at
            if age > timedelta(hours=72):
                return Response({'detail': 'El enlace expiró (72 horas). Solicitá uno nuevo.'}, status=400)

        profile.user.set_password(password)
        profile.user.save()
        profile.reset_token = None
        profile.reset_token_created_at = None
        profile.save()

        return Response({'message': 'Contraseña actualizada correctamente'})


class ActivationLinkView(APIView):
    """Devuelve (o genera) el link de activación para un usuario inactivo. Solo SuperUser."""
    permission_classes = [IsSuperUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Usuario no encontrado.'}, status=404)

        if user.is_active:
            return Response({'detail': 'Esta cuenta ya está activa.'}, status=400)

        token = uuid.uuid4()
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.activation_token = token
        profile.activation_token_created_at = timezone.now()
        profile.save()

        link = f"{settings.FRONTEND_URL.rstrip('/')}/?activate={token}"
        return Response({'link': link, 'expires_in': '72 horas'})


class ResendActivationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'detail': 'El email es requerido.'}, status=400)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'No existe una cuenta registrada con ese email.'}, status=404)

        if user.is_active:
            return Response({'detail': 'Esta cuenta ya está activa. El usuario puede iniciar sesión normalmente.'}, status=400)

        token = uuid.uuid4()
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.activation_token = token
        profile.activation_token_created_at = timezone.now()
        profile.save()

        try:
            send_activation_email(user, token, settings.FRONTEND_URL)
        except Exception as e:
            return Response({'detail': f'Error al enviar el email: {str(e)}'}, status=500)

        return Response({'message': f'Link de activación enviado a {email}'})


class ActivateAccountView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = request.data.get('token', '').strip()
        password  = request.data.get('password', '')

        if not token_str or not password:
            return Response({'detail': 'Token y contraseña son requeridos.'}, status=400)

        try:
            token_uuid = uuid.UUID(token_str)
        except ValueError:
            return Response({'detail': 'Token inválido.'}, status=400)

        try:
            profile = UserProfile.objects.select_related('user').get(activation_token=token_uuid)
        except UserProfile.DoesNotExist:
            return Response({'detail': 'Token inválido o ya utilizado.'}, status=400)

        if profile.user.is_active:
            return Response({'detail': 'Esta cuenta ya fue activada.'}, status=400)

        # Check 72h expiry
        if profile.activation_token_created_at:
            age = timezone.now() - profile.activation_token_created_at
            if age > timedelta(hours=72):
                return Response({'detail': 'El enlace de activación expiró (72 horas). Contactá al administrador.'}, status=400)

        user = profile.user
        user.set_password(password)
        user.is_active = True
        user.save()

        profile.activation_token = None
        profile.activation_token_created_at = None
        profile.save()

        return Response({'detail': 'Cuenta activada correctamente. Ya podés iniciar sesión.'})


# ─── Root: rotación de credenciales y gestión de admins de sistema ────────────

from django.contrib.auth.hashers import make_password
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError


def _root_from_partial(token_str):
    """Devuelve (user, profile) si el partial token de cred-change es válido."""
    try:
        token = AccessToken(token_str)
        if not token.get('cred_change_pending'):
            raise TokenError('Not a cred-change token')
        user = User.objects.select_related('profile').get(id=token['user_id'])
    except (TokenError, User.DoesNotExist):
        return None, None
    profile = getattr(user, 'profile', None)
    if not profile or not profile.is_root:
        return None, None
    return user, profile


class RootCredChangeView(APIView):
    """El root envía su nuevo email + contraseña. Quedan pendientes hasta que
    confirme desde el link enviado al nuevo buzón (válido 1 hora)."""
    permission_classes = [AllowAny]

    def post(self, request):
        user, profile = _root_from_partial(request.data.get('partial_token', ''))
        if not user:
            return Response({'detail': 'Token inválido o expirado. Volvé a iniciar sesión.'}, status=401)

        new_email = request.data.get('email', '').strip().lower()
        new_password = request.data.get('password', '')

        if not new_email or not new_password:
            return Response({'detail': 'Email y contraseña son requeridos.'}, status=400)
        try:
            validate_email(new_email)
        except DjangoValidationError:
            return Response({'detail': 'El email no es válido.'}, status=400)
        if len(new_password) < 8:
            return Response({'detail': 'La contraseña debe tener al menos 8 caracteres.'}, status=400)
        if new_email == 'root@admin.com.ar':
            return Response({'detail': 'Elegí un email distinto al de fábrica.'}, status=400)
        if User.objects.filter(email=new_email).exclude(pk=user.pk).exists() or \
           User.objects.filter(username=new_email).exclude(pk=user.pk).exists():
            return Response({'detail': 'Ya existe un usuario con ese email.'}, status=400)

        token = uuid.uuid4()
        profile.pending_email = new_email
        profile.pending_password = make_password(new_password)
        profile.cred_change_token = token
        profile.cred_change_token_created_at = timezone.now()
        profile.save()

        try:
            send_cred_change_email(new_email, token, settings.FRONTEND_URL)
        except Exception as e:
            return Response({'detail': f'Error al enviar el email de confirmación: {e}'}, status=500)

        return Response({'message': f'Enviamos un email de confirmación a {new_email}. '
                                    f'El cambio se aplicará al confirmar (link válido 1 hora).'})


class RootCredConfirmView(APIView):
    """Confirma la rotación: aplica email + contraseña pendientes y exige 2FA."""
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = request.data.get('token', '').strip()
        if not token_str:
            return Response({'detail': 'Token requerido.'}, status=400)
        try:
            token_uuid = uuid.UUID(token_str)
        except ValueError:
            return Response({'detail': 'Token inválido.'}, status=400)

        try:
            profile = UserProfile.objects.select_related('user').get(
                cred_change_token=token_uuid, is_root=True)
        except UserProfile.DoesNotExist:
            return Response({'detail': 'El enlace es inválido o ya fue utilizado.'}, status=400)

        if profile.cred_change_token_created_at and \
           timezone.now() - profile.cred_change_token_created_at > ROOT_LINK_TTL:
            return Response({'detail': 'El enlace expiró (1 hora). Iniciá sesión de nuevo para reintentar.'}, status=400)

        if not profile.pending_email or not profile.pending_password:
            return Response({'detail': 'No hay un cambio de credenciales pendiente.'}, status=400)

        u = profile.user
        u.username = profile.pending_email
        u.email = profile.pending_email
        u.password = profile.pending_password  # ya viene hasheada
        u.save()

        profile.pending_email = ''
        profile.pending_password = ''
        profile.cred_change_token = None
        profile.cred_change_token_created_at = None
        profile.must_change_credentials = False
        profile.must_enable_2fa = True   # ahora el root debe activar 2FA
        profile.save()

        return Response({'message': 'Credenciales actualizadas. Iniciá sesión con tu nuevo email '
                                    'y contraseña; se te pedirá activar 2FA.'})


def _serialize_admin(user):
    profile = getattr(user, 'profile', None)
    return {
        'id': user.id,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'is_active': user.is_active,
        'totp_enabled': profile.totp_enabled if profile else False,
        'dni': profile.dni if profile else '',
    }


class RootAdminListView(APIView):
    """Lista los admins de sistema (superusers), excluyendo al root."""
    permission_classes = [IsRoot]

    def get(self, request):
        admins = (User.objects
                  .filter(is_superuser=True)
                  .exclude(profile__is_root=True)
                  .select_related('profile')
                  .order_by('last_name', 'first_name'))
        pendings = [{
            'id': f'p{p.id}',
            'pending': True,
            'first_name': p.first_name,
            'last_name': p.last_name,
            'email': p.email,
            'dni': p.dni,
        } for p in PendingSystemAdmin.objects.order_by('-confirm_token_created_at')]
        return Response({
            'admins': [_serialize_admin(u) for u in admins],
            'pending': pendings,
        })


class RootAdminCreateView(APIView):
    """Inicia el alta de un admin de sistema. Requiere confirmación por email
    enviada a la casilla del root (link válido 1 hora). No crea el usuario aún."""
    permission_classes = [IsRoot]

    def post(self, request):
        data = request.data
        first_name = data.get('first_name', '').strip()
        last_name  = data.get('last_name', '').strip()
        dni        = data.get('dni', '').strip()
        email      = data.get('email', '').strip().lower()

        if not email:
            return Response({'detail': 'El email es requerido.'}, status=400)
        try:
            validate_email(email)
        except DjangoValidationError:
            return Response({'detail': 'El email no es válido.'}, status=400)
        if User.objects.filter(email=email).exists() or User.objects.filter(username=email).exists():
            return Response({'detail': 'Ya existe un usuario con ese email.'}, status=400)
        if PendingSystemAdmin.objects.filter(email=email).exists():
            return Response({'detail': 'Ya hay un alta pendiente con ese email.'}, status=400)

        pending = PendingSystemAdmin.objects.create(
            first_name=first_name, last_name=last_name, dni=dni, email=email,
            requested_by=request.user,
        )

        try:
            send_admin_creation_confirm_email(
                request.user.email, pending, pending.confirm_token, settings.FRONTEND_URL)
        except Exception as e:
            pending.delete()
            return Response({'detail': f'Error al enviar el email de confirmación: {e}'}, status=500)

        return Response({'message': f'Enviamos un email de confirmación a {request.user.email}. '
                                    f'El admin se creará al confirmar (link válido 1 hora).'}, status=201)


class RootAdminConfirmView(APIView):
    """Confirma (desde el link en la casilla del root) y crea el admin real."""
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = request.data.get('token', '').strip()
        if not token_str:
            return Response({'detail': 'Token requerido.'}, status=400)
        try:
            token_uuid = uuid.UUID(token_str)
        except ValueError:
            return Response({'detail': 'Token inválido.'}, status=400)

        try:
            pending = PendingSystemAdmin.objects.get(confirm_token=token_uuid)
        except PendingSystemAdmin.DoesNotExist:
            return Response({'detail': 'El enlace es inválido o ya fue utilizado.'}, status=400)

        if timezone.now() - pending.confirm_token_created_at > ROOT_LINK_TTL:
            pending.delete()
            return Response({'detail': 'El enlace expiró (1 hora). Iniciá el alta nuevamente.'}, status=400)

        if User.objects.filter(email=pending.email).exists() or \
           User.objects.filter(username=pending.email).exists():
            pending.delete()
            return Response({'detail': 'Ya existe un usuario con ese email.'}, status=400)

        user = User.objects.create(
            username=pending.email,
            email=pending.email,
            first_name=pending.first_name,
            last_name=pending.last_name,
            is_active=False,
            is_superuser=True,
            is_staff=True,
        )
        user.set_unusable_password()
        user.save()

        token = uuid.uuid4()
        UserProfile.objects.create(
            user=user,
            dni=pending.dni,
            activation_token=token,
            activation_token_created_at=timezone.now(),
            must_enable_2fa=True,   # 2FA obligatorio en el primer ingreso
        )

        try:
            send_activation_email(user, token, settings.FRONTEND_URL)
        except Exception as e:
            user.delete()
            return Response({'detail': f'Admin confirmado pero falló el envío de activación: {e}'}, status=500)

        pending.delete()
        return Response({'message': f'Admin de sistema creado. Se envió el email de activación a {user.email}.'})


class RootAdminDetailView(APIView):
    permission_classes = [IsRoot]

    def _get(self, pk):
        return (User.objects
                .filter(pk=pk, is_superuser=True)
                .exclude(profile__is_root=True)
                .select_related('profile')
                .first())

    def put(self, request, pk):
        user = self._get(pk)
        if not user:
            return Response({'detail': 'Admin no encontrado.'}, status=404)
        data = request.data
        if 'first_name' in data:
            user.first_name = data['first_name'].strip()
        if 'last_name' in data:
            user.last_name = data['last_name'].strip()
        user.save()
        profile, _ = UserProfile.objects.get_or_create(user=user)
        if 'dni' in data:
            profile.dni = data['dni'].strip()
            profile.save()
        return Response(_serialize_admin(user))

    def delete(self, request, pk):
        user = self._get(pk)
        if not user:
            return Response({'detail': 'Admin no encontrado.'}, status=404)
        user.delete()
        return Response(status=204)


class RootCancelPendingAdminView(APIView):
    permission_classes = [IsRoot]

    def delete(self, request, pk):
        PendingSystemAdmin.objects.filter(pk=pk).delete()
        return Response(status=204)
