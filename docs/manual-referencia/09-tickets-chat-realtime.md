# Tickets — Chat en tiempo real

> **Implementado:** 2026-05-20
>
> Convierte el diálogo "Contactar a soporte" en una pequeña mensajería entre
> el usuario que crea el ticket y el equipo de soporte. Los mensajes se
> actualizan al instante en ambas puntas mientras el ticket esté abierto;
> cuando soporte cierra el ticket queda en modo solo lectura.

## Componentes involucrados

| Capa | Archivo | Función |
|---|---|---|
| Backend | `backend/soporte/views.py` · `TicketCommentCreateView` | Crea cada mensaje, valida que el ticket no esté cerrado, emite evento al canal correcto |
| Backend | `backend/notificaciones/events.py` · `emit_event` | Persiste la notificación (replay) y publica en Redis pub/sub |
| Backend | `backend/notificaciones/views.py` · `SSEStreamView` | Conexión SSE long-lived con keep-alive y replay vía `Last-Event-ID` |
| Frontend | `frontend/src/contexts/NotificationsContext.jsx` · `subscribe` / `subscribeAny` | Despacha eventos del stream a los suscriptores (por nodo o globales) |
| Frontend | `frontend/src/components/ContactSoporteDialog.jsx` · `TicketChat` | UI del chat, polling de respaldo, listener SSE |
| Frontend | `frontend/src/components/SoportePanel.jsx` · `TicketsTab` | Lado del técnico — refresca toda la bandeja al recibir eventos del nodo `soporte` |

## Flujo de un mensaje

```
Usuario escribe respuesta en el chat
        │
        ▼
POST /api/v1/soporte/tickets/<id>/comments/
        │
        ▼
TicketCommentCreateView guarda el TicketComment
        │
        ▼
emit_event(source='soporte', targets=[...], event_type='ticket_comentario',
           ref_type='ticket', ref_id=ticket.id)
        │
        ├─ Notification row → tabla `notificaciones_notification` (historial + replay)
        └─ Redis PUBLISH al canal `erp:events`
                │
                ▼
        SSEStreamView ya conectados consumen el mensaje del pubsub
                │
                ▼
        EventSource del frontend dispara `node-change`
                │
                ├─ NotificationsContext: invoca `subscribe(target, cb)` y `subscribeAny(cb)`
                └─ ContactSoporteDialog/TicketChat filtra `ref_id === ticketId` → refresca
                   SoportePanel filtra por nodo 'soporte' → recarga bandeja
```

## Targets dinámicos del evento

Antes el target era hardcoded a `'comercial'`, lo que dejaba sin notificación
a usuarios de otros roles (Pañol, Producción, etc.). Ahora:

- **Si comenta soporte** → `targets = roles del creador ∩ ALL_NODES` (fallback a `['comercial']` si no tiene roles operativos).
- **Si comenta el usuario** → `targets = ['soporte']`.

Esto garantiza que el creador del ticket vea la respuesta sin importar su rol.

## Tiempo real — dos canales redundantes

`TicketChat` usa una doble estrategia para resiliencia:

1. **SSE (instantáneo)** vía `useAnyEvent` — filtra `data.ref_type === 'ticket' && String(data.ref_id) === String(ticketId)` y refresca al recibirlo.
2. **Polling cada 5 s** vía `setInterval(refresh, CHAT_POLL_MS)` — cubre los huecos cuando SSE no llega (token expirado, Cloudflare cortó el long-poll, navegador suspendido, etc.).

En la pantalla previa al chat, `TicketsList` también escucha eventos
globales con `useAnyEvent` y refresca la lista (también con polling de
20 s como fallback).

## Cierre del ticket

Cuando soporte marca el ticket como `cerrado`:

- `TicketCommentCreateView` rechaza nuevos comentarios con `403` (chequeo
  `_closed_or_none(ticket)` antes de procesar).
- El frontend detecta `ticket.status === 'cerrado'`, oculta la caja de
  envío y muestra el banner: "Soporte cerró este ticket. No se pueden
  enviar más mensajes."
- El usuario sigue pudiendo abrir el chat y leer el historial completo,
  pero queda en modo read-only.

## Configuración

Las cadencias de polling están en constantes al tope de
`ContactSoporteDialog.jsx`:

```js
const CHAT_POLL_MS = 5000;   // chat abierto
const LIST_POLL_MS = 20000;  // listado de tickets
```

Bajarlas hace el chat más reactivo cuando SSE falla pero aumenta carga
sobre el backend; subirlas reduce carga pero alarga la ventana de
mensajes "perdidos" hasta el próximo tick.
