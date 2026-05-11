# ERP-LG — Manual de Referencia Técnica

## Capítulo 2: Arquitectura del Sistema

---

## 2.1 Domain-Driven Design: Principios Aplicados

ERP-LG está organizado siguiendo los principios de **Domain-Driven Design (DDD)**. DDD es un enfoque de diseño de software que centra la estructura del código en el dominio del problema de negocio, no en la tecnología.

### El Concepto de Bounded Context

Un **Bounded Context** es una frontera explícita dentro de la cual un modelo de dominio es internamente consistente. Más concretamente: un conjunto de entidades, reglas de negocio y vocabulario que tiene sentido únicamente dentro de esa frontera.

En ERP-LG, cada dominio de negocio es un Bounded Context, implementado como una app Django independiente:

| Bounded Context | App Django | Entidades propias | Responsabilidad |
|----------------|-----------|-------------------|-----------------|
| Comercial | `comercial` | `OrdenFabricacion`, `Anticipo` | Captación de pedidos y anticipos |
| Administración | `administracion` | *(sin modelos propios)* | Validaciones y autorizaciones cross-dominio |
| Desarrollo | `desarrollo` | `PedidoMaterial`, `OrdenCompra`, `PedidoMaterialItem`, `Plano` | Ingeniería: materiales y planos |
| Compras | `compras` | `Proveedor`, `Insumo`, `FacturaCompra`, `MaterialCompra` | Gestión de proveedores e insumos |
| Pañol | `panol` | `Stock`, `Ingreso`, `Movimiento`, `MovimientoItem` | Almacén: stock y movimientos |
| Producción | `produccion` | `Lote` | Cierre de lotes de fabricación |
| Logística | `logistica` | `Despacho` | Entrega al cliente |

### Cómo los Bounded Contexts Se Referencian Entre Sí

En DDD, los contextos no se acceden directamente a sus modelos internos sin restricciones. En Django, la implementación técnica de esta frontera son los **ForeignKey cross-app**:

```python
# produccion/models.py — Lote referencia OF desde comercial
class Lote(models.Model):
    of_id = models.ForeignKey('comercial.OrdenFabricacion', ...)

# logistica/models.py — Despacho referencia Lote desde produccion
class Despacho(models.Model):
    lote_id = models.ForeignKey('produccion.Lote', ...)
```

La notación `'app.Modelo'` (string con punto) es la forma de Django para referenciar modelos de otras apps sin importaciones directas en el momento de la definición de clase. Esto evita importaciones circulares y mantiene el acoplamiento entre contextos explícito y controlado.

**Regla:** Un dominio puede tener ForeignKey hacia modelos de otro dominio, pero no debe importar ni instanciar directamente lógica de negocio de otro dominio. Esa coordinación es responsabilidad de la capa de vistas.

---

## 2.2 Capas de la Aplicación Django

Cada dominio sigue una arquitectura de 4 capas con responsabilidades bien delimitadas:

```
┌─────────────────────────────────────────────────────────────┐
│                         HTTP Request                         │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        urls.py                               │
│  Mapea paths a vistas. Registra ViewSets en el router.       │
│  Define el endpoint de healthcheck del módulo.               │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        views.py                              │
│  Lógica de negocio y orquestación. Valida precondiciones.    │
│  Aplica transacciones. Coordina múltiples modelos.           │
│  Devuelve Response con datos serializados.                   │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────┐  ┌──────────────────────────────┐
│      serializers.py      │  │         models.py            │
│  Convierte modelos a     │  │  Define entidades, campos,   │
│  dict/JSON y viceversa.  │  │  relaciones y constraints.   │
│  Valida tipos de datos.  │  │  No contiene lógica de       │
│  SerializerMethodField   │  │  negocio (excepto @property  │
│  para campos derivados.  │  │  de compatibilidad).         │
└──────────────────────────┘  └──────────────────────────────┘
               │                              │
               └──────────────┬───────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      MariaDB 10.11                           │
│  Persistencia ACID. Integridad referencial via FK.           │
│  Constraints de unicidad (unique=True, OneToOneField).       │
└─────────────────────────────────────────────────────────────┘
```

### Responsabilidades por Capa

**`models.py` — Qué debe tener:**
- Definición de campos y sus tipos
- Relaciones (`ForeignKey`, `ManyToManyField`, `OneToOneField`)
- Constraints (`unique=True`, `db_index=True`)
- `Meta` (nombre de tabla, ordenamiento)
- `@property` para campos derivados de compatibilidad (no lógica de negocio)

**`models.py` — Qué NO debe tener:**
- Validaciones de estado de negocio
- Llamadas a otros modelos de otros dominios
- Lógica de coordinación entre entidades

**`serializers.py` — Qué debe tener:**
- Conversión modelo ↔ JSON
- Validación de tipos de datos de entrada
- `SerializerMethodField` para campos calculados o que requieren resolución de FK

**`serializers.py` — Qué NO debe tener:**
- Lógica de negocio
- Actualizaciones de estado

**`views.py` — Qué debe tener:**
- Validación de precondiciones de negocio (estado de la OF, existencia de entidades)
- Coordinación de operaciones multi-modelo con `@transaction.atomic`
- Construcción de responses
- Manejo de errores con excepciones DRF (`NotFound`, `ValidationError`, `PermissionDenied`)

**`urls.py` — Qué debe tener:**
- Mapeo de paths a vistas
- Endpoint raíz `path('', module_status)` para healthcheck

---

## 2.3 ViewSet: ModelViewSet vs ViewSet

DRF ofrece dos tipos de ViewSet que ERP-LG usa según el caso de uso:

### `ModelViewSet` — CRUD automático

```python
# comercial/views.py
class OrdenFabricacionViewSet(viewsets.ModelViewSet):
    queryset = OrdenFabricacion.objects.all()
    serializer_class = OrdenFabricacionSerializer
```

`ModelViewSet` implementa automáticamente: `list`, `create`, `retrieve`, `update`, `partial_update`, `destroy`. Se usa cuando el modelo se expone con operaciones CRUD estándar sin lógica de negocio compleja.

`OrdenFabricacion` usa `ModelViewSet` pero sobreescribe `list`, `retrieve` y `create` para personalizar la forma del response y agregar lógica de creación del anticipo asociado.

### `ViewSet` — Control total

```python
# compras/views.py
class ComprasViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['post'], url_path='facturas')
    @transaction.atomic
    def registrar_factura(self, request): ...
```

`ViewSet` no implementa ninguna acción por defecto. Cada endpoint se define explícitamente con el decorador `@action`. Se usa cuando los endpoints no mapean 1:1 con operaciones CRUD (por ejemplo, `registrar_ingreso` no es un simple `POST /ingresos` — involucra actualizar el stock y cambiar el estado de la factura).

### El decorador `@action`

```python
@action(
    detail=False,      # False: /recurso/accion | True: /recurso/{pk}/accion
    methods=['post'],  # Métodos HTTP permitidos
    url_path='facturas' # Segmento de URL
)
def registrar_factura(self, request): ...
```

`detail=True` se usa cuando la acción opera sobre una instancia específica (requiere `pk`). `detail=False` se usa para acciones sobre la colección completa.

---

## 2.4 Máquina de Estados de la Orden de Fabricación

La `OrdenFabricacion` es la entidad central del sistema. Su campo `estado` actúa como máquina de estados que habilita o bloquea operaciones downstream:

```
                    ┌─────────────────────┐
                    │                     │
              POST /comercial/ordenes-fabricacion
                    │                     │
                    ▼                     │
         ┌──────────────────────┐         │
         │  pendiente_anticipo  │◀────────┘
         │  (estado inicial)    │
         └──────────┬───────────┘
                    │
         PUT /administracion/anticipos/{id}/validar
                    │
          pagado=true         pagado=false
              │                    │
              ▼                    ▼
    ┌──────────────┐      ┌──────────────────────┐
    │   aprobada   │      │  rechazada_anticipo   │
    └──────┬───────┘      └──────────────────────┘
           │
    (habilita Desarrollo, Compras, Pañol, Producción, Logística)
           │
           ▼
    [ciclo operativo completo]
```

### Validación de Estado en la Vista

```python
# desarrollo/views.py
def verificar_of_aprobada(of_id: int):
    orden = OrdenFabricacion.objects.get(id=of_id)
    if orden.estado != "aprobada":
        anticipo = Anticipo.objects.filter(of_id=orden).first()
        estado_anticipo = anticipo.estado if anticipo else "sin anticipo"
        raise PermissionDenied(
            f"OF {of_id} no disponible. Estado: {orden.estado}. Anticipo: {estado_anticipo}"
        )
    return orden
```

Esta validación se ejecuta en cada operación de Desarrollo, Producción y Logística que requiere una OF aprobada. Si la OF no está en el estado correcto, la operación se rechaza con `HTTP 403 Forbidden` antes de tocar la base de datos.

---

## 2.5 Máquina de Estados del Lote de Producción

```
POST /produccion/lotes-terminados
         │
         ▼
  ┌──────────────────┐
  │  pre_produccion  │  (estado inicial al crear el lote)
  └────────┬─────────┘
           │  POST /produccion/lotes/{id}/avanzar  (observaciones requeridas)
           ▼
  ┌──────────────┐
  │  produccion  │
  └──────┬───────┘
         │
         ▼
  ┌──────────────────────┐
  │  final_produccion    │
  └──────────┬───────────┘
             │
             ▼
      ┌───────────┐
      │ terminado │  (lote visible para Logística)
      └─────┬─────┘
            │
            ▼
     ┌────────────┐
     │ en_despacho│  (asignado a un Despacho de Logística)
     └────────────┘
```

Cada transición registra en `Lote.observaciones` (JSONField) un objeto con `{desde, hacia, texto, fecha}`.

## 2.6 Máquina de Estados del Despacho

```
POST /logistica/despachos
         │
         ▼
    ┌──────────┐
    │ pendiente│
    └─────┬────┘
          │
POST /logistica/despachos/{id}/solicitar-autorizacion
          │
          ▼
┌─────────────────────────┐
│ esperando_autorizacion  │
└────────────┬────────────┘
             │
PUT /administracion/despachos/{id}/aprobar
             │
    aprobado=true        aprobado=false
         │                    │
         ▼                    ▼
   ┌──────────┐         ┌──────────┐
   │autorizado│         │rechazado │
   └────┬─────┘         └──────────┘
        │
POST /logistica/despachos/{id}/ejecutar
        │
        ▼
   ┌──────────┐
   │ejecutado │
   └──────────┘
```

El `Despacho` involucra dos dominios en su ciclo de vida: Logística crea y ejecuta, Administración autoriza. Esta es la implementación técnica de la separación de responsabilidades entre áreas de una empresa real.

---

## 2.7 Tareas Asíncronas y Programadas: Celery + Beat

ERP-LG incorpora Celery para ejecutar lógica de negocio fuera del ciclo request-response de Django. El caso de uso actual es el rechazo automático de OFs con anticipo vencido.

### Arquitectura

```
┌──────────────┐     REDIS (broker)     ┌────────────────┐
│ celery-beat  │ ──── encola tarea ────▶ │ celery-worker  │
│  (scheduler) │                         │  (ejecuta)     │
└──────────────┘                         └────────┬───────┘
  cron: 19:00 ART                                 │
  cada día                               ┌────────▼────────┐
                                         │   MariaDB        │
                                         │  (escribe OF     │
                                         │   rechazada)     │
                                         └─────────────────┘
```

Tres servicios Docker independientes: `redis` (broker), `celery-worker` (procesa), `celery-beat` (dispara según cron). Todos comparten la misma imagen del backend.

### Configuración (`config/settings.py`)

```python
from celery.schedules import crontab

CELERY_BROKER_URL = config('REDIS_URL', default='redis://localhost:6379/0')
CELERY_TIMEZONE   = 'America/Argentina/Buenos_Aires'
CELERY_BEAT_SCHEDULE = {
    'rechazar-of-vencidas-19hs': {
        'task': 'comercial.tasks.rechazar_ofs_vencidas',
        'schedule': crontab(hour=19, minute=0),
    },
}
```

### Tarea: `comercial.tasks.rechazar_ofs_vencidas`

```python
# comercial/tasks.py
@shared_task(name='comercial.tasks.rechazar_ofs_vencidas')
def rechazar_ofs_vencidas():
    ahora = timezone.now()
    for of in OrdenFabricacion.objects.filter(estado='pendiente_anticipo'):
        if of.plazo_anticipo_dias <= 0:
            continue
        limite = of.created_at + timedelta(days=of.plazo_anticipo_dias)
        if ahora >= limite:
            of.estado = 'rechazada_anticipo'
            of.save(update_fields=['estado', 'updated_at'])
            Anticipo.objects.filter(of_id=of, estado='pendiente').update(
                estado='rechazado',
                observacion='Rechazado automáticamente por vencimiento del plazo de anticipo.',
            )
```

**Por qué no en el request-response:** Un rechazo masivo de OFs al final del día no es una operación que debe bloquear un request HTTP. Celery Beat ejecuta la tarea en background a hora fija, con acceso directo al ORM de Django, sin impacto en los workers de Gunicorn.

### Variables de entorno requeridas

| Variable | Valor en prod | Descripción |
|----------|---------------|-------------|
| `REDIS_URL` | `redis://redis:6379/0` | URL del broker Redis (nombre de servicio Docker) |

---

## 2.8 `@transaction.atomic`: Atomicidad de Operaciones Complejas

Varias operaciones del sistema afectan múltiples tablas. Sin manejo explícito de transacciones, un error en el paso 3 de 4 dejaría la base de datos en un estado inconsistente.

```python
# compras/views.py — registrar_factura
@transaction.atomic
def registrar_factura(self, request):
    # Paso 1: crea FacturaCompra
    factura = FacturaCompra.objects.create(...)
    
    # Paso 2: crea N MaterialCompra
    for m in materiales_data:
        MaterialCompra.objects.create(factura_id=factura, ...)
    
    # Paso 3: actualiza estado del PedidoMaterial
    pedido.estado = "facturado"
    pedido.save()
    
    # Si cualquier paso falla → rollback total (ningún cambio persiste)
```

`@transaction.atomic` envuelve la función en una transacción de base de datos. Si cualquier operación dentro lanza una excepción (incluidas las de DRF como `ValidationError`, `NotFound`), MariaDB hace rollback de todas las operaciones del bloque. La base de datos queda en el estado previo a la llamada.

### Operaciones con `@transaction.atomic` en el sistema

| Vista / Tarea | Operaciones atómicas |
|-------|---------------------|
| `comercial.create` | Crea `OrdenFabricacion` + `Anticipo` |
| `desarrollo.create_pedido_material` | Crea `PedidoMaterial` + `OrdenCompra` + N `PedidoMaterialItem` |
| `compras.registrar_factura` | Crea `FacturaCompra` + N `MaterialCompra` + actualiza `PedidoMaterial.estado` |
| `panol.registrar_ingreso` | Crea `Ingreso` + actualiza N `Stock` + actualiza `FacturaCompra.estado` |
| `panol.despachar_a_produccion` | Crea `Movimiento` + N `MovimientoItem` + actualiza N `Stock` |
| `produccion.avanzar_estado` | Actualiza `Lote.estado` + agrega entrada a `Lote.observaciones` (JSONField) |
| `comercial.tasks.rechazar_ofs_vencidas` | Actualiza `OrdenFabricacion.estado` + `Anticipo.estado` de múltiples registros |

---

## 2.9 Sincronismo y el Modelo Request-Response

Django utiliza un modelo de ejecución **síncrono**: cada request HTTP ocupa un thread del worker de Gunicorn durante toda su duración. Cuando el worker ejecuta una query a MariaDB, el thread queda bloqueado esperando la respuesta.

### Implicancias

En un sistema con `N` workers de Gunicorn y `M` usuarios concurrentes:
- Si `M <= N`: todas las requests se procesan en paralelo, sin espera
- Si `M > N`: las requests en exceso esperan en cola hasta que un worker quede libre

Para ERP-LG con ~10-20 usuarios concurrentes, `N = 4` workers (valor por defecto de Gunicorn en desarrollo) es más que suficiente.

### Por qué no async

La versión original del sistema usaba FastAPI con `async/await`. La migración a Django sync se tomó por coherencia pedagógica. La diferencia de throughput es irrelevante en este contexto porque:

1. Las operaciones del ERP son write-heavy con validaciones (no CPU-bound ni I/O masivo)
2. El bottleneck de una instancia Django con 4 workers se alcanza mucho más tarde que el máximo de usuarios concurrentes del sistema
3. Django 5 tiene soporte async nativo (`async def` en vistas), por lo que la migración futura es posible sin cambiar el framework

---

## 2.10 El Router Raíz de URLs

`config/urls.py` es el punto de entrada de todas las requests HTTP al backend:

```python
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema')),
    path('api/v1/comercial/', include('comercial.urls')),
    path('api/v1/administracion/', include('administracion.urls')),
    path('api/v1/desarrollo/', include('desarrollo.urls')),
    path('api/v1/compras/', include('compras.urls')),
    path('api/v1/panol/', include('panol.urls')),
    path('api/v1/produccion/', include('produccion.urls')),
    path('api/v1/logistica/', include('logistica.urls')),
]
```

### El Prefijo `/api/v1/`

El prefijo `/api/v1/` en todos los endpoints no es decorativo: es versionado de API. Cuando en el futuro se introduzcan cambios breaking en la API (modificar el shape de un response, eliminar un campo), se pueden publicar bajo `/api/v2/` manteniendo `/api/v1/` operativo para clientes existentes. El frontend y cualquier integración externa solo necesitan actualizar cuando estén listos.

### Endpoint de Healthcheck por Módulo

Cada módulo define su propio endpoint raíz que devuelve un JSON mínimo:

```python
# compras/urls.py
def module_status(request):
    return JsonResponse({"module": "Compras", "status": "active"})

urlpatterns = [
    path('', module_status),
    ...
]
```

El frontend usa este endpoint para determinar si el módulo está `ONLINE`. La lógica es simple: si `GET /api/v1/compras/` responde con JSON válido, el módulo está activo. Si responde con HTML (error 404 de Django) o falla, el módulo aparece offline.

```javascript
// frontend/src/App.jsx
try {
  const res = await fetch(`/api/v1/${moduleId}/`);
  const data = await res.json(); // lanza si el body no es JSON válido
  setStatuses(prev => ({ ...prev, [moduleId]: { online: true, data } }));
} catch {
  setStatuses(prev => ({ ...prev, [moduleId]: { online: false } }));
}
```

---

## 2.11 Generación Automática de Schema OpenAPI con drf-spectacular

`drf-spectacular` inspecciona todos los ViewSets registrados en el router y genera un schema OpenAPI 3.1 completo, incluyendo:
- Descripción de cada endpoint
- Tipos de request body y response
- Parámetros de path y query
- Códigos de status posibles

El schema se actualiza automáticamente cuando se modifica una vista o serializer. No requiere anotaciones manuales en la mayoría de los casos; los decoradores `@extend_schema` se usan únicamente cuando la inferencia automática no es suficiente:

```python
# Cuando el response es un dict libre (no un serializer tipado)
@extend_schema(responses={200: dict})
@action(detail=False, methods=['get'])
def stock(self, request): ...
```

El schema se sirve en:
- `GET /api/schema/` — YAML/JSON crudo (para tooling e importación en Postman/Insomnia)
- `GET /api/schema/swagger-ui/` — Swagger UI interactivo (exploración de endpoints)
- `GET /api/schema/redoc/` — ReDoc (documentación de referencia legible)

---

## 2.12 Diagrama de Dependencias entre Dominios

Las dependencias entre dominios son unidireccionales. Ningún dominio upstream depende de uno downstream:

```
comercial
    ↑
    │ (ForeignKey)
    ├── administracion (no tiene modelos; usa comercial.Anticipo y logistica.Despacho)
    ├── desarrollo     ← depende de comercial
    │       ↑
    │       ├── compras    ← depende de desarrollo
    │       │       ↑
    │       │       └── panol   ← depende de compras
    │       │               ↑
    │       │               └── produccion ← depende de panol, desarrollo, comercial
    │       │                       ↑
    │       │                       └── logistica ← depende de produccion, comercial
    │       │
    │       └── (panol también depende de comercial via Movimiento.of_id)
```

**Dependencias cross-domain registradas en el código:**

| Modelo | Campo FK | Dominio origen | Dominio destino |
|--------|----------|----------------|-----------------|
| `OrdenFabricacion.responsable` | FK | comercial | auth_erp (User) |
| `Anticipo.of_id` | FK | comercial | comercial |
| `PedidoMaterial.of_id` | FK | desarrollo | comercial |
| `OrdenCompra.pm_id` | FK | desarrollo | desarrollo |
| `PedidoMaterialItem.pedido_id` | FK | desarrollo | desarrollo |
| `PedidoMaterialItem.oc_id` | FK | desarrollo | desarrollo |
| `Plano.of_id` | FK | desarrollo | comercial |
| `FacturaCompra.pedido_material_id` | FK | compras | desarrollo |
| `MaterialCompra.insumo` | FK | compras | compras |
| `MaterialCompra.proveedor` | FK | compras | compras |
| `Ingreso.factura_id` | FK | panol | compras |
| `Movimiento.of_id` | FK | panol | comercial |
| `MovimientoItem.movimiento_id` | FK | panol | panol |
| `MovimientoItem.insumo` | FK | panol | compras |
| `Stock.insumo` | OneToOne | panol | compras |
| `Lote.of_id` | FK | produccion | comercial |
| `Lote.planos` | M2M | produccion | desarrollo |
| `Lote.movimientos` | M2M | produccion | panol |
| `Despacho.lote_id` | FK | logistica | produccion |
