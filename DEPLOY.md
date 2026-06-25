# Despliegue — `app1.academia.ar`

Guía de despliegue continuo de esta app (React + Django + PostgreSQL) en el servidor de la cátedra.

## Cómo funciona

- **Monorepo** (`frontend/` + `backend/` + `docker-compose.yml` en la raíz).
- El servidor de la cátedra corre un **webhook** (`https://deploy.academia.ar/hooks/app1`) suscripto al evento **`push`** del repo.
- Cada **`git push` a `main`** dispara: el servidor baja el código nuevo, hace `docker compose build` + `up`, y en **2-3 min** la app queda actualizada en la nube.
- No hay que conectarse al servidor: todo se maneja con `git push`.

Direcciones públicas:
- Frontend (la app): **https://app1.academia.ar**
- Backend (API): **https://api.app1.academia.ar**

## Arquitectura del despliegue

| Servicio | Imagen / build | Rol |
|---|---|---|
| `db` | `postgres:16` | Base de datos (volumen `app1-db-data`) |
| `redis` | `redis:7-alpine` | Broker/cache de Celery |
| `backend` | `./backend` (gunicorn) | API Django · `VIRTUAL_HOST=api.app1.academia.ar` |
| `celery-worker` / `celery-beat` | `./backend` | Tareas async y programadas |
| `frontend` | `./frontend` (nginx) | SPA React · `VIRTUAL_HOST=app1.academia.ar` |

- El frontend usa **same-origin**: su nginx hace de proxy de `/api/` (y del stream SSE) al `backend`. No hay CORS para el SPA.
- TLS y enrutado los maneja el `nginx-proxy` + `acme-companion` (Let's Encrypt) del servidor de la cátedra. Por eso **no hay `ports:`** en el compose.
- `collectstatic` corre en **runtime** (en el `command` del backend), no en el build.

## Flujo de trabajo diario

```bash
# 1. Programás y probás en local (opcional pero recomendado)
docker compose up -d --build          # requiere una red externa 'nginx-proxy' en local

# 2. Subís
git push origin main

# 3. Esperás 2-3 min y verificás en https://app1.academia.ar
```

## Verificar que el deploy se disparó

```bash
# Últimas entregas del webhook (querés ver 'push ... code=200')
gh api repos/LuGoForEs/ERP-LG/hooks --jq '.[] | {id, url: .config.url}'
gh api repos/LuGoForEs/ERP-LG/hooks/<HOOK_ID>/deliveries \
  --jq '.[0:5][] | (.delivered_at + "  " + .event + "  status=" + .status + "  code=" + (.status_code|tostring))'
```

- `push  status=OK  code=200` → GitHub notificó y el servidor de la cátedra **recibió** el evento.
- `code=200` confirma la **recepción**, no que el build haya terminado: la confirmación real es que `https://app1.academia.ar` cargue (con candado HTTPS).

> Si el sitio no levanta o no trae candado tras unos minutos: el certificado puede tardar la primera vez, o el build del servidor falló → pedir el log del hook a la cátedra.

## Cuentas demo (RBAC)

Se crean con el management command **`seed_users`** (idempotente; correr una vez por entorno):

```bash
docker compose exec backend python manage.py seed_users
docker compose exec backend python manage.py seed_demo   # datos de ejemplo (opcional)
```

| Usuario (login por email) | Password | Acceso |
|---|---|---|
| `admin@app1.academia.ar` | `erplg2303` | superuser (todo) |
| `gerencia@app1.academia.ar` | `erplg2303` | RW operativo |
| `gerencia.ro@app1.academia.ar` | `erplg2303` | solo lectura |
| `comercial@app1.academia.ar` | `erplg2303` | comercial |
| `compras@app1.academia.ar` | `erplg2303` | compras + pañol (r) |
| `produccion@app1.academia.ar` | `erplg2303` | producción + logística |
| `root@app1.academia.ar` | `erplg2303` | root (bypass admin) |

> Son **credenciales demo** (password compartida). En un entorno real, rotar con `seed_users --password "<otra>"` y exigir 2FA.

## Variables de entorno

**Para la demo, el `.env` es OPCIONAL:** la app arranca con valores demo por defecto (`SECRET_KEY` cae a una clave demo en `settings.py`; `POSTGRES_*` tienen default en el compose). Para un entorno real, el responsable del servidor crea el `.env` a partir de **`.env.example`** (nunca se versiona) con valores propios — si están, se usan. Contrato:

```
POSTGRES_DB / POSTGRES_USER / POSTGRES_PASSWORD
SECRET_KEY                  # clave larga y aleatoria, distinta por entorno
DEBUG=False
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
FRONTEND_URL=https://app1.academia.ar
RECAPTCHA_SECRET_KEY        # vacío = modo prueba
VITE_RECAPTCHA_SITE_KEY     # site key pública de Turnstile
```

## Configurar el webhook (una sola vez por repo)

Repo → **Settings → Webhooks → Add webhook**:
- **Payload URL:** `https://deploy.academia.ar/hooks/app1`
- **Content type:** `application/json`
- **Events:** *Just the push event* · **Active** ✔

O por CLI (necesita scope `admin:repo_hook`):
```bash
gh api -X POST repos/LuGoForEs/ERP-LG/hooks \
  -f "config[url]=https://deploy.academia.ar/hooks/app1" \
  -f "config[content_type]=json" -F "events[]=push" -F active=true
```
