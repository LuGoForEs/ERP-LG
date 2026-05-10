import io
import base64
import requests
import pyotp
import qrcode

from datetime import timedelta
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import UserProfile


def _verify_recaptcha(token):
    secret = getattr(settings, 'RECAPTCHA_SECRET_KEY', '')
    if not secret:
        return True  # Skip if not configured (dev)
    try:
        r = requests.post(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            data={'secret': secret, 'response': token},
            timeout=5,
        )
        return r.json().get('success', False)
    except Exception:
        return False


def _issue_tokens(user, response_data=None):
    refresh = RefreshToken.for_user(user)
    data = {
        'access': str(refresh.access_token),
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': f'{user.first_name} {user.last_name}'.strip() or user.username,
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


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email    = request.data.get('email', '').strip()
        password = request.data.get('password', '')
        turnstile = request.data.get('turnstile_token', '')

        if not _verify_recaptcha(turnstile):
            return Response({'detail': 'Verificación de seguridad fallida. Intentá de nuevo.'}, status=400)

        # Django auth uses username; try matching by email
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

        new_refresh = RefreshToken.for_user(user)
        response = Response({'access': str(new_refresh.access_token)})
        response.set_cookie(
            'refresh_token', str(new_refresh),
            httponly=True, samesite='Lax',
            secure=not getattr(settings, 'DEBUG', False),
            max_age=7 * 24 * 3600,
            path='/api/v1/auth/refresh/',
        )
        return response


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
        })


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
