# ERP-LG — Manual de Referencia Técnica
## Capítulo 4: Referencia de API (RESTful)

---

## 4.1 Principios de Diseño de la API

La API de ERP-LG está expuesta a través de **Django REST Framework (DRF)**. Sigue los principios RESTful estándar para las operaciones CRUD (Create, Read, Update, Delete) utilizando enrutadores (`DefaultRouter`), y expone acciones personalizadas (`@action`) para operaciones de cambio de estado o transacciones de negocio complejas.

### 4.1.1 Códigos de Estado HTTP y Semántica
* `200 OK`: Solicitud GET, PUT o PATCH exitosa.
* `201 Created`: Solicitud POST exitosa, recurso creado.
* `204 No Content`: Solicitud DELETE exitosa.
* `400 Bad Request`: Error de validación de DRF, payload malformado, o falla en una precondición de negocio (ej. "La OF ya se encuentra iniciada").
* `403 Forbidden`: Problema de permisos o autorización.
* `404 Not Found`: El recurso solicitado no existe.

---

## 4.2 Referencia por Dominio

### 4.2.1 Comercial
Responsable de captar pedidos y anticipos.

| Método | Path | Descripción |
|---|---|---|
| `GET / POST` | `/api/comercial/ordenes-fabricacion/` | Listar o crear nuevas OFs. |
| `GET / PUT / DELETE`| `/api/comercial/ordenes-fabricacion/{id}/` | Detalle o edición de OF. |
| `POST` | `/api/comercial/ordenes-fabricacion/{id}/iniciar/` | Transiciona la OF de "Pendiente" a "Iniciada". |
| `GET / POST` | `/api/comercial/anticipos/` | Registrar pagos anticipados. |

**Contrato POST `/api/comercial/ordenes-fabricacion/`**
```json
// Request
{
  "cliente_nombre": "Metalúrgica San Martín",
  "descripcion_producto": "Eje tractor 45mm",
  "cantidad": 50,
  "fecha_entrega_esperada": "2026-05-15"
}

// Response (201 Created)
{
  "id": 1024,
  "cliente_nombre": "Metalúrgica San Martín",
  "descripcion_producto": "Eje tractor 45mm",
  "cantidad": 50,
  "fecha_entrega_esperada": "2026-05-15",
  "estado": "pendiente",
  "fecha_creacion": "2026-04-20T10:00:00Z"
}
```

### 4.2.2 Desarrollo
Documentación técnica y requerimientos de materiales.

| Método | Path | Descripción |
|---|---|---|
| `GET / POST` | `/api/desarrollo/planos/` | Subir o listar planos técnicos. |
| `GET / POST` | `/api/desarrollo/pedidos-material/` | Crear PM vinculado a una OF. |
| `POST` | `/api/desarrollo/pedidos-material/{id}/aprobar/` | Aprueba el PM para ser procesado por Compras. |

### 4.2.3 Compras
Adquisición de insumos a proveedores.

| Método | Path | Descripción |
|---|---|---|
| `GET / POST` | `/api/compras/proveedores/` | ABM de proveedores. |
| `GET / POST` | `/api/compras/ordenes-compra/` | Generar OC basada en Pedidos de Material. |
| `POST` | `/api/compras/facturas/` | Registrar una factura de proveedor. |

### 4.2.4 Pañol (Inventario)
Control de stock físico.

| Método | Path | Descripción |
|---|---|---|
| `GET` | `/api/panol/stock/` | Consultar estado actual del inventario. |
| `POST` | `/api/panol/ingresos/` | Registrar un remito de entrada de mercadería. |
| `POST` | `/api/panol/movimientos/` | Movimientos manuales (ajustes o mermas). |

### 4.2.5 Producción
Ejecución en taller.

| Método | Path | Descripción |
|---|---|---|
| `GET / POST` | `/api/produccion/lotes/` | Crear un lote de producción vinculado a una OF. |
| `POST` | `/api/produccion/lotes/{id}/avanzar_fase/` | Cambiar fase de producción (Mecanizado, Pintura, etc). |
| `POST` | `/api/produccion/lotes/{id}/finalizar/` | Marcar el lote como terminado y listo para despacho. |

### 4.2.6 Logística
Entrega al cliente.

| Método | Path | Descripción |
|---|---|---|
| `GET / POST` | `/api/logistica/despachos/` | Planificar un despacho de lotes terminados. |
| `POST` | `/api/logistica/despachos/{id}/ejecutar/` | Confirma la salida de planta. |

---

## 4.3 Operaciones Críticas: `@transaction.atomic`

Varias operaciones en la API implican modificaciones de estado coordinadas a lo largo de múltiples tablas. Django gestiona esto mediante el decorador `transaction.atomic` para garantizar las propiedades ACID.

**Casos principales de uso:**
1. **Ingreso a Pañol (`POST /api/panol/ingresos/`)**:
   - Se crea el registro del remito (`Ingreso`).
   - Se crea el detalle del `Movimiento`.
   - Se actualiza el balance de la entidad `Stock`.
   - *Por qué:* Si el sistema falla después de crear el movimiento pero antes de actualizar el Stock, habría un desbalance silencioso. `transaction.atomic` revierte (rollback) toda la operación si algo falla.

2. **Ejecución de Despacho (`POST /api/logistica/despachos/{id}/ejecutar/`)**:
   - Cambia el estado del Despacho a "Ejecutado".
   - Actualiza el estado de los `Lote` correspondientes a "Despachado".
   - Verifica y, de ser el caso, actualiza el estado de la `OrdenFabricacion` asociada a "Completada".

---

## 4.4 Flujo Integrado End-to-End (E2E)

El siguiente escenario representa el Happy Path completo de una Orden de Fabricación a través de las APIs de los dominios:

1. **Comercial:** 
   - `POST /api/comercial/ordenes-fabricacion/` → Crea la OF #1024 en estado "Pendiente".
   - `POST /api/comercial/ordenes-fabricacion/1024/iniciar/` → Pasa a "Iniciada".
2. **Desarrollo:**
   - `POST /api/desarrollo/planos/` → Se sube el plano en PDF vinculado a OF #1024.
   - `POST /api/desarrollo/pedidos-material/` → Se solicita acero para la OF #1024.
   - `POST /api/desarrollo/pedidos-material/40/aprobar/` → Se aprueba.
3. **Compras & Pañol:**
   - (Se asume stock insuficiente, Compras interviene y adquiere el acero).
   - `POST /api/panol/ingresos/` → Pañol recibe el acero (impacta el Stock positivo).
4. **Producción:**
   - `POST /api/produccion/lotes/` → Crea Lote #500 para OF #1024.
   - `POST /api/produccion/lotes/500/iniciar/` → (Automáticamente genera un Movimiento de Pañol restando el acero del Stock).
   - `POST /api/produccion/lotes/500/finalizar/` → El lote está listo para logística.
5. **Logística:**
   - `POST /api/logistica/despachos/` → Crea Despacho #88 para OF #1024 con el Lote #500.
   - `POST /api/logistica/despachos/88/ejecutar/` → El camión sale de planta. La OF #1024 se marca como "Completada".
