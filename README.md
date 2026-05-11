# ERP Industrial

Sistema ERP para gestión de procesos industriales diseñado con **Domain-Driven Design (DDD)**. Modela el ciclo de vida completo de una Orden de Fabricación (OF) a través de 7 dominios de negocio interconectados.

## Arquitectura

El sistema está dividido en **Bounded Contexts** que representan las áreas funcionales de una planta industrial:

| Dominio | Prefijo API | Responsabilidad |
|---------|-------------|-----------------|
| **Comercial** | `/api/v1/comercial` | Emisión de OF con responsable asignado y plazo de anticipo configurable; gestión de anticipos |
| **Administracion** | `/api/v1/administracion` | Validación de anticipos (con comprobante), autorización de despachos (con comprobante de saldo) |
| **Desarrollo** | `/api/v1/desarrollo` | Planos técnicos y listado de materiales (BOM) |
| **Compras** | `/api/v1/compras` | Órdenes de compra y gestión de proveedores |
| **Panol** | `/api/v1/panol` | Inventario, stock y movimientos de materiales |
| **Produccion** | `/api/v1/produccion` | Lotes de producción con workflow de 5 estados y auditoría de transiciones |
| **Logistica** | `/api/v1/logistica` | Despachos de lotes terminados o en despacho |
| **Auth / Usuarios** | `/auth/` | Autenticación JWT + 2FA, RBAC completo, gestión de usuarios y activación por email |

### Flujo de negocio

```
Comercial → Desarrollo → Compras → Pañol → Producción → Logística
    ↓                                                        ↓
Administración ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←┘
```

El rechazo automático de OFs con anticipo vencido corre cada día a las **19:00 ART** vía Celery Beat.

## Stack tecnológico (2026)

- **Backend:** Python 3.12, Django 5.x, Django REST Framework (DRF)
- **Frontend:** React 18, Vite 6 (dev) / Nginx (prod)
- **Base de datos:** MariaDB 10.11
- **Cola de tareas:** Celery 5 + Redis 7 (broker y result backend)
- **Testing:** Pytest, Factory-Boy (Backend) + Playwright (E2E)
- **Infraestructura:** Docker, Docker Compose

## Estructura del proyecto

```
ERP-LG/
├── backend/
│   ├── config/                  # Proyecto Django (settings, urls, celery.py)
│   ├── comercial/               # OF, anticipos, tarea Celery de rechazo
│   ├── administracion/          # Validación anticipos y despachos
│   ├── desarrollo/              # Planos y BOM
│   ├── compras/                 # OC y proveedores
│   ├── panol/                   # Stock y movimientos
│   ├── produccion/              # Lotes y workflow de estados
│   ├── logistica/               # Despachos
│   ├── auth_erp/                # Autenticación JWT + 2FA
│   ├── requirements.txt
│   ├── Dockerfile               # Imagen producción (Gunicorn)
│   └── Dockerfile.dev
├── frontend/
│   ├── src/
│   │   ├── components/          # Paneles por dominio + primitives.jsx + UsersPanel + ActivationPage
│   │   ├── contexts/            # AuthContext, PermissionsContext (RBAC)
│   │   └── api.js               # Cliente HTTP centralizado
│   ├── package.json
│   ├── vite.config.js
│   ├── Dockerfile               # Imagen producción (Nginx)
│   └── Dockerfile.dev
├── docs/
│   └── manual-referencia/       # Documentación técnica (caps. 01–05)
├── docker-compose.prod.yml      # Compose de producción (6 servicios)
└── erp.sh                       # Script helper (dev)
```

## Requisitos previos

- [Docker](https://docs.docker.com/get-docker/) y [Docker Compose](https://docs.docker.com/compose/install/)
- Node.js (solo para tests E2E vía Playwright)

No se requiere Python ni MariaDB instalados localmente.

## Levantar en producción

```bash
sudo docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

| Servicio | URL / Puerto |
|----------|-------------|
| Frontend (Nginx) | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/api/schema/swagger-ui/ |
| MariaDB | puerto 3306 (interno) |
| Redis | puerto 6379 (interno) |

Los servicios `celery-worker` y `celery-beat` se levantan automáticamente junto al resto.

## Levantar en desarrollo

```bash
./erp.sh up       # levanta backend + frontend + DB
./erp.sh status   # estado de contenedores
./erp.sh down     # bajar servicios
```

| Servicio | URL |
|----------|-----|
| Backend API | http://localhost:8000 |
| Frontend (Vite) | http://localhost:5173 |

## Tests

```bash
# Backend
docker compose run --rm backend pytest -v

# E2E
pnpm install
npx playwright test
```

## Seguridad y Control de Acceso (RBAC)

- **Autenticación**: Login con validación Cloudflare Turnstile, 2FA TOTP, JWT (access 15 min + refresh httpOnly 7 días).
- **RBAC por panel**: modelo `UserRole(user, role, permission)` con permisos `rw` (lectura/escritura) o `r` (solo lectura).
- **Roles disponibles**: `comercial`, `administracion`, `desarrollo`, `compras`, `panol`, `produccion`, `logistica`, `gerencia` (expande a los 7 paneles operativos).
- **SuperUser**: accede a los 8 paneles (7 operativos + Usuarios); gestiona altas, modificaciones y bajas de usuarios.
- **Sidebar filtrado**: cada usuario solo ve los paneles a los que tiene acceso.
- **Modo lectura**: usuarios con permiso `r` no ven botones de escritura (no se deshabilitan, directamente no se renderizan).
- **Activación por email**: los usuarios se crean inactivos; reciben un email con token UUID para establecer su contraseña (`/?activate=<token>`). En desarrollo, el email se imprime en los logs del backend.
- **Expiración de cuenta**: campo `expiration_date` en `UserProfile`; el refresh token devuelve 401 si la cuenta expiró.
- Archivos de comprobantes requieren header `Authorization` para descargarse.

## Actualizaciones Recientes (Mayo 2026)

### RBAC — Control de Acceso por Roles (última sesión)
- **Modelo `UserRole`**: tabla `user_roles` con campos `user`, `role`, `permission` (`rw`/`r`). Unicidad por `(user, role)`. Migración `0002_rbac`.
- **UserProfile extendido**: campos `dni`, `expiration_date`, `activation_token`, `activation_token_created_at`.
- **Roles embebidos en JWT**: el payload incluye `roles` e `is_superuser`; el rol `gerencia` se expande a los 7 paneles en el helper `_build_roles_payload()`.
- **Endpoints de gestión de usuarios**: `POST /auth/users/create/`, `GET /auth/users/`, `PUT /auth/users/{id}/`, `DELETE /auth/users/{id}/` (solo SuperUser).
- **Activación por email**: `POST /auth/activate/` con `token` + `password`; el token expira a las 72h.
- **Frontend — PermissionsContext**: hook `usePermissions()` expone `canAccess(panel)` e `isReadonly(panel)` sin prop drilling.
- **Frontend — Sidebar filtrado**: `visibleModules` calculado desde `allowedPanels` (Set); shortcuts de teclado bloqueados para paneles inaccesibles.
- **Frontend — Modo lectura**: los 7 paneles operativos y el panel de despachos internos ocultan botones de escritura con `{!readonly && <Button>}`.
- **Frontend — UsersPanel**: panel exclusivo para SuperUser; permite crear, editar roles/expiración y eliminar usuarios.
- **Frontend — ActivationPage**: ruta `/?activate=<token>` renderiza el formulario de activación fuera del auth gate.

### Sesiones anteriores
- **Comercial**: OF registra `responsable` (usuario que la crea) y `plazo_anticipo_dias` configurable por OF.
- **Administración**: Anticipos separados en Pendientes / Validados / Rechazados. Despachos incluyen upload de comprobante de saldo. Nueva sección "Obras finalizadas" con ambos comprobantes por OF.
- **Logística**: Dropdown "Nuevo despacho" incluye lotes en estado `terminado` y `en_despacho`, excluyendo los que ya tienen despacho activo.
- **Celery Beat**: Tarea `rechazar_ofs_vencidas` corre diariamente a las 19:00 ART; rechaza automáticamente OFs y anticipos con plazo vencido.
- **Infraestructura**: Servicios `redis`, `celery-worker` y `celery-beat` añadidos al compose de producción.
- **Seguridad**: Login, 2FA y JWT via `auth_erp`. Configuración de producción con Nginx + Gunicorn + `docker-compose.prod.yml`.

## Documentación técnica

Ver `docs/manual-referencia/` para referencia completa:

| Capítulo | Contenido |
|----------|-----------|
| `01-introduccion.md` | Visión general, stack, glosario |
| `02-arquitectura.md` | Django apps, Celery, decisiones de diseño |
| `03-modelo-datos.md` | Modelos, relaciones, migraciones, deuda técnica |
| `04-api-referencia.md` | Contratos de endpoints por dominio |
| `05-frontend.md` | Componentes, routing, primitivas, patrones de UI |

## Licencia

Proyecto privado. Todos los derechos reservados.
