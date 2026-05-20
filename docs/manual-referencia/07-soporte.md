# ERP-LG — Manual de Referencia Técnica
## Capítulo 7: Módulo Soporte de Sistemas

---

## 7.1 Resumen

El módulo **Soporte de sistemas** agrega tres capacidades cruzadas al ERP:

1. **Rol `soporte`** — un perfil de usuario con acceso de lectura sobre todos los paneles operativos y escritura sobre el módulo de soporte.
2. **Auditoría completa del ciclo de vida de las OF** — historial inmutable de todos los cambios de estado y datos en los modelos que tocan una Orden de Fabricación, atribuibles a usuario y momento.
3. **Sistema de tickets nativo** — bandeja de soporte interna con creación, comentarios, adjuntos, prioridades, estados, y cierre irreversible.

El módulo está implementado como una app Django (`soporte`) y un panel React (`SoportePanel`).

---

## 7.2 Rol y Permisos

### 7.2.1 Definición del rol

Se añade el valor `('soporte', 'Soporte de sistemas')` a `UserRole.ROLE_CHOICES` (`backend/auth_erp/models.py`). El rol coexiste con los demás (un usuario puede tener `comercial` + `soporte`, por ejemplo).

### 7.2.2 Matriz de permisos

| Operación | Usuario regular | Rol `soporte` | `is_superuser` |
|---|---|---|---|
| Ver paneles operativos | Solo los asignados | Todos (read-only) | Todos (rw) |
| Crear OF / mover estados | Según rol operativo | **No** (override read-only) | Sí |
| Panel `soporte` (UI) | No accesible | rw | rw |
| `GET /api/v1/soporte/of/` (lista OF) | 403 | 200 | 200 |
| `GET /api/v1/soporte/of/<id>/trazabilidad/` | 403 | 200 | 200 |
| `POST /api/v1/soporte/tickets/` (abrir) | 201 | 201 | 201 |
| `GET /api/v1/soporte/tickets/` | Solo los propios | Todos | Todos |
| `PATCH /api/v1/soporte/tickets/<id>/` | 403 | 200 (si abierto) | 200 (si abierto) |
| Subir adjunto a ticket propio | Sí | Sí (en cualquier ticket) | Sí |
| Subir adjunto a ticket ajeno | 403 | Sí | Sí |
| Comentar ticket propio | Sí | Sí | Sí |

### 7.2.3 Expansión de permisos en el payload de login

Cuando un usuario con rol `soporte` se autentica, `auth_erp.views._build_roles_payload(user)` devuelve:

- Todos los paneles operativos (`comercial`, `administracion`, ..., `logistica`) con permission `'r'` (read-only).
- El panel `soporte` con permission `'rw'`.
- Si el usuario tiene además otro rol operativo con `'rw'`, ese permiso **prevalece** (un comercial+soporte conserva su escritura en comercial).

Para superusuarios el payload incluye `usuarios` y `soporte` además de todos los operativos en `rw`.

### 7.2.4 Helpers backend

`backend/auth_erp/views.py` expone:

```python
user_has_soporte_role(user)         # True si tiene UserRole(role='soporte')
can_access_soporte_features(user)   # True si is_superuser o has_soporte_role
IsSoporteOrSuperuser                # DRF BasePermission
```

Los endpoints de trazabilidad usan `permission_classes = [IsAuthenticated, IsSoporteOrSuperuser]`. Los endpoints de tickets usan `IsAuthenticated` y aplican `can_access_soporte_features()` inline para diferenciar acciones (listar todos vs. propios, etc.).

---

## 7.3 Auditoría de OF (django-simple-history)

### 7.3.1 Librería y configuración

Se usa **django-simple-history >= 3.5**. Configurado en `settings.py`:

```python
INSTALLED_APPS = [
    ...
    'simple_history',
    ...
]

MIDDLEWARE = [
    ...
    'simple_history.middleware.HistoryRequestMiddleware',
]
```

El middleware captura automáticamente el `request.user` y lo persiste como `history_user` en cada cambio.

### 7.3.2 Modelos auditados

Nueve modelos en cinco apps reciben `history = HistoricalRecords()`:

| App | Modelo | Tabla histórica |
|---|---|---|
| `comercial` | `OrdenFabricacion` | `historical_orden_fabricacion` |
| `comercial` | `Anticipo` | `historical_anticipo` |
| `desarrollo` | `PedidoMaterial` | `historical_pedido_material` |
| `desarrollo` | `OrdenCompra` | `historical_orden_compra` |
| `desarrollo` | `Plano` | `historical_plano` |
| `panol` | `Ingreso` | `historical_ingreso` |
| `panol` | `Movimiento` | `historical_movimiento` |
| `produccion` | `Lote` (excluye M2M `planos`, `movimientos`) | `historical_lote` |
| `logistica` | `Despacho` | `historical_despacho` |

Cada tabla histórica almacena un snapshot completo del registro por cada cambio (create/update/delete), con `history_id`, `history_date`, `history_type` (`+`/`~`/`-`), `history_change_reason`, y `history_user_id`.

### 7.3.3 Backfill de registros pre-existentes

El comando `python manage.py backfill_of_history` (en `backend/soporte/management/commands/`) siembra un registro `+` (creación) en cada tabla histórica por cada registro que existe en su tabla principal **al momento de instalar**. Usa el `created_at` original del modelo como `history_date`, no la fecha actual.

- **Idempotente**: si un registro ya tiene historial, se saltea (`skipped`).
- **Flag `--dry-run`**: reporta el conteo sin escribir.
- En la ejecución inicial sembró 188 registros (31 OF + 31 anticipos + 30 PMs + 27 planos + 21 ingresos + 18 movimientos + 15 lotes + 15 despachos).

**Limitación**: los cambios intermedios entre la fecha de creación y el momento de instalación se pierden — no existen en ningún log previo. La timeline de una OF anterior al deploy muestra `[creación]` y luego solo los eventos posteriores a la instalación.

### 7.3.4 Endpoint de trazabilidad

`GET /api/v1/soporte/of/<id>/trazabilidad/` (permisos: soporte/superuser).

Devuelve una **timeline unificada** de todos los registros históricos asociados a una OF (la propia OF + sus anticipos + sus pedidos de material + sus órdenes de compra + sus planos + sus movimientos + sus ingresos asociados + sus lotes + sus despachos), ordenada cronológicamente ascendente.

```json
{
  "of": { "id": 113, "cliente": "...", "estado": "...", "created_at": "..." },
  "count": 7,
  "timeline": [
    {
      "ts": "2026-05-11T11:41:25",
      "app": "comercial",
      "modelo": "OrdenFabricacion",
      "ref_id": 113,
      "ref_label": "OF #113",
      "accion": "creado",
      "history_type": "+",
      "usuario": "Juan Pérez",
      "usuario_id": 7,
      "changes": [
        { "field": "estado", "old": "pendiente_anticipo", "new": "aprobada" }
      ],
      "snapshot": { ...todos los campos planos del registro... }
    },
    ...
  ]
}
```

El cálculo de `changes` usa `h.diff_against(prev_record)` — para el primer registro (creación) viene vacío. El `snapshot` incluye todos los campos planos del modelo en el momento de la versión.

### 7.3.5 Endpoint de listado de OF (buscador)

`GET /api/v1/soporte/of/?q=<query>` (permisos: soporte/superuser).

Devuelve hasta 200 OF filtradas por `cliente` (icontains). Usado por el buscador del panel Soporte.

---

## 7.4 Sistema de Tickets

### 7.4.1 Modelos

**`Ticket`** (`backend/soporte/models.py`, tabla `soporte_tickets`):

| Campo | Tipo | Notas |
|---|---|---|
| `id` | BigAutoField | Mostrado como "Ticket #N" |
| `created_by` | FK User (SET_NULL) | Quien abrió el ticket |
| `assignee` | FK User nullable | Asignatario de soporte (opcional) |
| `subject` | CharField(200) | Asunto |
| `body` | TextField | Mensaje |
| `status` | choice | `abierto` / `en_proceso` / `resuelto` / `cerrado` |
| `priority` | choice | `baja` / `media` / `alta` / `urgente` |
| `snapshot_full_name` | CharField | Nombre del solicitante (snapshot al crear) |
| `snapshot_email` | EmailField | Email del solicitante |
| `snapshot_role` | CharField | Rol(es) del solicitante al momento de abrir |
| `created_at`, `updated_at` | DateTime | |

El snapshot del solicitante es importante: si el rol del usuario cambia después, el ticket mantiene el contexto de cuando fue abierto.

**`TicketComment`** (tabla `soporte_ticket_comments`):

- `ticket`, `author`, `body`, `created_at`.
- Permite hilo de conversación entre dueño y soporte.

**`TicketAttachment`** (tabla `soporte_ticket_attachments`):

- `ticket`, `file` (`FileField`, `upload_to='tickets/'`), `original_name`, `content_type`, `size`, `uploaded_by`, `created_at`.
- Almacenado en el volume `media_files` de Docker.

### 7.4.2 Endpoints

| Método | URL | Auth | Acción |
|---|---|---|---|
| `GET` | `/api/v1/soporte/tickets/` | usuario | Lista (soporte: todos / otro: propios) |
| `POST` | `/api/v1/soporte/tickets/` | usuario | Abre ticket (multipart con `files[]` opcional) |
| `GET` | `/api/v1/soporte/tickets/<id>/` | dueño o soporte | Detalle con comentarios + adjuntos |
| `PATCH` | `/api/v1/soporte/tickets/<id>/` | soporte | Cambia `status` / `priority` / `assignee_id` |
| `POST` | `/api/v1/soporte/tickets/<id>/comments/` | dueño o soporte | Agrega comentario |
| `POST` | `/api/v1/soporte/tickets/<id>/attachments/` | dueño o soporte | Sube archivo(s) (multipart `files[]`) |
| `GET` | `/api/v1/soporte/tickets/<id>/attachments/<aid>/download/` | dueño o soporte | Descarga binario |
| `DELETE` | `/api/v1/soporte/tickets/<id>/attachments/<aid>/` | uploader o soporte | Elimina adjunto |

### 7.4.3 Cierre irreversible

Una vez que un ticket pasa a `status='cerrado'`, **ningún parámetro puede modificarse** — ni siquiera por soporte o superusuario. El helper `_closed_or_none(ticket)` (en `soporte/views.py`) devuelve `403` si el ticket está cerrado, y se aplica en:

- `PATCH /tickets/<id>/` (status, priority, assignee)
- `POST /tickets/<id>/comments/`
- `POST /tickets/<id>/attachments/`
- `DELETE /tickets/<id>/attachments/<aid>/`

Las **operaciones de lectura siguen permitidas** (`GET`, descarga de adjuntos).

Justificación: el cierre marca el ticket como auditable e inalterable. Si un usuario quiere reabrir el caso debe abrir un ticket nuevo enlazando al cerrado.

### 7.4.4 Validación de adjuntos

`backend/soporte/views.py` define:

```python
ATTACHMENT_MAX_SIZE   = 10 * 1024 * 1024   # 10 MB por archivo
ATTACHMENT_MAX_COUNT  = 5                   # archivos por ticket (total)
ATTACHMENT_ALLOWED_EXT = {
    'jpg', 'jpeg', 'png', 'gif', 'webp',
    'pdf',
    'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'csv', 'txt', 'log',
    'zip',
}
```

La validación corre antes de crear cualquier registro (`POST /tickets/` con archivos también valida). Errores → `400` con mensaje específico (`"Tipo no permitido"`, `"supera el tamaño máximo"`, `"Máximo N archivos"`).

### 7.4.5 Notificaciones de tickets

- **Email a soporte al crear**: `soporte/emails.py:send_new_ticket_email()` envía a todos los usuarios con `is_superuser=True` o `UserRole(role='soporte')` con email no vacío.
- **Email al dueño cuando soporte comenta**: `send_ticket_comment_email()` envía al `created_by.email` (omite si el comentario es del propio dueño).
- **Evento realtime (Redis pubsub)**: cada creación de ticket y cada comentario disparan `notificaciones.events.emit_event()` con `target='soporte'` o `'comercial'` según corresponda.
- Si `soporte` está en `roles` de un usuario, `allowed_nodes()` retorna `ALL_NODES` (incluido `'soporte'`) — el SSE le entrega todos los eventos.

---

## 7.5 Frontend

### 7.5.1 Sidebar — Layout especial para soporte

`frontend/src/components/primitives.jsx::Sidebar` detecta si el usuario tiene el panel `soporte` en `allowedPanels`. En ese caso renderiza:

```
SOPORTE DE SISTEMAS
 ▸ Soporte                   [S]      ← fijo arriba (prominente)

▾ NODOS (8)                            ← header colapsable
 ▸ Comercial                 [C]
 ▸ Administración            [A]
 ▸ Desarrollo                [D]
 ▸ Compras                   [P]
 ▸ Pañol                     [N]
 ▸ Producción                [R]
 ▸ Logística                 [L]
 ▸ Usuarios                  [U]      ← solo si is_superuser
```

El estado abierto/cerrado de "Nodos" persiste en `localStorage` (`sidebar:nodos-open`).

Para usuarios sin acceso a soporte, el sidebar mantiene su layout flat tradicional.

### 7.5.2 Dropdown "Ayuda" — 3er ítem "Contactar a soporte"

En la sección inferior del sidebar, el botón **Ayuda** (texto rojo) despliega un menú a la derecha con:

1. **Atajos** (abre `ShortcutsDialog`)
2. **Activar/Gestionar 2FA** (abre `TwoFASetupDialog`)
3. **Contactar a soporte** (abre `ContactSoporteDialog`)

El menú se cierra con click afuera o `Escape`.

### 7.5.3 ContactSoporteDialog

Modal disponible para **todos los usuarios autenticados** (no solo soporte). Contiene:

- **Bloque "Tus datos"** (readonly): Nombre, Email, Rol, "N° ticket: se asignará al enviar".
- Input **Asunto** (max 200).
- Select **Prioridad** (Baja / Media / Alta / Urgente).
- Textarea **Mensaje**.
- Bloque **Adjuntos** (opcional, máx 5 archivos):
  - Botón "+ Agregar archivo" abre selector con `accept` filtrado.
  - Cada archivo elegido se muestra con icon + nombre + tamaño + botón "X" para quitar.
  - Validación cliente: extensión + tamaño antes de subir.
- Botón **Enviar a soporte**: envía multipart si hay archivos, JSON sino. Al éxito muestra toast con el número de ticket asignado.

### 7.5.4 SoportePanel — Tab Trazabilidad

`frontend/src/components/SoportePanel.jsx`. Layout dos columnas:

- **Izquierda**: buscador de cliente (debounce 300ms) + lista de OF con badge de estado y `created_at`. Click selecciona.
- **Derecha**: Timeline vertical con cards. Cada card muestra:
  - Badge de app (colores por nodo) + nombre del modelo
  - Badge de acción (`creado`/`modificado`/`eliminado` — verde/cyan/rosa)
  - Referencia (ej. "OF #113", "PM #45")
  - Timestamp
  - Usuario que hizo el cambio
  - Diff campo a campo si es modificación (rojo tachado → verde nuevo)
  - Botón "+ snapshot" expande el JSON completo del registro en esa versión

### 7.5.5 SoportePanel — Tab Tickets

Bandeja de tickets con expansión inline. Cada fila muestra:

- `#numero`, asunto truncado, badges de prioridad y status, nombre del solicitante, rol, fecha, conteo de comentarios.

Al expandir:

1. **Sliders Resuelto / Cerrado** (toggles iOS):
   - **Resuelto** (emerald) — ON pasa `status` a `resuelto`; OFF vuelve a `en_proceso`.
   - **Cerrado** (rose) — ON pide **confirmación con `window.confirm`** explicando que es irreversible. OFF deshabilitado cuando ya está cerrado.
   - Si `status === 'cerrado'`, **ambos sliders quedan en modo read-only** (sin `onChange`).
2. **Banner amarillo** si está cerrado: "Ticket cerrado — solo lectura. No se admiten modificaciones."
3. **Prioridad**: select editable; `disabled` si el ticket está cerrado.
4. **Contacto**: email del solicitante (read-only).
5. **Body**: texto plano con preserve whitespace.
6. **Adjuntos** (`AttachmentsSection`):
   - Lista clickeable: click en el nombre descarga el archivo (`downloadBlob`).
   - Botón "+ Subir archivo" oculto si `readOnly`.
   - Botón tachito eliminar por adjunto, oculto si `readOnly`.
   - Validación cliente de tipo y tamaño antes de subir.
7. **Hilo de comentarios**: cards apiladas con autor, fecha, body.
8. **Responder** (textarea + botón) — **oculto completo si el ticket está cerrado**.

### 7.5.6 Toggle (nuevo primitive)

`primitives.jsx::Toggle`. Switch deslizable estilo iOS:

```jsx
<Toggle
  label="Resuelto"
  hint="Marca el ticket como solucionado"
  accent="emerald"
  checked={status === 'resuelto'}
  onChange={(next) => updateStatus(next ? 'resuelto' : 'en_proceso')}
/>
```

- Si `onChange` no se provee → **modo read-only** (visible pero no interactivo). Usado cuando el ticket está cerrado.
- `disabled` deshabilita explícitamente (con opacity).
- `accent` controla el color del estado activo (`emerald`/`rose`/`blue`/`amber`/`cyan`/`violet`).

### 7.5.7 PermissionsContext

`frontend/src/contexts/PermissionsContext.jsx` reconoce el panel `soporte` automáticamente:

- `is_superuser` → todos los paneles incluyendo `usuarios` y `soporte` en `rw`.
- Roles individuales del payload (incluido el `soporte` expandido por el backend) se procesan tal como vienen.

### 7.5.8 V2_MODULES

`frontend/src/data/mock.js` agrega:

```js
{ id: 'soporte', name: 'Soporte', shortcut: 's', accent: 'rose' }
// V2_MODULE_ICONS: soporte: 'alert'
```

El atajo `S` está disponible en `useGlobalShortcuts` para navegar al panel.

---

## 7.6 Operaciones

### 7.6.1 Asignar el rol soporte

Como superusuario, ingresá al panel **Usuarios**, editá el usuario destino y agregale el rol "Soporte de sistemas" (permission `rw` por convención, pero el backend ignora ese valor y expande siempre a `r` sobre paneles operativos + `rw` sobre el panel soporte).

### 7.6.2 Ejecutar el backfill (idempotente)

```bash
sudo docker exec erp-lg-backend-1 python manage.py backfill_of_history --dry-run   # verificar
sudo docker exec erp-lg-backend-1 python manage.py backfill_of_history             # aplicar
```

Si ya se corrió antes, los registros existentes se saltean. Seguro de re-correr.

### 7.6.3 Rebuild + migraciones (deploy)

```bash
cd /home/www_data/erp.sibotec/ERP-LG
sudo docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build backend celery-worker celery-beat
sudo docker exec erp-lg-backend-1 python manage.py migrate
sudo docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build frontend
```

### 7.6.4 Inspección directa del historial en DB

```sql
-- Cambios sobre OF #113
SELECT history_id, history_date, history_type, history_user_id, estado, cliente
FROM historical_orden_fabricacion
WHERE id = 113
ORDER BY history_date;

-- Quién cambió qué en el último mes
SELECT app_label, history_date, history_user_id, history_change_reason
FROM (
  SELECT 'comercial.OF' AS app_label, history_date, history_user_id, history_change_reason
    FROM historical_orden_fabricacion
  UNION ALL
  SELECT 'panol.movimiento', history_date, history_user_id, history_change_reason
    FROM historical_movimiento
) t
WHERE history_date >= NOW() - INTERVAL 30 DAY
ORDER BY history_date DESC;
```

---

## 7.7 Decisiones de Diseño

| Decisión | Razón |
|---|---|
| App nativa de tickets (no Zammad/django-helpdesk) | Volumen bajo, ya hay email + JWT + roles + notificaciones realtime. Sin overhead de infra externa. |
| `django-simple-history` (vs. `django-auditlog`) | Tabla histórica por modelo permite queries específicas y snapshots completos por versión. Más fácil de explicar a stakeholders no-técnicos. |
| Backfill con `created_at` original (vs. timestamp `now`) | La timeline arranca con la fecha real de creación de cada OF, aún si esos registros son anteriores a la instalación de la auditoría. Los cambios intermedios pre-deploy se pierden (no hay forma de reconstruirlos). |
| Rol soporte read-only sobre paneles operativos (vs. rw) | Reduce el riesgo de que un técnico altere datos de negocio por error mientras investiga. Si necesita escritura puntual, debe coordinar con un operativo. |
| Cierre irreversible total (sin excepción para soporte/superuser) | Pedido explícito de producto: una vez cerrado el ticket es auditable y firme. Si hay que retomar el caso, se abre un ticket nuevo. |
| Snapshot de nombre/email/rol al crear ticket | Si el usuario cambia de rol o se elimina, el ticket conserva el contexto original. |
| Sidebar especial con "Nodos" colapsable solo para soporte | El nodo Soporte es la tarea principal del rol — debe estar visualmente prominente. Los nodos operativos quedan a un click pero no compiten por atención. |
| `Toggle` primitive con read-only por omisión de `onChange` | Permite que el mismo componente renderice estado actual sin lógica condicional ad-hoc en cada uso. |
| Adjuntos: 10 MB × 5 × tipos office/img/pdf | Suficiente para reportes y capturas. Restringe ejecutables y multimedia pesada. Espacio de disco previsible. |

---

## 7.8 Migraciones

Los archivos generados por esta entrega:

```
backend/auth_erp/migrations/0006_alter_userrole_role.py
backend/comercial/migrations/0004_historicalanticipo_historicalordenfabricacion.py
backend/desarrollo/migrations/0006_historicalordencompra_historicalpedidomaterial_and_more.py
backend/panol/migrations/0002_historicalingreso_historicalmovimiento.py
backend/produccion/migrations/0005_historicallote.py
backend/logistica/migrations/0004_historicaldespacho.py
backend/soporte/migrations/0001_initial.py        (Ticket + TicketComment)
backend/soporte/migrations/0002_ticketattachment.py
```

Todas son aditivas (`CreateModel` / `AlterField` sin destructive ops). El rollback se haría con `python manage.py migrate <app> <previous>` y luego `DROP TABLE` manual de las tablas históricas si se quiere liberar espacio.
