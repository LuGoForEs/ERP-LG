"""Throttles para endpoints de autenticación.

Defensa en profundidad ante brute force: no dependemos solo de Cloudflare —
si el WAF falla "abierto" o se desactiva, estos throttles siguen activos.
"""
from __future__ import annotations

from rest_framework.throttling import ScopedRateThrottle


class LoginRateThrottle(ScopedRateThrottle):
    """Throttle del login que combina email + IP real del cliente.

    El bucket se forma con `(scope, email, ip)`, donde `ip` es la IP real
    resuelta por `CloudflareIPMiddleware` (no la del proxy). Eso permite que:

    - Un atacante con muchas IPs (botnet) no burle el throttle por email.
    - Múltiples usuarios detrás de un mismo NAT no se afecten entre sí.
    """
    scope = 'login'

    def get_cache_key(self, request, view):
        email = (request.data.get('email') or '').strip().lower() if hasattr(request, 'data') else ''
        ip = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': f'{email}|{ip}',
        }
