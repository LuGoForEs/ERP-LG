# ERP-LG — Guía de Implementación
## Capítulo 4: Frontend y Componentes React

---

## 4.1 Anatomía de un Panel (Caso: `ComprasPanel.jsx`)

Para comprender cómo está estructurado el código de interfaz de usuario de ERP-LG, tomaremos como ejemplo `ComprasPanel.jsx`. Cada panel en el sistema sigue un flujo de vida de 3 pasos: Estado, Fetch y Render.

### 1. Manejo de Estado (State)
El componente inicializa múltiples variables de estado para almacenar datos de la API (`ordenes`, `proveedores`, `insumos`), manejar modales (`showModal`), y controlar feedback visual (`error`, `loading`).

```javascript
const [ordenes, setOrdenes] = useState([]);
const [loading, setLoading] = useState(true);
```

### 2. Fetching de Datos (Effect)
Se usa `useEffect` para cargar datos iniciales. El patrón adoptado es definir funciones asíncronas (`fetchData`) dentro del efecto o memoizadas con `useCallback`.

```javascript
useEffect(() => {
  const loadData = async () => {
    try {
      const resp = await fetch('/api/compras/ordenes-compra/');
      setOrdenes(await resp.json());
    } catch (err) {
      setError("No se pudo cargar.");
    } finally {
      setLoading(false);
    }
  };
  loadData();
}, []);
```

### 3. Renderizado y Formularios (Render)
El componente principal retorna una grilla o tabla de listado, y gestiona diálogos o formularios integrados para el ABM (Alta, Baja y Modificación).

---

## 4.2 Autocomplete con Debounce Manual

En áreas como "Asignar Insumo" o "Buscar Cliente", se optó por implementar autocompletado sin depender de librerías externas voluminosas (como `react-select`).

**Desafío:**
Consultar a la API por cada tecla presionada satura el servidor (ej. escribir "Tornillo" genera 8 peticiones).

**Solución (Debouncing Manual):**
```javascript
const [searchTerm, setSearchTerm] = useState('');
const [results, setResults] = useState([]);

useEffect(() => {
  // Configura un timer
  const timerId = setTimeout(() => {
    if (searchTerm.length > 2) {
      fetch(`/api/compras/insumos/?search=${searchTerm}`)
        .then(res => res.json())
        .then(data => setResults(data));
    }
  }, 500); // Espera 500ms de inactividad

  // Cleanup function: se ejecuta si el usuario sigue escribiendo
  return () => clearTimeout(timerId);
}, [searchTerm]);
```

---

## 4.3 `FormData` vs `JSON` en Requests

Al interactuar con la API de DRF desde React, ERP-LG utiliza dos formatos de carga útil diferentes dependiendo de la naturaleza del dato:

### JSON (Caso de uso típico)
Se emplea para enviar datos de texto estructurado.
* **Cuándo usarlo:** Crear una OF, aprobar un pedido, actualizar estados.
* **Ventaja:** DRF procesa JSON nativamente y lo valida rápido.
* **Requisito:** Se debe incluir explícitamente el header `Content-Type: application/json`.

### FormData (El caso `DesarrolloPanel`)
Se emplea en `DesarrolloPanel.jsx` para la subida de planos.
* **Cuándo usarlo:** Cuando el request incluye archivos binarios (`<input type="file" />`).
* **Ventaja:** Permite subir archivos mediante `multipart/form-data`.
* **Requisito:** **NO** se debe setear el header `Content-Type`. `fetch` junto con el navegador calcularán automáticamente el `boundary` del multipart. Si lo fuerzas, la subida fallará en Django.

```javascript
// Ejemplo correcto para subir plano
const formData = new FormData();
formData.append('of', ofId);
formData.append('archivo_pdf', fileInput.current.files[0]);

await fetch('/api/desarrollo/planos/', {
  method: 'POST',
  body: formData // No hay headers manuales
});
```

---

## 4.4 Tablas Inline Editables (Líneas de Detalle)

En procesos de negocio como la creación de un `PedidoMaterial` o una `OrdenCompra`, es necesario gestionar "Líneas de Detalle" (Items) dinámicas.

**Enfoque de Implementación:**
1. Mantener un estado con un arreglo de objetos de línea.
   ```javascript
   const [items, setItems] = useState([{ insumo_id: '', cantidad: 1 }]);
   ```
2. Botón "Agregar Línea" que hace push (`[...items, { ... }]`) al arreglo.
3. Función generadora de `onChange` para actualizar una fila específica usando su índice (`idx`).

```javascript
const handleItemChange = (idx, field, value) => {
  const newItems = [...items];
  newItems[idx][field] = value;
  setItems(newItems);
};
```
4. Renderizar las filas con `.map()`, utilizando el índice como `key` (sólo aceptable si no se permite reordenamiento de filas, de lo contrario, usar IDs temporales únicos como `crypto.randomUUID()`).
