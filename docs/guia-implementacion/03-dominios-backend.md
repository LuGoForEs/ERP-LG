# ERP-LG — Guía de Implementación
## Capítulo 3: Dominios del Backend (Lógica de Negocio)

---

## 3.1 Arquitectura por Dominios

ERP-LG implementa la lógica de negocio segmentada en 6 áreas principales (dominios). Cada dominio controla un fragmento del ciclo de vida de una **Orden de Fabricación (OF)**. A continuación, se detalla el alcance y las reglas duras de negocio de cada uno.

---

## 3.2 Comercial (`comercial/`)

Es el punto de entrada de la demanda al sistema.

* **Responsabilidades:** Crear, editar y listar OFs. Gestionar anticipos de clientes. Consultar el "Timeline" general de una OF.
* **Reglas de Negocio:**
  * Una OF nace en estado `pendiente`.
  * No puede avanzar a `iniciada` si no tiene la fecha de entrega definida.
  * El modelo expone propiedades analíticas (costos totales, rentabilidad) que consultan datos en tiempo real cruzando a los otros dominios (Compras, Producción).
* **Endpoint clave:** `POST /api/comercial/ordenes-fabricacion/{id}/iniciar/`
  * Cambia el estado a `iniciada`.
  * Habilita a la oficina técnica (Desarrollo) para comenzar a trabajar en esa OF.

---

## 3.3 Desarrollo Técnico (`desarrollo/`)

Oficina de ingeniería y diseño.

* **Responsabilidades:** Subir planos, crear Pedidos de Material (PM) para Compras.
* **Reglas de Negocio:**
  * Un PM (Pedido Material) solo puede crearse si la OF referenciada está `iniciada`.
  * Los planos se suben en formato PDF/Imagen a través de endpoints `multipart/form-data`.
  * Los pedidos de material nacen en estado `borrador`.
* **Endpoint clave:** `POST /api/desarrollo/pedidos-material/{id}/aprobar/`
  * Verifica que el PM tenga al menos 1 ítem (detalle).
  * Transiciona el estado a `aprobado`, haciéndolo visible y procesable para el departamento de Compras.

---

## 3.4 Compras (`compras/`)

Gestión de la cadena de suministro.

* **Responsabilidades:** ABM de Insumos y Proveedores. Generar Órdenes de Compra (OC) y registrar Facturas de Compra (FC).
* **Reglas de Negocio:**
  * Una OC nace `borrador`. Al marcarse como `emitida`, consolida los `MaterialCompra` que espera recibir.
  * Las `FacturaCompra` se asocian a una OC emitida. Un trigger interno recalcula los costos reales vs presupuestados.
  * *Los insumos (Insumo) son entidades maestras que se referencian también en Pañol.*

---

## 3.5 Pañol / Inventario (`panol/`)

Control físico de almacén y bodegas.

* **Responsabilidades:** Registrar ingresos (remitos de proveedor). Gestionar niveles de `Stock`. Auditar `Movimiento` (entradas y salidas de inventario).
* **Reglas de Negocio:**
  * La tabla `Stock` mantiene una relación `OneToOne` con `Insumo` del dominio de compras. Actúa como una "billetera" o consolidado del inventario.
  * Todo incremento o decremento del stock **debe estar respaldado por un registro en `MovimientoItem`**. No se puede mutar la cantidad de Stock directamente.
* **Endpoint clave:** `POST /api/panol/ingresos/`
  * Transacción atómica. Crea un remito de entrada y en el mismo bloque genera un Movimiento de tipo `ENTRADA`, sumando físicamente las cantidades en la tabla `Stock`.

---

## 3.6 Producción (`produccion/`)

Ejecución física en el taller de fábrica.

* **Responsabilidades:** Administrar Lotes de fabricación para una OF. Registrar consumos.
* **Reglas de Negocio:**
  * Una OF puede dividirse en `N` lotes.
  * Para que un Lote pase a `mecanizado` (en proceso), el sistema intenta consumir los materiales declarados en su composición de las existencias en Pañol (crea un Movimiento tipo `SALIDA`). Si no hay stock, el Lote no puede avanzar.
  * Un Lote finalizado no puede volver atrás a un estado en proceso.
* **Endpoint clave:** `POST /api/produccion/lotes/{id}/avanzar_fase/`
  * Ejecuta la máquina de estados estricta: `creado` -> `corte` -> `mecanizado` -> `soldadura` -> `pintura` -> `terminado`.

---

## 3.7 Logística (`logistica/`)

Distribución y entrega final.

* **Responsabilidades:** Armar Despachos (remitos de remisión) y asociarlos a los Lotes terminados para mandarlos al cliente.
* **Reglas de Negocio:**
  * Solo se pueden añadir Lotes en estado `terminado` a un Despacho.
  * Al ejecutar el Despacho, se revisa la OF asociada. Si la OF ya tiene el 100% de la cantidad pedida entregada a través de distintos despachos, el dominio de Logística llama automáticamente a la capa Comercial para cerrar la OF (pasarla a `completada`).
* **Endpoint clave:** `POST /api/logistica/despachos/{id}/ejecutar/`
  * Transacción atómica que sella el despacho, marca los lotes como despachados y audita la clausura de la OF principal.
