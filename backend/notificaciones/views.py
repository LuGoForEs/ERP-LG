import json
import time

from django.contrib.auth.models import User
from django.http import StreamingHttpResponse, HttpResponseForbidden
from django.views import View
from rest_framework_simplejwt.tokens import AccessToken

from .events import CHANNEL, allowed_nodes, get_redis
from .models import Notification

HEARTBEAT_TIMEOUT = 20      # s sin eventos → manda comentario keep-alive
MAX_CONNECTION_AGE = 600    # s → recicla la conexión para que el token se refresque
REPLAY_LIMIT = 50


def _sse(payload):
    return (
        f"id: {payload['id']}\n"
        f"event: node-change\n"
        f"data: {json.dumps(payload)}\n\n"
    )


class SSEStreamView(View):
    """Server-Sent Events: push de cambios cross-nodo. Sin polling.

    El worker que procesa una escritura publica en Redis y sigue; esta vista
    sólo se despierta cuando hay un evento real o cada 20s para el heartbeat.
    """

    def get(self, request):
        token = request.GET.get('token', '')
        try:
            access = AccessToken(token)
            user = User.objects.get(id=access['user_id'])
        except Exception:
            return HttpResponseForbidden('Token inválido')

        nodes = allowed_nodes(user)
        last_id = request.headers.get('Last-Event-ID') or request.GET.get('last_id')

        def stream():
            yield 'retry: 5000\n\n'

            # Replay de eventos perdidos mientras el cliente estuvo desconectado
            if last_id:
                try:
                    missed = (Notification.objects
                              .filter(id__gt=int(last_id), target_node__in=nodes)
                              .order_by('id')[:REPLAY_LIMIT])
                    for n in missed:
                        yield _sse(n.as_payload())
                except (ValueError, TypeError):
                    pass

            pubsub = get_redis().pubsub(ignore_subscribe_messages=True)
            pubsub.subscribe(CHANNEL)
            started = time.time()
            try:
                while True:
                    msg = pubsub.get_message(timeout=HEARTBEAT_TIMEOUT)
                    if msg and msg.get('type') == 'message':
                        data = json.loads(msg['data'])
                        if data.get('target') in nodes:
                            yield _sse(data)
                    else:
                        yield ': keep-alive\n\n'
                    if time.time() - started > MAX_CONNECTION_AGE:
                        break
            finally:
                try:
                    pubsub.close()
                except Exception:
                    pass

        response = StreamingHttpResponse(stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response
