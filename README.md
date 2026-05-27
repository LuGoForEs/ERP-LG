# ERP-LG — Sistema de Gestión Industrial

Sistema ERP para gestión de procesos industriales diseñado con **Domain-Driven Design (DDD)**. Modela el ciclo de vida completo de una Orden de Fabricación (OF) a través de 7 dominios de negocio interconectados.

---

## 🚀 Inicio Rápido (Entorno de Desarrollo Local)

El sistema está completamente dockerizado. No necesitas instalar Python ni Node en tu máquina host.

### 1. Requisitos
- [Docker Desktop](https://docs.docker.com/get-docker/)
- **Git Bash** (en Windows) para ejecutar el orquestador `.sh`.

### 2. Levantar el sistema
Ejecutá el orquestador para levantar la base de datos, el backend y el frontend:
```bash
./erp.sh up
```

### 3. Configuración Inicial
Si es la primera vez que levantas el sistema, tenés que correr las migraciones para crear las tablas y el usuario administrador inicial:
```bash
docker compose -f backend/docker-compose.yml exec backend python manage.py migrate
```

### 4. Acceso y URLs
- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **API / Swagger:** [http://localhost:8000/api/schema/swagger-ui/](http://localhost:8000/api/schema/swagger-ui/)

---

## 🔑 Credenciales de Prueba (Desarrollo)

Para facilitar el desarrollo local, se han configurado los siguientes accesos:

### Usuario Administrador (Root)
Este usuario tiene acceso total y puede gestionar otros usuarios.
- **Email:** `root@admin.com.ar`
- **Password:** `Admin2026!`
*(Desbloqueado: No requiere cambio de contraseña ni 2FA en local)*

### Usuarios por Módulo (Mock)
Todos estos usuarios usan la contraseña: `Mock2026!`

| Usuario | Módulo / Permiso |
| :--- | :--- |
| `comercial@mock.com` | Comercial (RW) |
| `admin@mock.com` | Administración (RW) |
| `desarrollo@mock.com` | Desarrollo (RW) |
| `compras@mock.com` | Compras (RW) |
| `panol@mock.com` | Pañol (RW) |
| `produccion@mock.com` | Producción (RW) |
| `logistica@mock.com` | Logística (RW) |
| `gerencia@mock.com` | Gerencia (RW - Acceso Total) |
| `soporte@mock.com` | Soporte (RW) |
| `readonly@mock.com` | Solo Lectura (R - Todos los módulos) |

---

## 🛠️ Notas de Configuración Local

- **Host Allowed:** Se ha configurado `ALLOWED_HOSTS = ['*']` en `backend/config/settings.py` para evitar errores 400 (`DisallowedHost`) al usar el nombre de servicio de Docker.
- **Captcha:** En entorno `DEBUG=True`, el sistema omite la validación de Turnstile si no hay una clave configurada.

---

## 🏛️ Arquitectura

El sistema está dividido en **Bounded Contexts** que representan las áreas funcionales de una planta industrial:

| Dominio | Prefijo API | Responsabilidad |
|---------|-------------|-----------------|
| **Comercial** | `/api/v1/comercial` | Emisión de OF, gestión de anticipos |
| **Administracion** | `/api/v1/administracion` | Validación de anticipos y autorización de despachos |
| **Desarrollo** | `/api/v1/desarrollo` | Planos técnicos y listado de materiales (BOM) |
| **Compras** | `/api/v1/compras` | Órdenes de compra y gestión de proveedores |
| **Panol** | `/api/v1/panol` | Inventario, stock y movimientos |
| **Produccion** | `/api/v1/produccion` | Lotes de producción con workflow de 5 estados |
| **Logistica** | `/api/v1/logistica` | Despachos de lotes terminados |
| **Auth / Usuarios** | `/auth/` | Autenticación JWT + 2FA, RBAC completo |

### Stack tecnológico
- **Backend:** Python 3.12, Django 5.x, DRF
- **Frontend:** React 18, Vite 6
- **Base de datos:** MariaDB 10.11
- **Cola de tareas:** Celery 5 + Redis 7

---

## 📖 Documentación Completa

Para más detalles, consultá la carpeta `docs/manual-referencia/`:
- `01-introduccion.md`: Visión general y glosario.
- `02-arquitectura.md`: Detalles técnicos y Celery.
- `05-frontend.md`: Componentes y patrones de UI.
