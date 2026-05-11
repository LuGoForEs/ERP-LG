# ERP-LG — Manual de Referencia Técnica
## Capítulo 5: Arquitectura del Frontend

---

## 5.1 Estructura y Responsabilidades de Componentes

El frontend está desarrollado en **React 18** utilizando **Vite** como bundler. La arquitectura sigue un patrón de "Componentes de Panel", donde cada dominio de negocio (Comercial, Compras, Pañol, etc.) tiene un componente padre de alto nivel que gestiona todo el estado y renderizado de ese contexto.

* `App.jsx`: Componente raíz. Maneja el layout principal (barra lateral, canvas de fondo) y la lógica de enrutamiento.
* `components/`: Contiene los paneles por dominio (`ComercialPanel.jsx`, `AdminPanel.jsx`, `ComprasPanel.jsx`, etc.) y utilidades visuales compartidas (`LetterGlitch.jsx`).
* `main.jsx`: Punto de entrada de React, donde se monta la aplicación en el DOM.

**Responsabilidades por panel relevantes a esta sesión:**

| Panel | Cambios implementados |
|-------|----------------------|
| `ComercialPanel.jsx` | Formulario "Nueva OF" incluye campo `plazo_anticipo_dias` (días para pago). El detalle de OF muestra `responsable_nombre` y `plazo_anticipo_dias`. |
| `AdminPanel.jsx` | Tab "Anticipos": lista separada en **Pendientes / Validados / Rechazados** (antes era Pendientes + Procesados juntos). Tab "Despachos": autorización incluye upload de `comprobante_saldo`. Tab nueva **"Obras finalizadas"**: muestra cards con comprobante de anticipo y comprobante de saldo por cada despacho ejecutado. |
| `LogisticaPanel.jsx` | Dropdown "Nuevo despacho" incluye lotes en estado `terminado` **y** `en_despacho` (antes solo `terminado`). Los lotes con despacho activo (no rechazado) se excluyen del dropdown. |

---

## 5.2 Routing Condicional sin React Router

Se tomó una decisión consciente de **no utilizar `react-router-dom`**. En su lugar, el enrutamiento se maneja mediante estado local (`activeTab`) en `App.jsx`.

**Tradeoffs analizados:**
* **Ventajas:** 
  * Simplifica la curva de aprendizaje inicial.
  * Reduce el tamaño del bundle.
  * Ideal para Single Page Applications (SPAs) tipo "dashboard" donde la URL compartible no es un requerimiento crítico para los paneles internos.
* **Desventajas:**
  * No hay soporte para botones "Atrás/Adelante" del navegador.
  * No se pueden compartir enlaces directos a una OF específica.
  * Implica montar y desmontar paneles completamente al cambiar de tab, perdiendo estado local a menos que se eleve al `App.jsx`.

---

## 5.3 Healthchecks: `fetchStatuses()`

Para mejorar la resiliencia del sistema y la UX, `App.jsx` implementa una función `fetchStatuses()` que realiza *polling* a los endpoints principales de cada panel al cargar la aplicación.

* **Funcionamiento:** Intenta hacer solicitudes `GET` rápidas. Si fallan (o el backend está caído temporalmente), marca el módulo como "Offline" en la UI.
* **Propósito:** Prevenir que el usuario ingrese a un panel que depende de una base de datos caída y experimente un error blanco ("White Screen of Death").

---

## 5.4 Proxy de Vite y Contenedores Docker

Durante el desarrollo local mediante `npm run dev`, Vite sirve los archivos en `localhost:5173`. Sin embargo, el backend Django corre en `localhost:8000`.

**El Problema:**
Las políticas de CORS bloquearían las peticiones si el frontend hiciera fetch directamente a `http://localhost:8000/api/...`. Además, harcodear el puerto del backend es frágil.

**La Solución:**
En `vite.config.js` se configura un proxy:
```javascript
server: {
  proxy: {
    '/api': 'http://backend:8000',
    '/media': 'http://backend:8000'
  }
}
```
Esto permite que el frontend solicite datos usando paths relativos (`/api/comercial/...`) y Vite redirija transparentemente la petición al contenedor de Django (resuelto internamente en Docker como `backend:8000`).

---

## 5.5 Sistema de Primitivas (`primitives.jsx`)

Todos los paneles importan un conjunto de componentes base desde `src/components/primitives.jsx`. Esto garantiza consistencia visual sin dependencias externas de UI:

| Primitiva | Descripción |
|-----------|-------------|
| `DataTable` | Tabla con columnas ordenables (`sortable: true` + `accessor`), selección de fila, y renderizado de expansión por fila (`renderExpanded`). |
| `Card` / `CardHeader` / `CardTitle` | Contenedor con borde y fondo zinc. `CardHeader` usa `flex items-center gap-2`. |
| `Metric` | Card de métrica con ícono, valor numérico y acento de color. |
| `Button` | Botón con variantes de acento (`rose`, `amber`, `emerald`, etc.) e ícono opcional. |
| `Field` / `Input` / `Select` | Controles de formulario estilizados. |
| `EstadoBadge` | Badge de estado con color según valor de cadena. |
| `useToast` | Hook para mostrar notificaciones efímeras en pantalla. |
| `useSearchShortcut` | Hook que captura el shortcut `/` del teclado para enfocar el campo de búsqueda. |
| `ModuleHeader` | Header de módulo con título, subtítulo y slot de acciones (búsqueda, botones). |
| `EmptyState` | Placeholder cuando una tabla no tiene datos. |
| `Icon` | Wrapper sobre SVG icons (`search`, `truck`, `alert`, `check-circle`, `package`, `x`, `arrow-right`, `upload`). |

**Nota de diseño:** Cuando `CardHeader` no da el layout necesario (ej. texto largo + botón de cierre en la misma fila), reemplazar con un `<div className="flex items-start justify-between px-4 py-3 border-b border-zinc-800">` y usar `min-w-0 flex-1` en el contenedor de texto y `shrink-0 ml-2` en el botón.

---

## 5.6 Flujo de Producción en el Frontend

`ProduccionPanel.jsx` implementa el flujo de 5 estados con las siguientes reglas:

- **`ProgresoEstados`** es un componente controlado: recibe `activeKey` y `onActiveKeyChange` desde el padre. Los estados con observaciones registradas muestran un punto `·` y son clicables (toggle); los estados futuros son visualmente atenuados y no responden al clic.
- La observación seleccionada se renderiza **fuera** del contenedor `overflow-x-auto` de la barra de progreso, para que sea siempre visible al desplazarse horizontalmente.
- Los botones de estado usan `aria-disabled` en lugar de `disabled` para evitar el bug de Firefox donde `disabled` dentro de `overflow: auto` bloquea eventos de clic.
- El scrollbar del contenedor se estiliza con `::-webkit-scrollbar` (Chrome/Safari) y `scrollbar-width/color` inline (Firefox) para integrarse con la paleta zinc del sistema.

---

## 5.7 Lógica de Disponibilidad de Lotes en Logística

El dropdown "Nuevo despacho" en `LogisticaPanel.jsx` calcula los lotes disponibles en el momento de carga del componente:

```javascript
const occupiedLoteIds = new Set(
  desps.filter(d => d.estado !== 'rechazado').map(d => d.lote_id)
);
setLotes(lotesData.filter(l =>
  (l.estado === 'terminado' || l.estado === 'en_despacho') &&
  !occupiedLoteIds.has(l.id)
));
```

**Por qué incluir `en_despacho`:** Un lote puede llegar a `en_despacho` por dos caminos:
1. Producción lo avanzó hasta ahí via `avanzar_estado` (el último step del workflow de Producción).
2. Logística creó un despacho y el backend lo marcó como `en_despacho`.

En el caso 1, el lote no tiene despacho y debe aparecer en el dropdown. En el caso 2, el lote ya tiene un despacho activo y se excluye vía `occupiedLoteIds`.

**Manejo de rechazo:** Si un despacho está `rechazado`, el lote queda fuera de `occupiedLoteIds` y vuelve a aparecer disponible para un nuevo intento.

---

## 5.8 Patrón de Descarga de Archivos Protegidos

Los endpoints de descarga PDF (`/planos/{id}/archivo`, `/facturas/{id}/pdf`) requieren el header `Authorization`. El helper `downloadBlob(path)` en `api.js` encapsula este patrón:

```javascript
// api.js
async function downloadBlob(path) {
  let res = await fetch(`${BASE}${path}`, makeOpts(_accessToken));
  if (res.status === 401) {
    const newToken = await _tryRefresh();
    if (newToken) res = await fetch(`${BASE}${path}`, makeOpts(newToken));
  }
  if (!res.ok) throw new Error(...);
  return res.blob();
}
```

Los paneles que necesitan abrir un PDF:

```javascript
const blob = await api.desarrollo.downloadPlano(id); // o api.compras.downloadFacturaPdf(id)
const url = URL.createObjectURL(blob);
window.open(url, '_blank');
setTimeout(() => URL.revokeObjectURL(url), 30000);
```

---

## 5.9 Upload de Archivos desde el Frontend

Dos operaciones del sistema envían archivos vía `multipart/form-data`:

| Operación | Panel | Campo | Endpoint |
|-----------|-------|-------|----------|
| Comprobante de anticipo | `AdminPanel.jsx` | `archivo` (FileInput) | `PUT /administracion/anticipos/{id}/validar` |
| Comprobante de saldo | `AdminPanel.jsx` | `comprobanteSaldo` (FileInput) | `PUT /administracion/despachos/{id}/aprobar` |

**Patrón de envío:**

```javascript
// AdminPanel.jsx — handleAprobarDespacho
const fd = new FormData();
fd.append('aprobado', aprobado ? 'true' : 'false');
fd.append('observacion', obsDespacho);
if (comprobanteSaldo) fd.append('comprobante_saldo', comprobanteSaldo);
await api.administracion.aprobarDespacho(selectedDespacho.id, fd, true);
// El tercer argumento `true` indica isFormData en api.js → no se serializa a JSON
```

La función `request()` de `api.js` detecta `isFormData=true` y omite el header `Content-Type: application/json`, dejando que el navegador establezca `multipart/form-data` con el boundary correcto automáticamente.

---

## 5.10 LetterGlitch: Efecto Canvas 2D

El componente `LetterGlitch.jsx` es responsable del fondo animado corporativo.

* **Implementación:** Utiliza la API nativa de `<canvas>` y renderizado 2D en lugar de animaciones CSS complejas.
* **Desempeño:** Usa `requestAnimationFrame` para sincronizarse con la tasa de refresco del monitor, minimizando el consumo de CPU.
* **HiDPI Handling:** Implementa un factor de escala (`window.devicePixelRatio`) para asegurar que el texto no se vea borroso en pantallas Retina o 4K.
