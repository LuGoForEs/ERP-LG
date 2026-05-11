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

- **Modelo de datos centralizado** en MariaDB 10.11: una única fuente de verdad compartida por todos los dominios
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
| 1 | Comercial | Crea Orden de Fabricación + Anticipo (con `plazo_anticipo_dias`) | Ninguna |
| 2a | Administración | Valida pago del anticipo | Anticipo en estado `pendiente` |
| 2b | Sistema (Celery) | Rechaza automáticamente a las 19:00 ART si `plazo_anticipo_dias` venció | Anticipo en estado `pendiente` y plazo vencido |
| 3 | Desarrollo | Genera Pedido de Material + envía Planos | OF en estado `aprobada` |
| 4 | Compras | Registra Factura de Compra al proveedor | PM en estado `generado` |
| 5 | Pañol | Ingresa materiales al stock | FC en estado `registrada` |
| 6 | Pañol | Despacha materiales a Producción | Stock suficiente |
| 7 | Producción | Inicia el Lote (`pre_produccion`) | Planos + Movimientos existentes para la OF |
| 7b | Producción | Avanza estados del Lote ×4 (con observaciones) | Lote en el estado anterior |
| 8 | Logística | Crea Despacho y solicita autorización | Lote en estado `terminado` o `en_despacho` |
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
| MariaDB | 10.11 | Base de datos relacional ACID-compliant |
| mysqlclient | 2.x | Driver Python para MariaDB |
| drf-spectacular | 0.27 | Generación automática de schema OpenAPI 3.1 |
| SimpleJWT | 5.3 | Autenticación JWT (configurado, pendiente activación) |
| django-cors-headers | 4.3 | Manejo de CORS para el frontend |
| django-filter | 24 | Filtrado declarativo en querysets |
| python-decouple | 3.8 | Gestión de variables de entorno |
| WhiteNoise | 6.7 | Servicio de archivos estáticos sin Nginx |
| Celery | 5.4 | Cola de tareas asíncronas + Celery Beat para tareas programadas |
| Redis | 7-alpine | Broker para Celery (servicio `redis` en docker-compose.prod.yml) |
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

### Decisión 3: MariaDB sobre SQLite

| Criterio | SQLite | MariaDB |
|----------|--------|---------|
| ACID compliant | Parcial | Sí (InnoDB) |
| JSONField nativo | No | Sí (via longtext) |
| ManyToMany eficiente | Sí | Sí |
| Soporte Django | Total | Total |
| Producción-grade | No | Sí |

MariaDB 10.11 fue elegido por ser un motor relacional robusto con soporte nativo en Django y por ser un estándar abierto de facto en aplicaciones de producción. SQLite fue descartado por sus limitaciones en escrituras concurrentes. Anteriormente el sistema utilizaba PostgreSQL, pero se ha unificado la infraestructura a MariaDB para simplificar el stack y corregir deuda técnica.

---

### Decisión 4: Autenticación Integral (JWT + 2FA + RBAC)

La autenticación y autorización están implementadas en la aplicación dedicada `auth_erp`. Se utiliza SimpleJWT para manejar sesiones sin estado.

**Autenticación:**
- Login con validación Cloudflare Turnstile (previene bots y ataques automatizados).
- 2FA TOTP opcional por usuario (app autenticadora tipo Google Authenticator).
- JWT: `access_token` (15 min, payload) + `refresh_token` (7 días, cookie `httpOnly`).
- Activación de cuenta por email: los usuarios se crean inactivos con un token UUID; el email contiene un link `/?activate=<token>` para establecer la contraseña.
- Expiración de cuenta: `UserProfile.expiration_date` — si la fecha pasó, el endpoint `/auth/refresh/` retorna 401.

**Autorización (RBAC):**
- Modelo `UserRole(user, role, permission)`: tabla `user_roles`, unicidad `(user, role)`.
- Roles: `comercial`, `administracion`, `desarrollo`, `compras`, `panol`, `produccion`, `logistica`, `gerencia` (expande a los 7 operativos).
- Permisos: `rw` (lectura/escritura) o `r` (solo lectura).
- Los roles se embeben en el payload JWT en `_issue_tokens()`; el token dura 15 min, por lo que los cambios de rol se reflejan en el siguiente refresh.
- `is_superuser` (flag nativo de Django) = acceso a los 8 paneles con escritura total.
- El frontend usa `PermissionsContext` para filtrar el sidebar y ocultar botones de escritura sin prop drilling.

Esta decisión garantiza la trazabilidad y la seguridad en operaciones sensibles como despachos o compras, al tiempo que permite configurar visibilidad y escritura por panel de forma granular.

---

## 1.5 Glosario de Dominio

| Término | Descripción técnica |
|---------|---------------------|
| **OF** | Orden de Fabricación. Entidad central del sistema. Representa un pedido de un cliente. Tiene un ciclo de vida con estados: `pendiente_anticipo` → `aprobada` / `rechazada_anticipo`. Incluye `responsable` (usuario que la creó, asignado automáticamente) y `plazo_anticipo_dias` (días para que Administración valide el pago antes del rechazo automático). |
| **Anticipo** | Pago parcial adelantado por el cliente para iniciar la fabricación. Está asociado 1:1 a una OF. Estados: `pendiente` → `validado` / `rechazado`. Si el plazo `plazo_anticipo_dias` vence sin validación, Celery Beat lo rechaza automáticamente a las 19:00 ART. |
| **Despacho** | Operación de entrega del lote al cliente. Estados: `pendiente` → `esperando_autorizacion` → `autorizado` / `rechazado` → `ejecutado`. Incluye `comprobante_saldo` (FileField) que Administración adjunta al autorizar. |
| **PM** | Pedido de Material. Listado de insumos y cantidades necesarios para fabricar la OF. Lo genera el área de Desarrollo. Estados: `generado` → `facturado`. |
| **OC** | Orden de Compra. Emitida al proveedor. Se genera automáticamente junto con el PM. Modelo en `desarrollo.OrdenCompra`. |
| **FC** | Factura de Compra. Documento que registra la compra efectiva a un proveedor. Está asociada a un PM. Estados: `registrada` → `ingresada`. |
| **Insumo** | Material o componente comprable. Entidad con nombre único (`compras.Insumo`). Es la referencia canónica de qué se compra. |
| **Proveedor** | Empresa que suministra insumos. Entidad con nombre único (`compras.Proveedor`). |
| **Stock** | Cantidad disponible de un insumo en el almacén (pañol). Relación 1:1 con `Insumo` via `OneToOneField`. |
| **Ingreso** | Registro del ingreso de materiales al stock a partir de una FC. Genera un snapshot inmutable de los materiales ingresados. |
| **Movimiento** | Egreso de materiales del stock hacia Producción. Contiene múltiples `MovimientoItem`. |
| **Plano** | Archivo técnico (PDF) asociado a una OF. Metadata y contenido binario almacenados en la base de datos (`BinaryField`). Se descarga vía `GET /desarrollo/planos/{id}/archivo` con autenticación JWT. |
| **Lote** | Agrupación de planos y movimientos que representa la producción de una OF. Ciclo de vida: `pre_produccion` → `produccion` → `final_produccion` → `terminado` → `en_despacho`. Cada transición requiere observaciones obligatorias. |
| **Pañol** | Almacén de materiales. Término de uso industrial en Argentina. El módulo homónimo gestiona el stock y los movimientos. |
| **Timeline** | Reconstrucción cronológica de todos los eventos de una OF, cruzando los 7 dominios. Endpoint: `GET /api/v1/comercial/ordenes-fabricacion/{id}/timeline/`. |
| **Bounded Context** | Concepto de Domain-Driven Design. Cada dominio del ERP es un Bounded Context: tiene su propio vocabulario, sus propios modelos y sus propias reglas de negocio. En Django, cada Bounded Context es una app. |
| **AllowAny** | Clase de permisos de DRF. Antes utilizada de forma global, ahora ha sido reemplazada por `IsAuthenticated` gracias a la integración de JWT. |
| **UserRole** | Modelo RBAC. Relaciona un `User` con un `role` (panel) y un `permission` (`rw`/`r`). Tabla `user_roles`, unicidad `(user, role)`. El rol `gerencia` es especial: el backend lo expande a los 7 paneles operativos al generar el JWT. |
| **RBAC** | Role-Based Access Control. Modelo de autorización donde los permisos se asignan a roles, y los roles a usuarios. En ERP-LG, cada rol corresponde a un panel del sistema. |
| **PermissionsContext** | Contexto React (`src/contexts/PermissionsContext.jsx`) que expone los hooks `canAccess(panel)` e `isReadonly(panel)` para que los paneles filtren su UI según el rol del usuario logueado. |
| **Activación por email** | Flujo de alta de usuarios: el SuperUser crea el usuario vía API → el sistema envía un email con URL `/?activate=<UUID>` → el usuario establece su contraseña → cuenta activa. El token UUID expira a 72h. |
| **SuperUser** | Usuario con `is_superuser=True` (flag nativo de Django). Tiene acceso a los 8 paneles (7 operativos + Usuarios) con escritura total, sin necesidad de entradas en `user_roles`. |

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
ga funcionalidad ni corrige bug |
| `chore` | Mantenimiento (dependencias, migraciones, configuración) |
| `docs` | Documentación |
| `test` | Tests |

### API REST

- Base path: `/api/v1/`
- Formato de respuesta exitosa: `{"data": {...}}` o `{"message": "...", "data": {...}}`
- Formato de error: respuesta estándar de DRF `{"detail": "..."}` o `{"field": ["error"]}`
- Sin versión en URL de modelos internos (solo en la API pública)
)
...}}`
- Formato de error: respuesta estándar de DRF `{"detail": "..."}` o `{"field": ["error"]}`
- Sin versión en URL de modelos internos (solo en la API pública)
)
