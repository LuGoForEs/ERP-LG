# ERP-LG — Guía de Implementación

## Capítulo 1: Configuración del Entorno de Desarrollo

---

## 1.1 Prerequisitos

El sistema corre íntegramente dentro de contenedores Docker. No se requiere Python ni Node instalados en el sistema operativo anfitrión.

| Herramienta | Versión mínima | Propósito |
|-------------|---------------|-----------|
| Docker Desktop | 4.x | Motor de contenedores + Compose |
| Git | 2.x | Control de versiones |
| Bash | 3.x | Ejecutar `erp.sh` (Git Bash en Windows) |

### Verificación de prerequisitos

```bash
docker --version       # Docker version 24.x o superior
docker compose version # Docker Compose version v2.x
git --version          # git version 2.x
bash --version         # GNU bash, version 3.x o superior
```

> **En Windows:** usar Git Bash (incluido con Git for Windows) para ejecutar `erp.sh`. PowerShell y CMD no son compatibles con la sintaxis del script.

---

## 1.2 Estructura del Repositorio

```
ERP-LG/
├── backend/                    # Django REST API
│   ├── config/                 # Configuración del proyecto Django
│   │   ├── settings.py         # Settings: DB, CORS, JWT, DRF
│   │   ├── urls.py             # Router raíz: /api/v1/<dominio>/
│   │   ├── wsgi.py             # Entry point WSGI (Gunicorn)
│   │   └── asgi.py             # Entry point ASGI (no usado actualmente)
│   ├── comercial/              # Dominio: Órdenes de Fabricación
│   ├── administracion/         # Dominio: Validaciones y autorizaciones
│   ├── desarrollo/             # Dominio: Pedidos de material y planos
│   ├── compras/                # Dominio: Facturas y proveedores
│   ├── panol/                  # Dominio: Stock y movimientos
│   ├── produccion/             # Dominio: Lotes de producción
│   ├── logistica/              # Dominio: Despachos al cliente
│   ├── requirements.txt        # Dependencias Python
│   ├── manage.py               # CLI de Django
│   ├── Dockerfile.dev          # Imagen Docker para desarrollo
│   ├── docker-compose.yml      # Stack backend + PostgreSQL
│   └── pytest.ini              # Configuración de tests
├── frontend/                   # React 18 + Vite 6
│   ├── src/
│   │   ├── App.jsx             # Componente raíz + dashboard de status
│   │   ├── App.css             # Estilos globales
│   │   ├── main.jsx            # Entry point React
│   │   └── components/         # Paneles por dominio
│   ├── package.json
│   ├── vite.config.js          # Proxy /api → backend:8000
│   ├── Dockerfile.dev
│   └── docker-compose.yml
├── database/                   # Stack de base de datos (legacy MariaDB)
│   └── docker-compose.yml
├── tests/
│   └── e2e/                    # Tests Playwright
├── docs/                       # Esta documentación
├── erp.sh                      # Orquestador bash del sistema
├── package.json                # Scripts npm (delegan a erp.sh)
└── playwright.config.js        # Configuración de tests E2E
```

### Anatomía de un dominio Django

Cada uno de los 7 dominios tiene la misma estructura interna:

```
<dominio>/
├── migrations/
│   ├── 0001_initial.py         # Schema inicial
│   └── 0002_*.py               # Migraciones de normalización
├── models.py                   # Entidades del dominio (ORM)
├── serializers.py              # Contratos de entrada/salida (JSON)
├── views.py                    # Lógica de negocio y endpoints
├── urls.py                     # Mapeo URL → vista
└── tests.py                    # Tests unitarios con pytest-django
```

Esta consistencia no es accidental: permite que cualquier desarrollador navegue a cualquier dominio y encuentre exactamente lo que espera en exactamente el lugar correcto. Es el principio de **menor sorpresa** aplicado a la estructura de archivos.

---

## 1.3 El Orquestador: `erp.sh`

`erp.sh` es un script bash de 145 líneas que centraliza el ciclo de vida completo del sistema. Reemplaza la necesidad de recordar múltiples comandos `docker compose` con sus paths y flags.

### Comandos disponibles

```bash
./erp.sh up          # Levanta database → backend → frontend
./erp.sh down        # Baja todo en orden inverso
./erp.sh restart     # down + up
./erp.sh status      # docker compose ps de cada stack
./erp.sh logs <stack> # Sigue logs (database | backend | frontend)
```

Los mismos comandos están disponibles via `npm`:

```bash
npm start            # = ./erp.sh up
npm stop             # = ./erp.sh down
npm run logs:backend # = ./erp.sh logs backend
```

### Análisis del comando `up`

```bash
up() {
  ensure_docker          # (1) Verifica o arranca Docker Desktop
  
  docker compose -f "$ROOT/database/docker-compose.yml" up -d
  wait_db_healthy        # (2) Espera healthcheck de PostgreSQL
  
  docker compose -f "$ROOT/backend/docker-compose.yml" up --build -d
  # (3) Construye imagen del backend y levanta el contenedor
  
  docker compose -f "$ROOT/frontend/docker-compose.yml" up --build -d
  # (4) Construye imagen del frontend y levanta el contenedor

  color "listo → http://localhost:5173  ·  http://localhost:8000/api/schema/swagger-ui/"
}
```

**Por qué el orden importa:**

El backend necesita que la base de datos esté disponible antes de arrancar. Django intenta conectarse a PostgreSQL durante el startup (`check` de `DATABASE_URL`). Si la base de datos no responde, el proceso Django termina con error de conexión.

La función `wait_db_healthy` resuelve esto con un polling de 120 segundos sobre el healthcheck del contenedor PostgreSQL:

```bash
wait_db_healthy() {
  for _ in {1..60}; do
    status="$(docker inspect -f '{{.State.Health.Status}}' "$cid")"
    if [[ "$status" == "healthy" ]]; then return 0; fi
    sleep 2
  done
}
```

PostgreSQL declara su healthcheck como `healthy` cuando `pg_isready` responde exitosamente. El frontend no tiene esta dependencia — puede levantarse en paralelo con el backend, pero se levanta último por convención de orden de lectura del script.

### Detección automática de Docker

El script detecta el sistema operativo y arranca Docker Desktop si no está corriendo:

```bash
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)           # Windows (Git Bash)
    "$dd" &                        # Lanza Docker Desktop en background
  Darwin)                         # macOS
    open -a Docker
  Linux)
    sudo systemctl start docker
esac
```

Esto permite ejecutar `./erp.sh up` directamente desde una terminal recién abierta sin preocuparse por el estado de Docker.

---

## 1.4 Red Docker: `erp-network`

Los tres stacks (database, backend, frontend) se comunican a través de una red Docker compartida llamada `erp-network`. Esta red es **externa**: no la crea ningún stack individualmente, sino que se declara una sola vez en `database/docker-compose.yml`:

```yaml
networks:
  erp-network:
    name: erp-network
    driver: bridge
```

Los stacks de backend y frontend la referencian como externa:

```yaml
networks:
  erp-network:
    external: true
```

**Por qué tres stacks separados en lugar de uno:**

Un único `docker-compose.yml` con todos los servicios es más simple de arrancar pero acopla el ciclo de vida de todos los componentes. Con stacks separados:
- La base de datos puede reiniciarse sin bajar el backend
- El frontend puede reconstruirse sin afectar la API
- Los healthchecks son granulares por stack
- En producción, cada stack puede desplegarse en infraestructura diferente

Dentro de la red `erp-network`, los contenedores se resuelven por nombre de servicio. El backend referencia la base de datos como `db:5432`, no como `localhost:5432`. Vite referencia el backend como `backend:8000` en el proxy.

---

## 1.5 Variables de Entorno

El backend usa `python-decouple` para leer configuración desde variables de entorno o un archivo `.env`. El archivo `backend/docker-compose.yml` inyecta estas variables directamente en el contenedor:

```yaml
environment:
  DATABASE_URL: postgres://erp_user:erp_password@db:5432/erp_db
  SECRET_KEY: django-insecure-dev-key-change-in-production
  DEBUG: "True"
  ALLOWED_HOSTS: "*"
  CORS_ALLOWED_ORIGINS: http://localhost:5173
```

En `config/settings.py`, `python-decouple` las consume:

```python
from decouple import config

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', cast=bool, default=False)
DATABASES = {
    'default': dj_database_url.parse(config('DATABASE_URL'))
}
```

### Diferencia entre entorno de desarrollo y producción

| Variable | Desarrollo | Producción |
|----------|-----------|------------|
| `DEBUG` | `True` | `False` |
| `SECRET_KEY` | Clave de ejemplo en compose | Generada con `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `ALLOWED_HOSTS` | `*` | Dominio específico |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | URL del frontend en producción |
| `DATABASE_URL` | Postgres local en Docker | URL de base de datos gestionada |

> **Regla crítica:** El archivo `.env` con valores de producción nunca se comitea al repositorio. Se agrega a `.gitignore`. El `docker-compose.yml` de desarrollo puede incluir valores de ejemplo porque son datos sin valor fuera del entorno local.

---

## 1.6 Primer Arranque: Paso a Paso

### Paso 1: Clonar el repositorio

```bash
git clone <url-del-repositorio> ERP-LG
cd ERP-LG
```

### Paso 2: Levantar el sistema

```bash
./erp.sh up
```

El script muestra el progreso:

```
[erp] 1/3 levantando database...
[erp] esperando a que MariaDB este healthy...
[erp] DB healthy
[erp] 2/3 levantando backend...
[erp] 3/3 levantando frontend...
[erp] listo → http://localhost:5173  ·  http://localhost:8000/api/schema/swagger-ui/
```

### Paso 3: Aplicar migraciones

En el primer arranque, el schema de la base de datos está vacío. Django necesita crear las tablas:

```bash
docker compose -f backend/docker-compose.yml exec backend python manage.py migrate
```

Salida esperada:

```
Operations to perform:
  Apply all migrations: admin, auth, comercial, compras, contenttypes, ...
Running migrations:
  Applying comercial.0001_initial... OK
  Applying comercial.0002_remove_anticipo_cliente... OK
  ...
  Applying produccion.0002_remove_lote_movimientos_asociados_and_more... OK
```

### Paso 4: Verificar el sistema

**Frontend:** Abrir `http://localhost:5173`

El dashboard muestra 7 tarjetas con indicadores de estado. Si todos los módulos muestran `ONLINE`, el sistema está operativo.

**Swagger UI:** Abrir `http://localhost:8000/api/schema/swagger-ui/`

La documentación interactiva de la API permite probar todos los endpoints directamente desde el navegador.

**Estado de los stacks:**

```bash
./erp.sh status
```

```
[erp] == database ==
NAME         STATUS
erp-db       Up (healthy)
[erp] == backend ==
NAME            STATUS
erp-backend     Up
[erp] == frontend ==
NAME             STATUS
erp-frontend     Up
```

### Paso 5: Ver logs en tiempo real

```bash
./erp.sh logs backend     # Logs de Django
./erp.sh logs database    # Logs de PostgreSQL
./erp.sh logs frontend    # Logs de Vite
```

---

## 1.7 El Proxy de Vite: Por Qué `/api` No Va Directo al Backend

El frontend corre en `localhost:5173` y necesita comunicarse con la API en `localhost:8000`. En un navegador, una petición de `localhost:5173` hacia `localhost:8000` es considerada **cross-origin** y está bloqueada por CORS (a menos que el servidor la permita explícitamente).

Vite resuelve esto con un proxy de desarrollo configurado en `vite.config.js`:

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://backend:8000',
      changeOrigin: true
    }
  }
}
```

Cuando el frontend hace `fetch('/api/v1/comercial/ordenes-fabricacion')`, Vite intercepta la request y la reenvía a `http://backend:8000/api/v1/comercial/ordenes-fabricacion`. Desde la perspectiva del navegador, la request va a `localhost:5173` — mismo origen, sin CORS.

**Por qué `backend:8000` y no `localhost:8000`:**

Dentro de la red Docker, `localhost` desde el contenedor del frontend apunta al propio contenedor del frontend, no al host. El nombre de servicio `backend` es resuelto por Docker DNS a la IP del contenedor del backend dentro de `erp-network`.

**Por qué CORS está configurado igualmente en el backend:**

`CORS_ALLOWED_ORIGINS = 'http://localhost:5173'` en `settings.py` aplica cuando el frontend se conecta directamente al backend sin pasar por el proxy (por ejemplo, desde herramientas externas como curl, Postman, o el propio Swagger UI). El proxy de Vite solo está activo durante el desarrollo con `vite dev`.

---

## 1.8 Comandos de Desarrollo Frecuentes

```bash
# Generar nuevas migraciones después de modificar modelos
docker compose -f backend/docker-compose.yml exec backend python manage.py makemigrations

# Aplicar migraciones pendientes
docker compose -f backend/docker-compose.yml exec backend python manage.py migrate

# Abrir shell de Django (para explorar el ORM interactivamente)
docker compose -f backend/docker-compose.yml exec backend python manage.py shell

# Ejecutar tests del backend
docker compose -f backend/docker-compose.yml exec backend pytest

# Ejecutar tests E2E (requiere sistema levantado)
npx playwright test

# Ver estado de migraciones por app
docker compose -f backend/docker-compose.yml exec backend python manage.py showmigrations

# Regenerar schema OpenAPI
docker compose -f backend/docker-compose.yml exec backend python manage.py spectacular --file schema.yaml
```

---

## 1.9 Problemas Frecuentes y Soluciones

| Problema | Causa | Solución |
|----------|-------|---------|
| `./erp.sh: Permission denied` | Script sin permisos de ejecución | `chmod +x erp.sh` |
| Backend no arranca, error de conexión a DB | PostgreSQL no terminó de inicializarse | `./erp.sh restart` — el script espera el healthcheck |
| `ONLINE` no aparece en ningún módulo | Backend no respondió a tiempo | Esperar 10s y presionar Refresh en el dashboard |
| `makemigrations` pide input interactivo | Campo no-nullable sin default en tabla con datos | Agregar `null=True` temporalmente al campo nuevo, generar migración, luego escribir migración de datos (`RunPython`) para poblar el FK |
| Módulo muestra `OFFLINE` en el dashboard | El endpoint `GET /api/v1/<modulo>/` devuelve HTML en vez de JSON | Verificar que `urls.py` del módulo tiene `path('', module_status)` registrado |
| `psycopg.OperationalError` al arrancar | Volumen de PostgreSQL corrupto | `docker compose -f backend/docker-compose.yml down -v && ./erp.sh up` (destruye datos locales) |
