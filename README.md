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

## Stack tecnologico

- **Backend:** Python 3.11, FastAPI, SQLModel, Alembic
- **Frontend:** React 18, Vite 6
- **Base de datos:** MariaDB 10.11
- **Infraestructura:** Docker, Docker Compose

## Estructura del proyecto

```
ERP-LG/
├── backend/
│   ├── app/
│   │   ├── main.py                  # Entrypoint FastAPI
│   │   └── api/v1/endpoints/        # Routers por dominio
│   │       ├── comercial.py
│   │       ├── administracion.py
│   │       ├── desarrollo.py
│   │       ├── compras.py
│   │       ├── panol.py
│   │       ├── produccion.py
│   │       └── logistica.py
│   ├── requirements.txt
│   ├── docker-compose.yml
│   └── Dockerfile.dev
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   └── components/
│   │       └── AdminPanel.jsx
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

No se requiere Python, Node.js ni bases de datos instaladas localmente.

## Levantar el proyecto

El proyecto está dividido en dos stacks de Docker Compose para aislar la base de datos de la aplicación.

**Paso 1: Levantar la base de datos (Red compartida)**
```bash
cd database
docker compose up -d
```

**Paso 2: Levantar el Backend**
```bash
cd ../backend
docker compose up --build -d
```

**Paso 3: Levantar el Frontend**
```bash
cd ../frontend
docker compose up --build -d
```

| Servicio | URL |
|----------|-----|
| Backend API | http://localhost:8000 |
| Docs (Swagger) | http://localhost:8000/docs |
| Frontend | http://localhost:5173 |
| MariaDB | localhost:3306 |

## Endpoints principales

### Comercial
- `POST /api/v1/comercial/ordenes-fabricacion` - Crear Orden de Fabricacion
- `GET /api/v1/comercial/ordenes-fabricacion` - Listar ordenes
- `GET /api/v1/comercial/ordenes-fabricacion/{id}` - Detalle de OF
- `GET /api/v1/comercial/anticipos` - Listar anticipos

### Administracion
- `PUT /api/v1/administracion/anticipos/{id}/validar` - Validar anticipo
- `PUT /api/v1/administracion/despachos/{id}/aprobar` - Aprobar despacho

### Desarrollo
- `POST /api/v1/desarrollo/pedidos-material` - Generar pedido de materiales
- `POST /api/v1/desarrollo/planos` - Enviar planos a produccion

### Compras
- `POST /api/v1/compras/facturas` - Registrar compra de materiales

### Panol
- `POST /api/v1/panol/ingresos` - Registrar ingreso de materiales
- `POST /api/v1/panol/movimientos/produccion` - Despachar stock a produccion

### Produccion
- `POST /api/v1/produccion/lotes-terminados` - Registrar lote terminado

### Logistica
- `POST /api/v1/logistica/despachos/{id}/solicitar-autorizacion` - Solicitar autorizacion
- `POST /api/v1/logistica/despachos/{id}/ejecutar` - Ejecutar despacho

## Organizacion del equipo

El desarrollo se divide en dos tracks paralelos:

- **Track 1 (Dominio y Negocio):** Modelos, schemas Pydantic, validaciones de negocio y maquinas de estado.
- **Track 2 (Infraestructura y Seguridad):** Docker, JWT/RBAC, wrappers REST, audit trail y persistencia.

## Seguridad (planificado)

- Autenticacion con JWT
- Autorizacion por roles (RBAC) basada en dominios
- Audit trail con trazabilidad de cambios

## Licencia

Proyecto privado. Todos los derechos reservados.
