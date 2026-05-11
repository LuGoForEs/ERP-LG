# ERP-LG — Manual de Referencia Técnica
## Capítulo 4: Referencia de API (RESTful)

---

## 4.1 Principios de Diseño de la API

La API de ERP-LG está expuesta a través de **Django REST Framework (DRF)**. Los endpoints se agrupan por dominio bajo el prefijo `/api/v1/`. Cada dominio expone un endpoint raíz de healthcheck (`GET /api/v1/{dominio}/`) que retorna `{"module": "...", "status": "active"}`.

### 4.1.1 Autenticación

Todos los endpoints (excepto `/auth/login/` y `/auth/refresh/`) requieren un token JWT en el header:

```
Authorization: Bearer <access_token>
```

El `access_token` se obtiene en `/auth/login/` y tiene una vida de **15 minutos**. El `refresh_token` se almacena en una cookie `httpOnly` y se usa para renovar silenciosamente el acceso token mediante `/auth/refresh/` (válido 7 días).

### 4.1.2 Códigos de Estado HTTP

| Código | Significado |
|--------|-------------|
| `200 OK` | Operación exitosa (GET, PUT) |
| `201 Created` | Recurso creado (POST) |
| `204 No Content` | Operación exitosa sin body |
| `400 Bad Request` | Error de validación o precondición de negocio no cumplida |
| `401 Unauthorized` | Token ausente, expirado o inválido |
| `403 Forbidden` | Autenticado pero sin permisos (ej. OF no aprobada) |
| `404 Not Found` | Recurso no existe |

### 4.1.3 Formato de Respuesta

```json
// Respuesta exitosa con datos
{ "data": { ... } }
{ "message": "...", "data": { ... } }

// Error estándar DRF
{ "detail": "Mensaje de error" }

// Error de validación con campos
{ "field_name": ["Error en campo"] }
{ "non_field_errors": ["Error general"] }
```

---

## 4.2 Módulo: Autenticación (`/api/v1/auth/`)

### POST `/auth/login/`

Autentica al usuario. Si tiene 2FA activado, retorna `requires_2fa: true` y no genera tokens hasta que se verifique.

```json
// Request
{ "username": "admin", "password": "secreto", "turnstile_token": "..." }

// Response 200 — sin 2FA
{
  "access": "eyJhbGci...",
  "requires_2fa": false,
  "user": { "id": 1, "username": "admin", "email": "..." }
}

// Response 200 — con 2FA activo
{ "requires_2fa": true, "temp_token": "..." }
```

### POST `/auth/2fa/verify/`

Completa el login cuando el usuario tiene 2FA activado.

```json
// Request
{ "temp_token": "...", "totp_code": "123456" }

// Response 200
{ "access": "eyJhbGci...", "user": { ... } }
```

### POST `/auth/refresh/`

Renueva el access token usando la cookie `httpOnly`. No requiere body. El frontend lo llama automáticamente cuando recibe un 401.

```json
// Response 200
{ "access": "eyJhbGci..." }
```

### POST `/auth/logout/`

Invalida la cookie de refresh del servidor.

### GET `/auth/me/`

Retorna datos del usuario autenticado.

```json
// Response 200
{
  "id": 1,
  "username": "admin",
  "email": "admin@ejemplo.com",
  "first_name": "Admin",
  "last_name": "Sistema",
  "has_2fa": false
}
```

### GET `/auth/2fa/setup/`

Genera un secreto TOTP y retorna el QR code en base64 para configurar una app autenticadora.

### POST `/auth/2fa/enable/`

Activa el 2FA tras confirmar el código TOTP.

```json
// Request
{ "totp_code": "123456" }
```

### POST `/auth/2fa/disable/`

Desactiva el 2FA.

```json
// Request
{ "totp_code": "123456" }
```

---

## 4.3 Módulo: Comercial (`/api/v1/comercial/`)

### GET `/comercial/ordenes-fabricacion`

Lista todas las OFs con su anticipo asociado.

```json
// Response 200
{
  "data": [
    {
      "id": 111,
      "cliente": "Franco SAS",
      "descripcion": "Eje tractor 45mm",
      "plazo_entrega": "30 dias",
      "monto_anticipo": 50000.00,
      "moneda_anticipo": "ARS",
      "anticipo_descripcion": "Transferencia bancaria",
      "estado": "aprobada",
      "responsable": 3,
      "responsable_nombre": "González Escobar",
      "plazo_anticipo_dias": 7,
      "created_at": "2026-05-10T14:32:00Z",
      "updated_at": "2026-05-10T15:00:00Z",
      "anticipo": {
        "id": 88,
        "of_id": 111,
        "monto_estimado": 50000.00,
        "estado": "validado",
        "pagado": true,
        "observacion": "Pago confirmado",
        "factura_archivo": { "nombre": "comprobante.pdf", "tipo": "application/pdf", "tamanio_bytes": 204800 },
        "created_at": "2026-05-10T14:32:00Z"
      }
    }
  ]
}
```

Estados posibles de `OrdenFabricacion.estado`: `pendiente_anticipo` → `aprobada` / `rechazada_anticipo`.

- `responsable`: ID del usuario Django que creó la OF (asignado automáticamente desde `request.user`).
- `responsable_nombre`: nombre completo o username del responsable (campo calculado, read-only).
- `plazo_anticipo_dias`: días desde `created_at` hasta que Celery Beat rechaza la OF si el anticipo no fue validado.

### POST `/comercial/ordenes-fabricacion`

Crea una OF y genera automáticamente el anticipo asociado en estado `pendiente`. El campo `responsable` se asigna automáticamente desde `request.user` — no se envía en el request.

```json
// Request
{
  "cliente": "Franco SAS",
  "descripcion": "Eje tractor 45mm",
  "plazo_entrega": "30 dias",
  "monto_anticipo": 50000.00,
  "moneda_anticipo": "ARS",
  "anticipo_descripcion": "Transferencia bancaria",
  "plazo_anticipo_dias": 7
}

// Response 200
{
  "message": "OF creada. Anticipo pendiente de validación por Administración",
  "data": {
    "orden": { "id": 111, "cliente": "Franco SAS", "estado": "pendiente_anticipo", ... },
    "anticipo": { "id": 88, "estado": "pendiente", ... }
  }
}
```

### GET `/comercial/ordenes-fabricacion/{id}/timeline/`

Reconstruye cronológicamente todos los eventos de una OF cruzando los 7 dominios. Útil para auditoría.

```json
// Response 200
{
  "orden": { "id": 111, "cliente": "Franco SAS", ... },
  "total_eventos": 12,
  "timeline": [
    {
      "timestamp": "2026-05-10T14:32:00Z",
      "dominio": "comercial",
      "tipo": "of.creada",
      "mensaje": "OF #111 creada para Franco SAS",
      "referencia": { "entidad": "orden_fabricacion", "id": 111 },
      "estado": "pendiente_anticipo"
    },
    {
      "timestamp": "2026-05-10T15:00:00Z",
      "dominio": "administracion",
      "tipo": "anticipo.validado",
      "mensaje": "Anticipo #88 validado",
      "referencia": { "entidad": "anticipo", "id": 88 },
      "estado": "validado"
    }
    // ... un evento por cada acción en cada dominio
  ]
}
```

---

## 4.4 Módulo: Administración (`/api/v1/administracion/`)

### GET `/administracion/stats`

Estadísticas globales del sistema.

```json
// Response 200
{
  "active_users": 5,
  "workload": 3,
  "financial_total": 150000.00,
  "system_health": "stable"
}
```

### GET `/administracion/ordenes`

Lista todas las OFs con su anticipo (vista consolidada para el área de administración).

### PUT `/administracion/anticipos/{id}/validar`

Valida o rechaza un anticipo. Admite `multipart/form-data` para adjuntar la factura de recibo.

```
// Request (multipart/form-data)
pagado=true
observacion=Pago confirmado por transferencia
factura=<archivo PDF opcional>

// Response 200
{
  "message": "Anticipo 88 validado",
  "data": {
    "anticipo": { "id": 88, "estado": "validado", "pagado": true, ... },
    "orden": { "id": 111, "estado": "aprobada", ... }
  }
}
```

Si `pagado=false`, el anticipo queda en estado `rechazado` y la OF pasa a `rechazada_anticipo`.

### PUT `/administracion/despachos/{id}/aprobar`

Autoriza o rechaza un despacho que está en estado `esperando_autorizacion`. Admite `multipart/form-data` para adjuntar el comprobante de saldo restante.

```
// Request (multipart/form-data)
aprobado=true
observacion=Documentación verificada
comprobante_saldo=<archivo PDF/imagen opcional>

// Response 200
{
  "message": "Despacho 12 autorizado",
  "data": {
    "id": 12,
    "estado": "autorizado",
    "observacion_admin": "Documentación verificada",
    "comprobante_saldo": "/media/comprobantes_saldo/comprobante.pdf",
    ...
  }
}
```

Si `aprobado=false`, el despacho queda en `rechazado`. El lote vuelve a estar disponible para un nuevo despacho (Logística puede crear uno nuevo).

---

## 4.5 Módulo: Desarrollo (`/api/v1/desarrollo/`)

### GET `/desarrollo/ordenes-disponibles`

Lista las OFs con `estado=aprobada`. El frontend de Desarrollo usa este endpoint para poblar el selector de OFs.

### GET `/desarrollo/pedidos-material`

Lista todos los pedidos de material con sus ítems y orden de compra asociada.

```json
// Response 200
{
  "data": [
    {
      "id": 40,
      "of_id": 111,
      "emisor": "Ing. Ramírez",
      "fecha": "2026-05-10",
      "plazo_entrega": "2026-05-20",
      "equipo": "Torno CNC",
      "estado": "generado",
      "created_at": "2026-05-10T16:00:00Z",
      "items": [
        {
          "id": 1,
          "cantidad": 10,
          "descripcion": "Acero SAE 1045 Ø45mm",
          "uso_en": "Eje principal",
          "observaciones": "",
          "oc_fecha": "2026-05-12"
        }
      ],
      "orden_compra": { "id": 1, "estado": "emitida" }
    }
  ]
}
```

### POST `/desarrollo/pedidos-material`

Crea un PM + OrdenCompra + ítems en una sola transacción atómica. Requiere OF en estado `aprobada`.

```json
// Request
{
  "of_id": 111,
  "emisor": "Ing. Ramírez",
  "fecha": "2026-05-10",
  "plazo_entrega": "2026-05-20",
  "equipo": "Torno CNC",
  "items": [
    {
      "cantidad": 10,
      "descripcion": "Acero SAE 1045 Ø45mm",
      "uso_en": "Eje principal",
      "observaciones": "",
      "oc_fecha": "2026-05-12"
    }
  ]
}

// Response 200
{
  "message": "Pedido generado con éxito. OC NRO: 1",
  "data": { "id": 40, "of_id": 111, "estado": "generado", ... }
}
```

**Precondición fallida (403):**
```json
{ "detail": "OF 111 no disponible. Estado: pendiente_anticipo. Anticipo: pendiente" }
```

### GET `/desarrollo/planos`

Lista todos los planos técnicos registrados.

### POST `/desarrollo/planos`

Sube un plano en PDF. Requiere `multipart/form-data`. Solo acepta `application/pdf`.

```
// Request (multipart/form-data)
of_id=111
descripcion=Plano de conjunto
archivo=<archivo PDF>

// Response 200
{
  "message": "Plano enviado a Producción",
  "data": {
    "id": 5,
    "of_id": 111,
    "descripcion": "Plano de conjunto",
    "archivo": { "nombre": "plano.pdf", "tipo": "application/pdf", "tamanio_bytes": 204800 },
    "estado": "enviado"
  }
}
```

### GET `/desarrollo/planos/{id}/archivo`

Descarga el archivo PDF del plano. Retorna el binario con `Content-Type: application/pdf`. Requiere autenticación JWT en el header (no usar `window.open()` directamente — usar `fetch()` + blob URL).

---

## 4.6 Módulo: Compras (`/api/v1/compras/`)

### GET `/compras/pedidos-material`

Lista los PMs con estado `generado` (pendientes de facturación).

### GET `/compras/proveedores`

Lista todos los proveedores del catálogo.

### POST `/compras/proveedores`

```json
// Request
{ "nombre": "Aceros del Sur SA", "cuit": "30-12345678-9", "contacto": "ventas@acerosdelsur.com" }
```

### GET `/compras/insumos?q={búsqueda}`

Lista insumos del catálogo. El parámetro `q` filtra por nombre.

### POST `/compras/insumos`

```json
// Request
{ "nombre": "Acero SAE 1045", "unidad": "kg", "descripcion": "Barra redonda" }
```

### GET `/compras/insumos/template`

Descarga un archivo Excel/CSV de plantilla para carga masiva de insumos.

### POST `/compras/insumos/bulk`

Carga masiva de insumos desde el template descargado. Requiere `multipart/form-data`.

### GET `/compras/facturas`

Lista todas las facturas de compra.

```json
// Response 200
{
  "data": [
    {
      "id": 7,
      "pedido_material_id": 40,
      "proveedor": "Aceros del Sur SA",
      "monto_total": 85000.00,
      "estado": "ingresada",
      "tiene_pdf": true,
      "created_at": "2026-05-11T09:00:00Z",
      "materiales": [
        {
          "insumo": "Acero SAE 1045 Ø45mm",
          "cantidad": 10,
          "precio_unitario": 8500.00,
          "unidad_medida": "kg",
          "proveedor": "Aceros del Sur SA"
        }
      ]
    }
  ]
}
```

Estados posibles de `FacturaCompra.estado`: `registrada` → `ingresada`.

### POST `/compras/facturas`

Registra una factura de compra. Requiere `multipart/form-data`. Actualiza el estado del PM a `facturado`.

```
// Request (multipart/form-data)
pedido_material_id=40
monto_total=85000
materiales=[{"insumo_id": 3, "cantidad": 10, "precio_unitario": 8500, "unidad_medida": "kg", "proveedor_id": 2}]
pdf=<archivo PDF opcional>
```

### GET `/compras/facturas/{id}/pdf`

Descarga el PDF de la factura. Requiere autenticación JWT en el header (usar `fetch()` + blob URL).

---

## 4.7 Módulo: Pañol (`/api/v1/panol/`)

### GET `/panol/stock`

Retorna el stock actual como diccionario `{nombre_insumo: cantidad}`.

```json
// Response 200
{
  "data": {
    "Acero SAE 1045 Ø45mm": 10.0,
    "Tornillo M8x30": 500.0
  }
}
```

### GET `/panol/ingresos`

Lista los ingresos de material al pañol, ordenados del más reciente al más antiguo.

```json
// Response 200
{
  "data": [
    {
      "id": 3,
      "factura_id": 7,
      "materiales": [
        { "nombre": "Acero SAE 1045 Ø45mm", "cantidad": 10, "precio_unitario": 8500.0 }
      ],
      "estado": "ingresado",
      "verificacion_estado": "conforme",
      "verificacion_notas": "",
      "created_at": "2026-05-11T10:30:00Z",
      "tiene_pdf": true
    }
  ]
}
```

`verificacion_estado` puede ser `conforme` o `no_conforme`. Si es `no_conforme`, el stock no se modifica y se genera una nueva FacturaCompra de reposición.

### POST `/panol/ingresos`

Registra la entrada de materiales al stock. Cambia `FacturaCompra.estado` a `ingresada` y actualiza `Stock`.

```json
// Request
{
  "factura_id": 7,
  "verificacion_estado": "conforme",
  "verificacion_notas": "Materiales en buen estado",
  "faltantes": []
}

// Response 200
{
  "message": "Materiales ingresados al stock",
  "data": {
    "ingreso": { "id": 3, "factura_id": 7, "estado": "ingresado", ... },
    "nueva_oc_id": null,
    "stock_actualizado": { "Acero SAE 1045 Ø45mm": 10.0 }
  }
}
```

Si `verificacion_estado = "no_conforme"`, se puede incluir la lista `faltantes` para generar automáticamente una OC de reposición:

```json
{
  "factura_id": 7,
  "verificacion_estado": "no_conforme",
  "verificacion_notas": "Faltaron 3 unidades",
  "faltantes": [
    { "nombre": "Acero SAE 1045 Ø45mm", "cantidad": 3, "unidad_medida": "kg", "proveedor": "Aceros del Sur SA" }
  ]
}
```

### GET `/panol/movimientos`

Lista los despachos a producción, ordenados del más reciente al más antiguo.

```json
// Response 200
{
  "data": [
    {
      "id": 2,
      "of_id": 111,
      "estado": "despachado",
      "created_at": "2026-05-12T08:00:00Z",
      "materiales": [
        { "nombre": "Acero SAE 1045 Ø45mm", "cantidad": 10 }
      ]
    }
  ]
}
```

### POST `/panol/movimientos/produccion`

Despacha materiales a Producción para una OF. Descuenta del stock. Falla si el stock es insuficiente.

```json
// Request
{
  "of_id": 111,
  "materiales": [
    { "nombre": "Acero SAE 1045 Ø45mm", "cantidad": 10 }
  ]
}

// Response 200
{
  "message": "Material despachado a Producción",
  "data": {
    "movimiento": { "id": 2, "of_id": 111, "estado": "despachado", "materiales": [...] },
    "stock_actualizado": { "Acero SAE 1045 Ø45mm": 0.0 }
  }
}

// Error 400 — stock insuficiente
{
  "message": "Stock insuficiente",
  "faltantes": [{ "material": "Acero SAE 1045 Ø45mm", "solicitado": 10, "disponible": 5 }]
}
```

### GET `/panol/materiales-of/{of_id}`

Retorna los materiales comprados para una OF (desde FacturaCompras `ingresadas`), cruzados con el stock actual. Usado por el formulario de despacho para pre-llenado con indicadores de disponibilidad.

```json
// Response 200
{
  "data": [
    {
      "nombre": "Acero SAE 1045 Ø45mm",
      "cantidad": 10.0,
      "unidad": "kg",
      "stock_actual": 10.0
    }
  ]
}
```

Un `stock_actual >= cantidad` indica disponibilidad (verde en UI). `stock_actual < cantidad` indica faltante (rojo en UI).

---

## 4.8 Módulo: Producción (`/api/v1/produccion/`)

### GET `/produccion/lotes-terminados`

Lista todos los lotes con su estado, planos y movimientos asociados.

```json
// Response 200
{
  "data": [
    {
      "id": 56,
      "of_id": 111,
      "descripcion": "Inicio de lote",
      "estado": "en_despacho",
      "observaciones": [
        {
          "desde": "pre_produccion",
          "hacia": "produccion",
          "texto": "Planos revisados, comenzamos mecanizado",
          "fecha": "2026-05-12T09:00:00Z"
        },
        {
          "desde": "produccion",
          "hacia": "final_produccion",
          "texto": "Mecanizado completo, iniciando acabado superficial",
          "fecha": "2026-05-13T14:00:00Z"
        }
      ],
      "planos_asociados": [
        { "id": 5, "descripcion": "Plano de conjunto", "archivo_nombre": "plano.pdf", "tiene_archivo": true }
      ],
      "movimientos_asociados": [2],
      "created_at": "2026-05-12T08:30:00Z",
      "updated_at": "2026-05-14T10:00:00Z"
    }
  ]
}
```

**Ciclo de vida del `Lote.estado`:**

```
pre_produccion → produccion → final_produccion → terminado → en_despacho
```

Cada transición requiere una observación obligatoria (se registra en el array `observaciones`).

### POST `/produccion/lotes-terminados`

Inicia la producción de una OF. El lote se crea en estado `pre_produccion`. Requiere que la OF tenga al menos un `Plano` y un `Movimiento` (materiales despachados desde Pañol).

```json
// Request
{ "of_id": 111, "descripcion": "Inicio de lote" }

// Response 200
{
  "message": "Lote iniciado en Pre-Producción",
  "data": { "id": 56, "of_id": 111, "estado": "pre_produccion", ... }
}

// Error 400 — sin planos
{ "detail": "No hay planos enviados para la OF 111. Desarrollo debe enviarlos primero." }

// Error 400 — sin materiales
{ "detail": "No hay materiales despachados para la OF 111. Pañol debe despacharlos primero." }
```

### POST `/produccion/lotes/{id}/avanzar`

Avanza el lote al siguiente estado. Las `observaciones` son obligatorias.

```json
// Request
{ "observaciones": "Planos revisados, comenzamos mecanizado" }

// Response 200
{
  "message": "Estado actualizado a 'produccion'",
  "data": {
    "id": 56,
    "estado": "produccion",
    "observaciones": [
      {
        "desde": "pre_produccion",
        "hacia": "produccion",
        "texto": "Planos revisados, comenzamos mecanizado",
        "fecha": "2026-05-12T09:00:00Z"
      }
    ],
    ...
  }
}

// Error 400 — sin observaciones
{ "detail": "Las observaciones de avance son obligatorias para cambiar el estado." }

// Error 400 — ya en estado final
{ "detail": "El lote ya está en el estado final." }
```

---

## 4.9 Módulo: Logística (`/api/v1/logistica/`)

### GET `/logistica/despachos`

Lista todos los despachos.

```json
// Response 200
{
  "data": [
    {
      "id": 12,
      "lote_id": 56,
      "of_id": 111,
      "destino": "Av. Industrial 1234, Córdoba",
      "transportista": "Transporte Norte SA",
      "estado": "ejecutado",
      "observacion_admin": "Documentación verificada",
      "comprobante_saldo": "/media/comprobantes_saldo/comprobante.pdf",
      "created_at": "2026-05-14T11:00:00Z",
      "updated_at": "2026-05-14T12:30:00Z"
    }
  ]
}
```

- `of_id`: campo calculado por `SerializerMethodField`, navega la cadena `Despacho → Lote → OrdenFabricacion`. Permite al frontend de Administración cruzar despachos ejecutados con sus OFs en la vista "Obras finalizadas".
- `comprobante_saldo`: URL relativa al archivo adjuntado en la autorización. `null` si no fue adjuntado.

**Ciclo de vida de `Despacho.estado`:**

```
pendiente → esperando_autorizacion → autorizado → ejecutado
                                  ↘ rechazado
```

### POST `/logistica/despachos`

Crea un despacho para un lote. El lote debe estar en estado `terminado` o `en_despacho`. Al crear el despacho, el lote pasa automáticamente a `en_despacho`.

**Nota:** Un lote puede estar en `en_despacho` porque Producción lo avanzó hasta ese estado (último step del workflow de Producción). El frontend filtra los lotes disponibles para "Nuevo despacho" incluyendo ambos estados (`terminado` y `en_despacho`), pero excluyendo los que ya tienen un despacho activo (estado distinto de `rechazado`). Un despacho `rechazado` libera al lote para un nuevo intento.

```json
// Request
{
  "lote_id": 56,
  "destino": "Av. Industrial 1234, Córdoba",
  "transportista": "Transporte Norte SA"
}

// Response 200
{
  "message": "Despacho creado",
  "data": { "id": 12, "lote_id": 56, "estado": "pendiente", ... }
}
```

### POST `/logistica/despachos/{id}/solicitar-autorizacion`

Cambia el estado del despacho de `pendiente` a `esperando_autorizacion`. Alerta al área de Administración para que lo apruebe.

```json
// Response 200
{
  "message": "Autorización solicitada para despacho 12",
  "data": { "id": 12, "estado": "esperando_autorizacion", ... }
}
```

### POST `/logistica/despachos/{id}/ejecutar`

Ejecuta el despacho. Solo posible si está en estado `autorizado` (Administración debe haberlo aprobado primero).

```json
// Response 200
{
  "message": "Despacho 12 ejecutado",
  "data": { "id": 12, "estado": "ejecutado", ... }
}

// Error 400 — no autorizado aún
{
  "detail": "Despacho 12 no está autorizado. Estado: esperando_autorizacion. Administración debe aprobarlo primero."
}
```

---

## 4.10 Tareas Asíncronas (Celery Beat)

Las siguientes operaciones se ejecutan fuera del ciclo HTTP, scheduladas por Celery Beat:

| Tarea | Schedule | Descripción |
|-------|----------|-------------|
| `comercial.tasks.rechazar_ofs_vencidas` | Diario a las 19:00 ART | Rechaza OFs con anticipo pendiente cuyo `plazo_anticipo_dias` ha vencido. Actualiza `OrdenFabricacion.estado = 'rechazada_anticipo'` y `Anticipo.estado = 'rechazado'` con observación automática. |

**No hay endpoint HTTP para disparar esta tarea manualmente en producción.** El schedule se define en `CELERY_BEAT_SCHEDULE` dentro de `config/settings.py`. Si se necesita ejecución manual en desarrollo:

```bash
docker exec -it erp-lg-celery-worker-1 celery -A config call comercial.tasks.rechazar_ofs_vencidas
```

---

## 4.11 Operaciones con `@transaction.atomic`

Las siguientes operaciones afectan múltiples tablas. Si cualquier paso falla, se hace rollback completo:

| Endpoint | Tablas afectadas |
|----------|-----------------|
| `POST /comercial/ordenes-fabricacion` | `OrdenFabricacion` + `Anticipo` |
| `POST /desarrollo/pedidos-material` | `PedidoMaterial` + `OrdenCompra` + N×`PedidoMaterialItem` |
| `POST /compras/facturas` | `FacturaCompra` + N×`MaterialCompra` + `PedidoMaterial.estado` |
| `POST /panol/ingresos` | `Ingreso` + N×`Stock` + `FacturaCompra.estado` |
| `POST /panol/movimientos/produccion` | `Movimiento` + N×`MovimientoItem` + N×`Stock` |

---

## 4.12 Endpoints de Descarga de Archivos (PDF/binarios)

Los endpoints que retornan binarios requieren autenticación JWT en el header. **No usar `window.open(url)` directamente** — el navegador no incluye el header `Authorization` en navegaciones directas. El patrón correcto:

```javascript
// Patrón para cualquier endpoint de descarga
const blob = await fetch(`/api/v1/${path}`, {
  headers: { Authorization: `Bearer ${accessToken}` },
  credentials: 'include',
}).then(r => r.blob());

const url = URL.createObjectURL(blob);
window.open(url, '_blank');
setTimeout(() => URL.revokeObjectURL(url), 30000);
```

Endpoints que usan este patrón:

| Endpoint | Descripción |
|----------|-------------|
| `GET /desarrollo/planos/{id}/archivo` | PDF del plano técnico |
| `GET /compras/facturas/{id}/pdf` | PDF de la factura de compra |
| `GET /compras/insumos/template` | Template Excel para carga masiva |

---

## 4.13 Flujo Integrado End-to-End (E2E)

El siguiente escenario representa el happy path completo de una OF a través de los 7 dominios:

| Paso | Dominio | Endpoint / Actor | Resultado |
|------|---------|-----------------|-----------|
| 1 | Comercial | `POST /comercial/ordenes-fabricacion` (con `plazo_anticipo_dias`) | OF #111 en `pendiente_anticipo`, Anticipo #88 en `pendiente`, `responsable` = usuario autenticado |
| 2a | Administración | `PUT /administracion/anticipos/88/validar` `pagado=true` | Anticipo en `validado`, OF en `aprobada` |
| 2b | Sistema (Celery Beat) | Tarea `rechazar_ofs_vencidas` a las 19:00 ART | Si `plazo_anticipo_dias` vence: Anticipo en `rechazado`, OF en `rechazada_anticipo` |
| 3 | Desarrollo | `POST /desarrollo/pedidos-material` | PM #40 + OC #1 creados |
| 4 | Desarrollo | `POST /desarrollo/planos` | Plano #5 subido |
| 5 | Compras | `POST /compras/facturas` | FC #7 en `registrada`, PM #40 en `facturado` |
| 6 | Pañol | `POST /panol/ingresos` | Ingreso #3 creado, stock actualizado, FC #7 en `ingresada` |
| 7 | Pañol | `POST /panol/movimientos/produccion` | Movimiento #2, stock descontado |
| 8 | Producción | `POST /produccion/lotes-terminados` | Lote #56 en `pre_produccion` |
| 9 | Producción | `POST /produccion/lotes/56/avanzar` ×4 | Lote avanza: `produccion` → `final_produccion` → `terminado` → `en_despacho` |
| 10 | Logística | `POST /logistica/despachos` | Despacho #12 en `pendiente`, Lote #56 en `en_despacho` |
| 11 | Logística | `POST /logistica/despachos/12/solicitar-autorizacion` | Despacho en `esperando_autorizacion` |
| 12 | Administración | `PUT /administracion/despachos/12/aprobar` (multipart + `comprobante_saldo`) | Despacho en `autorizado`, comprobante guardado en `/media/comprobantes_saldo/` |
| 13 | Logística | `POST /logistica/despachos/12/ejecutar` | Despacho en `ejecutado` |
| 14 | Administración | Vista "Obras finalizadas" | Muestra comprobante anticipo (`factura_archivo`) + comprobante saldo (`comprobante_saldo`) de la OF |
