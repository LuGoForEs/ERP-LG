# ERP Industrial - API REST

Sistema ERP para gestión de procesos industriales diseñado con **Domain-Driven Design (DDD)**. Modela el ciclo de vida completo de una Orden de Fabricación (OF) a través de 7 dominios de negocio interconectados.

## Arquitectura

El sistema está dividido en **Bounded Contexts** que representan las áreas funcionales de una planta industrial:

| Dominio | Prefijo API | Responsabilidad |
|---------|-------------|-----------------|
| **Comercial** | `/api/v1/comercial` | Gestión de clientes, emisión de OF y anticipos |
| **Administracion** | `/api/v1/administracion` | Validación de anticipos y autorización de despachos |
| **Desarrollo** | `/api/v1/desarrollo` | Planos técnicos y listado de materiales (BOM) |
| **Compras** | `/api/v1/compras` | Órdenes de compra y gestión de proveedores |
| **Panol** | `/api/v1/panol` | Inventario, stock y movimientos de materiales |
| **Produccion** | `/api/v1/produccion` | Lotes de producción y partes diarios |
| **Logistica** | `/api/v1/logistica` | Despachos, remitos y transporte |

### Flujo de negocio

```
Comercial → Desarrollo → Compras → Pañol → Producción → Logística
    ↓                                                        ↓
Administración ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←┘
```

## Stack tecnologico (2026)

- **Backend:** Python 3.12, Django 5.x, Django REST Framework (DRF)
- **Frontend:** React 18, Vite 6
- **Base de datos:** PostgreSQL 16 (psycopg v3)
- **Testing:** Pytest, Factory-Boy (Backend) + Playwright (E2E)
- **Infraestructura:** Docker, Docker Compose

## Estructura del proyecto

```
ERP-LG/
├── backend/
│   ├── config/                  # Proyecto principal Django (settings, urls)
│   ├── comercial/               # App Django
│   ├── administracion/          # App Django
│   ├── desarrollo/              # App Django
│   ├── compras/                 # App Django
│   ├── panol/                   # App Django
│   ├── produccion/              # App Django
│   ├── logistica/               # App Django
│   ├── requirements.txt
│   ├── docker-compose.yml
│   └── Dockerfile.dev
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   ├── docker-compose.yml
│   └── Dockerfile.dev
├── database/
│   └── docker-compose.yml
```

## Requisitos previos

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- Node.js (solo para tests E2E vía Playwright)

No se requiere Python ni bases de datos instaladas localmente para levantar la app.

## Levantar el proyecto

El proyecto se levanta con el script unificado `erp.sh` en la raíz del proyecto.

**Levantar todo:**
```bash
./erp.sh up
```

**Chequear estado de los contenedores:**
```bash
./erp.sh status
```

**Bajar los servicios:**
```bash
./erp.sh down
```

| Servicio | URL |
|----------|-----|
| Backend API | http://localhost:8000 |
| Docs (Swagger) | http://localhost:8000/api/schema/swagger-ui/ |
| Frontend | http://localhost:5173 |
| PostgreSQL | localhost:5432 |

## Tests

El backend cuenta con tests unitarios y de integración usando `pytest`.

```bash
# Correr tests del backend
cd backend
docker-compose run --rm web pytest -v
```

El frontend y la integración del sistema cuentan con tests e2e usando `Playwright`.

```bash
# Instalar dependencias e2e y correr tests
pnpm install
npx playwright test
```

## Seguridad (planificado)

- Autenticacion con JWT (SimpleJWT)
- Autorizacion por roles (RBAC) basada en dominios
- Audit trail con trazabilidad de cambios

## Licencia

Proyecto privado. Todos los derechos reservados.
