import json
import logging

import redis
from django.conf import settings

from .models import Notification

logger = logging.getLogger(__name__)

CHANNEL = 'erp:events'

ALL_NODES = {
    'comercial', 'administracion', 'desarrollo', 'compras',
    'panol', 'produccion', 'logistica',
}

_redis_client = None


def get_redis():
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


def allowed_nodes(user):
    """Nodos que el usuario puede ver — usado para filtrar el stream SSE."""
    if user.is_superuser:
        return set(ALL_NODES)
    roles = set(user.roles.values_list('role', flat=True))
    if 'gerencia' in roles:
        return set(ALL_NODES)
    return roles & ALL_NODES


def emit_event(source, targets, event_type, message, ref_type='', ref_id=''):
    """Persiste la notificación (historial + replay) y la publica en Redis.

    La persistencia es la fuente de verdad; el publish es best-effort: si Redis
    falla, el cliente igual recupera el evento por replay vía Last-Event-ID.
    """
    if isinstance(targets, str):
        targets = [targets]
    for tgt in targets:
        notif = Notification.objects.create(
            source_node=source,
            target_node=tgt,
            event_type=event_type,
            message=message,
            ref_type=ref_type,
            ref_id=str(ref_id),
        )
        try:
            get_redis().publish(CHANNEL, json.dumps(notif.as_payload()))
        except Exception:
            logger.warning('No se pudo publicar evento en Redis', exc_info=True)
