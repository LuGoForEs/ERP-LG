"""Middleware de adaptación a Cloudflare.

Resuelve la IP real del cliente desde `CF-Connecting-IP` (o `X-Forwarded-For`
como fallback) cuando el request entra por un proxy de confianza (red privada).
Sin esto, throttling, logging y auditoría ven la IP del proxy en lugar del
usuario final.
"""
from __future__ import annotations

import ipaddress

# Subnets que consideramos "proxy de confianza" (red interna Docker / loopback
# / RFC1918). Solo si el request entra desde acá confiamos en headers de IP.
_TRUSTED_PROXY_NETS = [
    ipaddress.ip_network('10.0.0.0/8'),
    ipaddress.ip_network('172.16.0.0/12'),
    ipaddress.ip_network('192.168.0.0/16'),
    ipaddress.ip_network('127.0.0.0/8'),
    ipaddress.ip_network('::1/128'),
    ipaddress.ip_network('fd00::/8'),
]


def _is_trusted_proxy(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
    except (ValueError, TypeError):
        return False
    return any(ip in net for net in _TRUSTED_PROXY_NETS)


def _first_ip(value: str) -> str:
    return value.split(',')[0].strip() if value else ''


class CloudflareIPMiddleware:
    """Reescribe REMOTE_ADDR con la IP real del cliente cuando viene a través
    de Cloudflare + proxy interno. La IP original del peer queda en
    `HTTP_X_REMOTE_ADDR_ORIG` por si se necesita para debugging."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        peer_ip = request.META.get('REMOTE_ADDR', '')
        if _is_trusted_proxy(peer_ip):
            real_ip = (
                _first_ip(request.META.get('HTTP_CF_CONNECTING_IP', ''))
                or _first_ip(request.META.get('HTTP_X_FORWARDED_FOR', ''))
            )
            if real_ip:
                request.META['HTTP_X_REMOTE_ADDR_ORIG'] = peer_ip
                request.META['REMOTE_ADDR'] = real_ip
        return self.get_response(request)
