# ERP-LG — Manual de Referencia Técnica
## Capítulo 5: Arquitectura del Frontend

---

## 5.1 Estructura y Responsabilidades de Componentes

El frontend está desarrollado en **React 18** utilizando **Vite** como bundler. La arquitectura sigue un patrón de "Componentes de Panel", donde cada dominio de negocio (Comercial, Compras, Pañol, etc.) tiene un componente padre de alto nivel que gestiona todo el estado y renderizado de ese contexto.

* `App.jsx`: Componente raíz. Maneja el layout principal (barra lateral, canvas de fondo) y la lógica de enrutamiento.
* `components/`: Contiene los paneles por dominio (`ComercialPanel.jsx`, `ComprasPanel.jsx`, etc.) y utilidades visuales compartidas (`LetterGlitch.jsx`).
* `main.jsx`: Punto de entrada de React, donde se monta la aplicación en el DOM.

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

## 5.5 LetterGlitch: Efecto Canvas 2D

El componente `LetterGlitch.jsx` es responsable del fondo animado corporativo.

* **Implementación:** Utiliza la API nativa de `<canvas>` y renderizado 2D en lugar de animaciones CSS complejas.
* **Desempeño:** Usa `requestAnimationFrame` para sincronizarse con la tasa de refresco del monitor, minimizando el consumo de CPU.
* **HiDPI Handling:** Implementa un factor de escala (`window.devicePixelRatio`) para asegurar que el texto no se vea borroso en pantallas Retina o 4K.
