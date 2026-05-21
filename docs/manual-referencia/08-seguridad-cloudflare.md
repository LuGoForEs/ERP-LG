# Seguridad — Adaptación a filtros de Cloudflare

> **Estado:** implementado el 2026-05-20.
>
> Este documento describe la defensa en profundidad incorporada al proyecto
> para convivir con los filtros de Cloudflare (WAF managed rules, Bot Fight
> Mode, Rate Limit, custom rules). Cubre observabilidad, mitigación de
> disparos del WAF y throttling local.

---

## Contexto

`erp.sibotec.com.ar` está detrás de Cloudflare. El endpoint `/api/v1/auth/login/` está devolviendo **HTTP 403 sin llegar al servidor** (verificado: no aparece ningún POST a `/api/v1/auth/login/` en los logs de nginx ni del backend en los últimos 10+ minutos). El responsable es algún filtro de Cloudflare (WAF managed rules, Bot Fight Mode, Rate Limit, o regla custom).

**Restricción clave:** no hay acceso al panel de Cloudflare en este momento. Eso significa que **no podemos crear skip rules ni desactivar Bot Fight Mode**. El plan se limita a cambios del lado de la aplicación que:

1. **Reduzcan la probabilidad** de que CF interprete los requests legítimos como sospechosos (headers limpios, payloads predecibles, Turnstile bien integrado).
2. **Den a la app autonomía** ante decisiones de CF (manejo claro de 403, mensajes útiles al usuario, retry selectivo).
3. **Den observabilidad** para diagnóstico futuro (logging de `CF-Ray`, IP real `CF-Connecting-IP`).
4. **Agreguen defensa en profundidad** local (throttle DRF) para no depender 100% de CF.

> **Nota importante:** si después de aplicar este plan el 403 persiste en login, es señal casi segura de una regla WAF específica de CF que requiere acceso al panel para inspeccionar Security Events. La app por sí sola no puede saltear una regla `Block` explícita.

---

## Objetivos del plan (en orden de prioridad)

1. **Fase 1 — Observabilidad + UX inmediata** (sin riesgo, deploy rápido)
2. **Fase 2 — Adaptaciones que reducen disparos del WAF** (cambios chicos, alto impacto)
3. **Fase 3 — Defensa en profundidad** (throttle local, validación de entradas, refactor de endpoints "ruidosos")

---

## FASE 1 — Observabilidad y UX inmediata

### 1.1 Middleware para IP real detrás de Cloudflare

**Archivo nuevo:** `backend/auth_erp/middleware.py`

Crear `CloudflareIPMiddleware` que reemplace `request.META['REMOTE_ADDR']` por el valor de `HTTP_CF_CONNECTING_IP` (con fallback a `HTTP_X_FORWARDED_FOR` y luego a `REMOTE_ADDR` original). Sin esto:
- el logging de auditoría ve siempre IPs de Cloudflare,
- el throttle local de la Fase 3 no podría diferenciar usuarios reales.

Registrar el middleware en `backend/config/settings.py:52-63` (insertarlo justo después de `SecurityMiddleware`).

**Decisión de seguridad:** confiar en `CF-Connecting-IP` solo si el request entra por la red interna de Docker (verificar `REMOTE_ADDR` ∈ subnet privada). En producción, el backend solo es accesible vía el frontend nginx (`172.18.0.0/16` aprox).

### 1.2 Logging de CF-Ray y correlación

**Archivo:** `backend/config/settings.py:179` (sección `LOGGING` — agregar si no existe).

- Agregar `LOGGING` con un formatter que incluya `cf_ray`, `cf_connecting_ip`, `request_id`.
- Crear filtro que extraiga `HTTP_CF_RAY` del request en curso (via `threading.local` o vía middleware que setee atributos en `logging`).

**Archivo nuevo:** `backend/config/exception_handler.py`

Custom DRF `EXCEPTION_HANDLER` que loguee toda excepción no manejada con `cf_ray` + `cf_connecting_ip` + `endpoint`. Registrar en `REST_FRAMEWORK['EXCEPTION_HANDLER']` (`backend/config/settings.py:148-159`).

### 1.3 Frontend: detectar y mostrar errores de Cloudflare

**Archivo:** `frontend/src/api.js`

Actualmente en `api.js:55-65` el manejo de errores solo parsea JSON. Cuando CF bloquea, devuelve **HTML** (página "Sorry, you have been blocked"). Cambios:

- Después del `fetch`, antes de parsear el body, verificar `Content-Type`. Si es `text/html` o el status es `403/503/520-526` (rangos típicos de CF), reconocer como "bloqueo de borde" y lanzar un error específico con:
  - `cf_ray` (extraído del header `cf-ray` de la respuesta),
  - `status`,
  - `message` amigable: `"La verificación de seguridad bloqueó la solicitud (CF-Ray: <id>). Recargá la página y volvé a intentar."`
- Agregar header `Accept: application/json` por defecto en todos los requests (`api.js:38`). Hoy no se envía, lo que hace que algunas reglas WAF que comparan `Accept` con el endpoint fallen.
- Agregar header `X-Requested-With: XMLHttpRequest` — señal estándar de cliente JS legítimo, varias reglas WAF whitelist por este header.

**Archivo:** `frontend/src/components/LoginPage.jsx`

- En el `catch` de `handleLogin` (línea ~133), detectar el error de tipo CF y mostrar el `cf_ray` en pantalla (input read-only de "Copiar para reportar al administrador"). Hoy se muestra solo el `.message`.
- Resetear el widget Turnstile en **todo error** (no solo en errores de auth), porque hoy si la respuesta es CF block (no toca el backend) el token Turnstile queda consumido en estado intermedio y un segundo click usa el mismo token → loop infinito.

### 1.4 CORS: exponer headers necesarios

**Archivo:** `backend/config/settings.py:134-135`

Hoy hay `CORS_ALLOWED_ORIGINS` y `CORS_ALLOW_CREDENTIALS` pero no `CORS_ALLOW_HEADERS` ni `CORS_EXPOSE_HEADERS`. Agregar:

- `CORS_ALLOW_HEADERS`: el default cubre `Content-Type`, `Authorization`, etc. Agregar explícitamente para que sea evidente y para incluir `X-Requested-With`.
- `CORS_EXPOSE_HEADERS = ['cf-ray', 'x-request-id']` → permite al frontend leer estos headers (sin esto el navegador los oculta en respuestas CORS).

---

## FASE 2 — Reducir disparos del WAF

### 2.1 Headers HTTP "limpios" y consistentes

**Archivo:** `frontend/src/api.js:33-41`

Asegurar en cada request:
- `Accept: application/json` (ver Fase 1.3).
- `X-Requested-With: XMLHttpRequest`.
- **NO** enviar headers custom que CF Bot Management interprete como bot (ej: no agregar User-Agent custom — usar el del navegador).
- Para `FormData`, **no** setear `Content-Type` manualmente (dejar que el navegador genere el `multipart/form-data; boundary=...` correcto).

### 2.2 Extender Turnstile a todos los endpoints públicos sensibles

Hoy Turnstile solo se usa en `LoginView` (`backend/auth_erp/views.py:170`). Los siguientes endpoints son `AllowAny` y desde el punto de vista de WAF son indistinguibles del login (mismo riesgo de bloqueo):

- `POST /api/v1/auth/password-reset/` (`auth_erp/views.py:510-554`)
- `POST /api/v1/auth/password-reset/confirm/` (líneas 557-591)
- `POST /api/v1/auth/activate/` (líneas 647-685)
- `POST /api/v1/auth/users/resend-activation/` (líneas 617-644)
- `POST /api/v1/auth/root/cred-change/` (líneas 710-750)
- `POST /api/v1/auth/root/cred-confirm/` (líneas 753-794)

**Cambios:**
- En backend, agregar verificación `_verify_recaptcha(turnstile_token)` al inicio de cada uno (`backend/auth_erp/views.py:74-86` ya existe la función).
- En frontend, agregar el componente Turnstile en cada formulario público (`frontend/src/components/PasswordResetPage.jsx`, `ActivateAccountPage.jsx`, etc.). Reutilizar el `useTurnstile` hook ya existente en `LoginPage.jsx:8-49` (refactorizarlo a `frontend/src/hooks/useTurnstile.js` para evitar duplicación).

Beneficio doble: (a) cada request lleva la señal "humano verificado", que algunas reglas Bot Management whitelist; (b) brute force a estos endpoints se vuelve costoso.

### 2.3 Validación de query strings de búsqueda

Endpoints de búsqueda con `?q=` libre (`compras/views.py:38-42`, `compras/views.py:73-80`, `soporte/views.py:218-240`) pueden disparar reglas OWASP SQLi del WAF cuando el usuario escribe texto con caracteres especiales (`'`, `--`, `;`, etc.).

**Cambios:**
- Backend: validar `q` en el view (regex `^[\w\sáéíóúñÁÉÍÓÚÑ.,_-]{0,100}$`). Si no matchea, devolver `400` limpio (mejor que el cliente envíe SQL-like a CF y que CF bloquee).
- Frontend: misma validación en el campo de búsqueda antes de enviar (UX: avisar "carácter no permitido en búsqueda").

### 2.4 Subidas de archivos: validación previa

Endpoints multipart (`soporte/views.py:265-330,453-507`, `desarrollo/views.py:82-120`, `compras/views.py:139-193,196-263`, `administracion/views.py:45-100`) actualmente no validan MIME del lado cliente — WAF puede bloquear binarios "raros".

**Cambios:**
- Frontend: validar MIME y tamaño antes de subir; rechazar con mensaje claro si no es `application/pdf`, `image/*`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, etc.
- Backend: validar MIME real (no solo extensión) con `python-magic` o equivalente; rechazar 415 si no matchea.
- Considerar **chunked upload** para archivos >5MB (ej: `tus.io` o split manual en chunks de 1MB). CF tiende a inspeccionar/bloquear uploads grandes monolíticos.

---

## FASE 3 — Defensa en profundidad

### 3.1 Throttle local DRF

**Archivo:** `backend/config/settings.py:148-159` (sección `REST_FRAMEWORK`).

Hoy no hay throttling local — la app depende 100% de CF. Si CF se desactiva o falla "abierto", el backend queda expuesto a brute force.

**Cambios:**
- Agregar `DEFAULT_THROTTLE_CLASSES`:
  - `AnonRateThrottle`: `60/min` (general para no autenticados).
  - `UserRateThrottle`: `300/min` (autenticados).
- `DEFAULT_THROTTLE_RATES` con un scope especial:
  - `'login'`: `5/min` → aplicarlo en `LoginView` con `throttle_classes = [ScopedRateThrottle]` y `throttle_scope = 'login'`.
  - `'password_reset'`: `3/min`.
  - `'activate'`: `5/min`.

**Archivo nuevo:** `backend/auth_erp/throttles.py`

Crear `LoginRateThrottle` que use `email+CF-Connecting-IP` como cache key (en vez de solo IP). Eso evita que un atacante con muchas IPs (botnet) burle el throttle, y permite que múltiples usuarios detrás de un mismo NAT no se afecten entre sí.

Requiere caché funcional — el stack ya tiene Redis (`docker-compose.prod.yml:23-26`), así que configurar `CACHES['default']` en `settings.py` apuntando a `redis://redis:6379/1` (DB 1 para no chocar con Celery en DB 0).

### 3.2 Retry selectivo en el cliente

**Archivo:** `frontend/src/api.js:13-46`

Hoy solo hay retry para 401 (refresh token). Agregar:
- Retry automático **una sola vez** con backoff de 1s para status `502/503/504` (errores transitorios de borde).
- **No reintentar** 4xx (incluido 403, 429) — un 403 reintentado dispara más fuerte al WAF.
- Respetar el header `Retry-After` si viene.

### 3.3 Exception handler con observabilidad

Ver Fase 1.2 — el `exception_handler.py` también captura el contexto del request en estructuras logueables (no solo el traceback). Esto ya queda cubierto allá.

### 3.4 Tests de regresión

**Archivo nuevo:** `backend/auth_erp/tests/test_cloudflare_adapt.py`

- Test del middleware IP: simular request con `HTTP_CF_CONNECTING_IP` → assert `request.META['REMOTE_ADDR']` correcto.
- Test del throttle de login: 6 POSTs en 1 minuto al mismo email → último devuelve 429.
- Test de validación de query: `q='; DROP TABLE--` → 400 limpio (no llega al ORM).
- Test del exception handler: forzar excepción → assert log incluye `cf_ray`.

---

## Archivos a crear / modificar

### Nuevos
- `backend/auth_erp/middleware.py` — `CloudflareIPMiddleware`
- `backend/auth_erp/throttles.py` — `LoginRateThrottle` y otros scoped
- `backend/config/exception_handler.py` — DRF custom handler con CF-Ray
- `backend/auth_erp/tests/test_cloudflare_adapt.py` — tests
- `frontend/src/hooks/useTurnstile.js` — extraer del componente `LoginPage` (reutilizable)
- `frontend/src/components/PasswordResetPage.jsx` (si no existe) — formulario con Turnstile
- `frontend/src/components/ActivateAccountPage.jsx` (si no existe) — formulario con Turnstile

### Modificados
- `backend/config/settings.py` — middleware, throttle, CORS headers, LOGGING, CACHES, EXCEPTION_HANDLER
- `backend/auth_erp/views.py` — Turnstile en endpoints públicos extra, throttle_scope en login/reset/activate
- `backend/compras/views.py` — validación de `q` en list endpoints
- `backend/soporte/views.py` — validación MIME en uploads + validación `q` en list
- `backend/desarrollo/views.py` — validación MIME en upload de planos
- `backend/administracion/views.py` — validación MIME en validar anticipo
- `frontend/src/api.js` — Accept/X-Requested-With headers, manejo 403/HTML, retry 5xx
- `frontend/src/components/LoginPage.jsx` — usar nuevo hook, mostrar cf-ray en errores, reset Turnstile en todo error
- `frontend/src/contexts/AuthContext.jsx` — propagar metadata de errores CF
- `frontend/nginx.conf` — verificar que se propaga `cf-ray`, `cf-connecting-ip`, `cf-ipcountry` (hoy `proxy_set_header Host $host` está OK pero conviene agregar explícitos)

### Sin tocar (porque dependen de acceso a CF)
- Cualquier configuración del panel de Cloudflare (skip rules, Bot Fight Mode, Rate Limiting Rules, WAF managed rules). Quedan documentadas como **acción pendiente cuando se tenga acceso**.

---

## Verificación end-to-end

1. **Build & deploy local** (rebuild backend + frontend con `docker compose -f docker-compose.prod.yml up -d --build`).
2. **Smoke test del flujo de login completo**:
   - Desde el navegador, abrir `https://erp.sibotec.com.ar`, intentar login con `gonzaesc2303@gmail.com / Sibotec2026!`.
   - **Si funciona** → confirmar que `must_change_credentials` redirige al cambio de contraseña.
   - **Si sigue 403** → abrir DevTools → Network → click en `login/` → verificar que la respuesta ahora muestra el `cf-ray` capturado por el frontend, con mensaje claro al usuario.
3. **Test del middleware IP**:
   - `curl -H "CF-Connecting-IP: 1.2.3.4" http://localhost:8000/api/v1/auth/login/ -d ...` desde dentro del container backend → verificar que el log de Django registra `1.2.3.4` y no la IP del proxy nginx.
4. **Test del throttle de login**:
   - 6 POSTs seguidos a login con contraseña incorrecta → último responde **429** (no 401, no 403).
5. **Tests automatizados**: `pytest backend/auth_erp/tests/test_cloudflare_adapt.py` debe pasar.
6. **Validación de búsqueda**: `GET /api/v1/compras/proveedores/?q=%27;DROP--` → 400 con `{"detail":"Parámetro de búsqueda inválido"}`.
7. **Upload con MIME inválido**: subir `.exe` a `/api/v1/soporte/tickets/<id>/attachments/` → 415.

---

## Riesgos y trade-offs

- **No garantiza resolver el 403 sin acceso a CF.** Si la regla activa es `Block explícito por managed rule`, la app no puede saltearla; solo puede mitigar y observar mejor.
- **Turnstile en más endpoints rompe flujos de scripts/curl** que hoy funcionaban (ej: scripts de migración que llaman a `password-reset/`). Si existen, hay que excluirlos o pasarles un mecanismo de bypass autenticado.
- **Throttle más estricto puede afectar QA / pentest interno** durante test masivo. Recomendación: throttle parametrizado por env var (`LOGIN_RATE_LIMIT`) para poder relajarlo en staging.
- **Validación estricta de query strings** puede rechazar búsquedas legítimas con caracteres regionales raros. Lista blanca documentada y revisada con el usuario antes de aplicar.
- **Costo de cambio:** ~3-5 días dev + testing. La Fase 1 sola se puede hacer en ~1 día y ya destraba la diagnosis.

---

## Próximo paso recomendado

Empezar por **Fase 1 completa** (observabilidad + UX) — es chica, no rompe nada, y la información que devuelve (`cf-ray` visible al usuario, logs con IP real) permite que aun sin acceso a CF, alguien con acceso pueda buscar el evento puntual en CF Security Events por `cf-ray` y resolver el bloqueo en minutos. Fase 2 y 3 quedan para después de confirmar que Fase 1 destrabó la diagnosis.
