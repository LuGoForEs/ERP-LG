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

from .models import UserProfile, UserRole
from .emails import send_activation_email

ALL_PANELS = ['comercial', 'administracion', 'desarrollo', 'compras', 'panol', 'produccion', 'logistica']


# ─── Permissions ──────────────────────────────────────────────────────────────

class IsSuperUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


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
    data = {
        'access': str(refresh.access_token),
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': f'{user.first_name} {user.last_name}'.strip() or user.username,
            'is_superuser': user.is_superuser,
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
        profile.save()
        return Response({'detail': '2FA activado correctamente.'})


class TwoFADisableView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get('code', '').replace(' ', '')
        profile, _ = UserProfile.objects.get_or_create(user=request.user)

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
        'dni': profile.dni if profile else '',
        'expiration_date': profile.expiration_date.isoformat() if profile and profile.expiration_date else None,
        'roles': roles,
    }


class UserListView(APIView):
    permission_classes = [IsSuperUser]

    def get(self, request):
        users = User.objects.prefetch_related('roles', 'profile').order_by('last_name', 'first_name')
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
        return Response(_serialize_user(user))

    def put(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
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
        user.delete()
        return Response(status=204)


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
