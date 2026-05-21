"""DRF custom exception handler con observabilidad Cloudflare.

Loguea cada excepción con `cf_ray`, `cf_connecting_ip`, `endpoint` y `method`
para permitir correlación con eventos del panel de Cloudflare (Security
Events) usando el header CF-Ray.
"""
from __future__ import annotations

import logging

from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger('cloudflare_adapt')


def cloudflare_aware_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    request = context.get('request')
    if request is not None:
        meta = getattr(request, 'META', {}) or {}
        extra = {
            'cf_ray': meta.get('HTTP_CF_RAY', ''),
            'cf_connecting_ip': meta.get('HTTP_CF_CONNECTING_IP', ''),
            'remote_addr': meta.get('REMOTE_ADDR', ''),
            'remote_addr_orig': meta.get('HTTP_X_REMOTE_ADDR_ORIG', ''),
            'method': getattr(request, 'method', ''),
            'path': getattr(request, 'path', ''),
            'status': getattr(response, 'status_code', None),
            'exc_type': type(exc).__name__,
        }
        if response is None or response.status_code >= 500:
            logger.exception('Unhandled exception: %s', extra)
        else:
            logger.warning('Handled exception (status %s): %s', extra.get('status'), extra)
    return response
