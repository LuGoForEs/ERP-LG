# ERP-LG — Guía de Implementación
## Capítulo 6: Apéndices y Ejercicios Prácticos

---

## 6.1 Glosario Técnico

* **OF (Orden de Fabricación):** Entidad raíz del sistema. Documento que dispara todo el proceso de manufactura.
* **PM (Pedido de Material):** Solicitud interna de la oficina técnica (Desarrollo) hacia el sector de Compras indicando qué insumos se necesitan para una OF.
* **OC (Orden de Compra):** Documento legal vinculante emitido por Compras hacia un Proveedor externo.
* **Lote:** Unidad mínima de producción en planta. Una OF puede dividirse en varios lotes por cuestiones de capacidad de maquinaria.
* **Bounded Context:** Concepto de DDD. Frontera lógica donde un modelo de dominio particular es definido y aplicable (ej. "Stock" significa una cosa en Pañol, y "Material" significa otra en Compras).
* **DRF (Django REST Framework):** Librería utilizada para exponer las entidades de Django como APIs JSON.
* **Vite:** Herramienta de *build* de frontend, utilizada en lugar de Create React App o Webpack por su extrema velocidad y recarga en caliente (HMR).

---

## 6.2 Convenciones del Proyecto

Mantener un estándar de código es fundamental para la supervivencia del proyecto a largo plazo. ERP-LG sigue estas convenciones estrictas:

1. **Nombres de Archivos:** `snake_case` para backend (`models.py`, `views.py`), y `PascalCase` para componentes de React (`ComprasPanel.jsx`).
2. **Nombres de Tablas (`db_table`):** Siempre deben definirse explícitamente en la clase `Meta` del modelo, usando el prefijo del dominio. Ejemplo: `db_table = 'comercial_orden_fabricacion'`. Esto evita el autogenerado oscuro de Django y facilita consultas SQL directas.
3. **Conventional Commits:** Los mensajes de commit deben seguir la semántica: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
4. **Idioma del Código:** Variables, clases y comentarios de negocio se escriben en **Español** para alinear el software con el dominio real de los usuarios de la fábrica. Sin embargo, variables técnicas, sintaxis y verbos HTTP (ej. `GET`, `POST`, `request`, `response`) permanecen en Inglés.

---

## 6.3 Ejercicios de Implementación para Alumnos

Estos ejercicios están diseñados para probar la comprensión de la arquitectura del ERP-LG. Se recomienda crear una rama paralela (`git checkout -b feature/ejercicios`) antes de realizarlos.

### Ejercicio 1: Migración de Datos Real (RunPython)
**Objetivo:** Resolver la deuda técnica del `null=True` en las Foreign Keys introducidas durante la normalización (Ver [Modelo de Datos - Deuda Técnica](../manual-referencia/03-modelo-datos.md)).
**Plan sugerido:**
1. Crear una migración vacía en el dominio `compras`: `python manage.py makemigrations compras --empty`.
2. Escribir una función `poblar_proveedor_id(apps, schema_editor)` que lea todas las `FacturaCompra` existentes, busque el `Proveedor` basado en algún dato legacy (o asigne un proveedor genérico "A Determinar"), y guarde la relación.
3. Usar `migrations.RunPython(poblar_proveedor_id)` dentro de la lista de `operations`.
4. Crear una tercera migración que altere el campo `proveedor` en `FacturaCompra` para establecer `null=False`.

### Ejercicio 3: Procesamiento Asíncrono con Celery + Redis
**Objetivo:** Evitar que la UI se congele si procesar una Factura de Compra toma varios segundos (simulando envío de emails o generación de PDFs).
**Plan sugerido:**
1. Agregar dos contenedores nuevos al `backend/docker-compose.yml`: uno para `redis` (broker) y otro para el *worker* de `celery`.
2. Configurar Celery en `config/celery.py`.
3. Extraer la lógica pesada del método `POST` de `/api/compras/facturas/` a una `@shared_task` llamada `procesar_factura_task.delay(factura_id)`.
4. Actualizar el endpoint para que devuelva un `202 Accepted` inmediatamente, mientras el worker hace el trabajo en segundo plano.
