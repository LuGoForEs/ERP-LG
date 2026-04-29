# ERP-LG — Manual de Referencia Técnica

## Capítulo 1: Introducción y Contexto del Sistema

---

## 1.1 Propósito del Sistema

ERP-LG es un sistema de planificación de recursos empresariales (Enterprise Resource Planning) diseñado para una empresa manufacturera que opera bajo el modelo **make-to-order** (fabricación bajo pedido). El sistema digitaliza y centraliza el ciclo operativo completo de una Orden de Fabricación, desde la captación comercial del pedido hasta el despacho físico del producto al cliente.

### El Problema que Resuelve

En una empresa manufacturera mediana sin sistema integrado, la coordinación entre áreas opera mediante canales informales: planillas Excel por área, correos electrónicos para aprobaciones, y comunicación verbal para estados de avance. Este modelo genera cuatro problemas estructurales:

**1. Pérdida de trazabilidad**
No existe un registro auditable de qué operación ocurrió, cuándo, quién la realizó y sobre qué entidad. Reconstruir la historia de un pedido requiere cruzar múltiples archivos de múltiples áreas.

**2. Inconsistencia de datos**
Cada área mantiene su propia copia del estado del pedido. Cuando Administración aprueba un anticipo, Comercial no se entera automáticamente. La información diverge entre áreas.

**3. Falta de validaciones de negocio**
Un operador de Desarrollo puede generar un Pedido de Material para una OF cuyo anticipo jamás fue aprobado. No existe mecanismo técnico que impida operaciones fuera de secuencia.

**4. Cuellos de botella en aprobaciones**
Las autorizaciones (anticipo, despacho) dependen de comunicación humana punto a punto. No hay visibilidad del estado de aprobación en tiempo real.

### La Solución

ERP-LG resuelve estos problemas mediante:

- **Modelo de datos centralizado** en PostgreSQL 16: una única fuente de verdad compartida por todos los dominios
- **APIs REST por dominio**: cada área expone y consume datos a través de contratos bien definidos
- **Validaciones de estado en capa de negocio**: una OF no puede avanzar al siguiente dominio si no cumple las precondiciones (estado correcto, entidades previas existentes)
- **Timeline de auditoría**: el endpoint `GET /api/v1/comercial/ordenes-fabricacion/{id}/timeline/` reconstruye cronológicamente todos los eventos asociados a una OF, cruzando los 7 dominios
- **Interfaz web por área**: cada dominio tiene su panel de operación en el frontend

---

## 1.2 Alcance del Sistema

El sistema modela el ciclo completo de una Orden de Fabricación a través de **7 dominios de negocio**:

```
┌─────────────┐    ┌────────────────┐    ┌─────────────┐
│  COMERCIAL  │───▶│ ADMINISTRACIÓN │◀───│  LOGÍSTICA  │
│  Crea OF    │    │ Valida anticipo│    │  Despacha   │
│  y anticipo │    │ Autoriza desp. │    │  al cliente │
└─────────────┘    └────────────────┘    └─────────────┘
       │                                        ▲
       ▼                                        │
┌─────────────┐    ┌─────────────┐    ┌─────────────────┐
│  DESARROLLO │───▶│   COMPRAS   │───▶│    PRODUCCIÓN   │
│  PM + Planos│    │  Facturas   │    │  Cierra el lote │
└─────────────┘    └─────────────┘    └─────────────────┘
                         │
                         ▼
                  ┌─────────────┐
                  │    PAÑOL    │
                  │  Stock +    │
                  │ Movimientos │
                  └─────────────┘
```

### Flujo Operativo Estándar

| Paso | Dominio | Operación | Precondición |
|------|---------|-----------|--------------|
| 1 | Comercial | Crea Orden de Fabricación + Anticipo | Ninguna |
| 2 | Administración | Valida pago del anticipo | Anticipo en estado `pendiente` |
| 3 | Desarrollo | Genera Pedido de Material + envía Planos | OF en estado `aprobada` |
| 4 | Compras | Registra Factura de Compra al proveedor | PM en estado `generado` |
| 5 | Pañol | Ingresa materiales al stock | FC en estado `registrada` |
| 6 | Pañol | Despacha materiales a Producción | Stock suficiente |
| 7 | Producción | Finaliza el Lote | Planos + Movimientos existentes para la OF |
| 8 | Logística | Crea Despacho y solicita autorización | Lote en estado `terminado` |
| 9 | Administración | Autoriza el Despacho | Despacho en estado `esperando_autorizacion` |
| 10 | Logística | Ejecuta el Despacho | Despacho en estado `autorizado` |

---

## 1.3 Stack Tecnológico

### Backend

| Tecnología | Versión | Rol |
|------------|---------|-----|
| Python | 3.12 | Lenguaje de implementación |
| Django | 5.x | Framework web: ORM, migraciones, admin, middleware |
| Django REST Framework | 3.15 | Serialización, ViewSets, autenticación, throttling |
| PostgreSQL | 16 | Base de datos relacional ACID-compliant |
| psycopg | 3.1 (binary) | Driver Python para PostgreSQL |
| drf-spectacular | 0.27 | Generación automática de schema OpenAPI 3.1 |
| SimpleJWT | 5.3 | Autenticación JWT (configurado, pendiente activación) |
| django-cors-headers | 4.3 | Manejo de CORS para el frontend |
| django-filter | 24 | Filtrado declarativo en querysets |
| python-decouple | 3.8 | Gestión de variables de entorno |
| WhiteNoise | 6.7 | Servicio de archivos estáticos sin Nginx |
| Celery | 5.4 | Cola de tareas asíncronas (instalado, pendiente uso) |
| Redis | 5.0 | Broker para Celery |
| Gunicorn | 22 | WSGI server para producción |
| pytest-django | 4.8 | Framework de testing |
| factory-boy | 3.3 | Generación de fixtures de prueba |
| ruff | 0.5 | Linter y formatter Python |

### Frontend

| Tecnología | Versión | Rol |
|------------|---------|-----|
| React | 18.3 | Biblioteca de UI basada en componentes |
| Vite | 6.0 | Bundler con HMR y proxy de desarrollo |
| JavaScript (ESM) | ES2022 | Lenguaje de implementación |

Sin frameworks de UI externos (MUI, Ant Design, Chakra): el frontend usa CSS puro para maximizar el control sobre la presentación y reducir dependencias.

### Infraestructura

| Tecnología | Rol |
|------------|-----|
| Docker / Docker Compose | Containerización de los 3 stacks |
| bash | Orquestación del ciclo de vida del sistema (`erp.sh`) |
| Playwright | Testing end-to-end |

---

## 1.4 Decisiones de Arquitectura y sus Fundamentos

### Decisión 1: Monolito Modular sobre Microservicios

Se evaluaron tres opciones arquitecturales:

**Opción A — Monolito clásico**
Una única app Django con todos los modelos en un solo `models.py`. Simple de arrancar, pero escala mal en términos de organización del código: a medida que el sistema crece, los módulos se acoplan inevitablemente.

**Opción B — Monolito modular (elegida)**
Siete apps Django independientes, una por dominio de negocio. Cada app es un Bounded Context: tiene sus propios modelos, serializers, vistas y URLs. Las referencias cross-dominio se realizan mediante ForeignKey explícitas (no importaciones de modelos internos sin control).

**Opción C — Microservicios**
Siete servicios desplegables de forma independiente, cada uno con su propia base de datos y comunicación via HTTP/mensajería.

**Por qué se eligió B:**

La complejidad operacional de microservicios (service discovery, distributed tracing, eventual consistency, transacciones distribuidas, múltiples bases de datos) no se justifica para el tamaño actual del sistema. El costo de coordinar una transacción que involucra Compras, Pañol y Producción simultáneamente en microservicios requiere patrones como Saga o Two-Phase Commit — cuya complejidad supera ampliamente el beneficio en este contexto.

El monolito modular con DDD provee el mismo aislamiento lógico a un costo operacional sustancialmente menor. La decisión se revisará si el sistema supera los ~50 usuarios concurrentes o si los dominios requieren equipos de desarrollo independientes con ciclos de release desacoplados.

> **Principio aplicado:** YAGNI (You Aren't Gonna Need It). No se diseña para una escala que no existe.

---

### Decisión 2: Django + DRF sobre FastAPI

El proyecto migró desde FastAPI + SQLModel (versión original) a Django 5 + DRF. Los fundamentos:

| Criterio | FastAPI | Django + DRF |
|----------|---------|--------------|
| Throughput async | Superior | Inferior (sync) |
| ORM | SQLModel / SQLAlchemy | Django ORM (maduro) |
| Migraciones | Alembic (manual) | Automáticas (`makemigrations`) |
| Admin panel | No incluido | Incluido |
| Convenciones del framework | Mínimas | Abundantes |
| Curva de aprendizaje equipo | Menor | Mayor |
| Coherencia con curriculum del curso | No | Sí |

La migración a Django se justifica pedagógicamente: el curriculum del curso (Programación 3° IC) usa Django como referencia técnica. El ERP-LG como proyecto de referencia debe usar el mismo stack que los alumnos aprenden.

La diferencia de throughput (async vs sync) es irrelevante en un sistema con ~10-20 usuarios concurrentes: el bottleneck no está en el servidor web sino en las queries a la base de datos.

---

### Decisión 3: PostgreSQL sobre MySQL / SQLite

| Criterio | SQLite | MySQL/MariaDB | PostgreSQL |
|----------|--------|---------------|-----------|
| ACID compliant | Parcial | Sí (InnoDB) | Sí |
| JSONField nativo | No | Parcial | Sí |
| ManyToMany eficiente | Sí | Sí | Sí |
| Soporte Django | Total | Total | Total |
| `pg_isready` healthcheck | No | No | Sí |
| Producción-grade | No | Sí | Sí |
| Tipos avanzados (ARRAY, JSONB) | No | No | Sí |

PostgreSQL 16 fue elegido por ser el motor relacional más completo con soporte nativo en Django y por ser el estándar de facto en aplicaciones Python de producción. SQLite fue descartado por sus limitaciones en escrituras concurrentes. MySQL/MariaDB fue descartado porque PostgreSQL provee mejor soporte para `JSONField` (usado en `Ingreso.snapshot`) y `ManyToManyField` (usado en `Lote.planos`, `Lote.movimientos`).

> **Nota:** El archivo `database/docker-compose.yml` referencia MariaDB como artefacto de la arquitectura original (FastAPI + MySQL). Es deuda técnica documentada — el backend corre exclusivamente con PostgreSQL en `backend/docker-compose.yml`.

---

### Decisión 4: Autenticación diferida (AllowAny temporal)

SimpleJWT está configurado en `REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES` pero `DEFAULT_PERMISSION_CLASSES` está seteado a `AllowAny`. Esta es una decisión deliberada de priorización: el sistema es funcional sin autenticación en entorno de desarrollo, y la implementación del flujo de login (pantalla de autenticación, roles por área, refresh token) está planificada como fase posterior.

El código de autenticación no se implementa a medias — se implementa completo cuando se aborda, incluyendo:
- `AbstractUser` extendido con campo `area` (rol de dominio)
- Frontend: `AuthContext`, `PrivateRoute`, formulario de login
- Middleware: validación del token en cada request

Esta decisión evita código de seguridad incompleto en el repositorio, que es más peligroso que no tener autenticación en un entorno de desarrollo aislado.

---

## 1.5 Glosario de Dominio

| Término | Descripción técnica |
|---------|---------------------|
| **OF** | Orden de Fabricación. Entidad central del sistema. Representa un pedido de un cliente. Tiene un ciclo de vida con estados: `pendiente_anticipo` → `aprobada` / `rechazada_anticipo`. |
| **Anticipo** | Pago parcial adelantado por el cliente para iniciar la fabricación. Está asociado 1:1 a una OF. Estados: `pendiente` → `validado` / `rechazado`. |
| **PM** | Pedido de Material. Listado de insumos y cantidades necesarios para fabricar la OF. Lo genera el área de Desarrollo. Estados: `generado` → `facturado`. |
| **OC** | Orden de Compra. Emitida al proveedor. Se genera automáticamente junto con el PM. Modelo en `desarrollo.OrdenCompra`. |
| **FC** | Factura de Compra. Documento que registra la compra efectiva a un proveedor. Está asociada a un PM. Estados: `registrada` → `ingresada`. |
| **Insumo** | Material o componente comprable. Entidad con nombre único (`compras.Insumo`). Es la referencia canónica de qué se compra. |
| **Proveedor** | Empresa que suministra insumos. Entidad con nombre único (`compras.Proveedor`). |
| **Stock** | Cantidad disponible de un insumo en el almacén (pañol). Relación 1:1 con `Insumo` via `OneToOneField`. |
| **Ingreso** | Registro del ingreso de materiales al stock a partir de una FC. Genera un snapshot inmutable de los materiales ingresados. |
| **Movimiento** | Egreso de materiales del stock hacia Producción. Contiene múltiples `MovimientoItem`. |
| **Plano** | Archivo técnico (PDF) asociado a una OF. Metadata almacenada en DB; el archivo no se persiste en disco. |
| **Lote** | Agrupación de planos y movimientos que representa la producción completada de una OF. Estados: `terminado` → `en_despacho`. |
| **Despacho** | Operación de entrega del lote al cliente. Estados: `pendiente` → `esperando_autorizacion` → `autorizado` / `rechazado` → `ejecutado`. |
| **Pañol** | Almacén de materiales. Término de uso industrial en Argentina. El módulo homónimo gestiona el stock y los movimientos. |
| **Timeline** | Reconstrucción cronológica de todos los eventos de una OF, cruzando los 7 dominios. Endpoint: `GET /api/v1/comercial/ordenes-fabricacion/{id}/timeline/`. |
| **Bounded Context** | Concepto de Domain-Driven Design. Cada dominio del ERP es un Bounded Context: tiene su propio vocabulario, sus propios modelos y sus propias reglas de negocio. En Django, cada Bounded Context es una app. |
| **AllowAny** | Clase de permisos de DRF que permite acceso sin autenticación. Configurada temporalmente hasta implementar el flujo de login. |

---

## 1.6 Convenciones del Proyecto

### Código Python

- **Estilo:** PEP 8, enforcement via `ruff`
- **Nombres de tablas:** explícitos via `Meta.db_table` en cada modelo (ej: `db_table = "ordenes_fabricacion"`)
- **Nombres de columnas FK:** explícitos via `db_column` (ej: `db_column='of_id'`)
- **Validaciones de negocio:** en la capa de vista (`views.py`), no en serializers ni modelos
- **Transacciones atómicas:** `@transaction.atomic` en operaciones que afectan múltiples tablas

### Git

Conventional Commits obligatorios:

| Prefijo | Uso |
|---------|-----|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `refactor` | Cambio que no agrega funcionalidad ni corrige bug |
| `chore` | Mantenimiento (dependencias, migraciones, configuración) |
| `docs` | Documentación |
| `test` | Tests |

### API REST

- Base path: `/api/v1/`
- Formato de respuesta exitosa: `{"data": {...}}` o `{"message": "...", "data": {...}}`
- Formato de error: respuesta estándar de DRF `{"detail": "..."}` o `{"field": ["error"]}`
- Sin versión en URL de modelos internos (solo en la API pública)
