# ERP-LG — Guía de Implementación
## Capítulo 2: Anatomía del Backend (Django + DRF)

---

## 2.1 Estructura de una Aplicación Django (Dominio)

En la arquitectura de ERP-LG, un Bounded Context (ej. `comercial`, `compras`, `produccion`) se modela como una "App" de Django. Cada dominio contiene un conjunto estandarizado de archivos con responsabilidades bien definidas.

```text
backend/comercial/
├── __init__.py
├── admin.py       # Registro de modelos en el panel de administrador nativo de Django
├── apps.py        # Configuración de la app (nombre, verbose name)
├── factories.py   # Factory Boy: Generadores de datos falsos para testing
├── models.py      # Definición de entidades (Tablas, ORM)
├── serializers.py # Transformación de objetos Django (Modelos) a/desde JSON
├── tests.py       # Pruebas unitarias del dominio con pytest
├── urls.py        # Rutas locales (Endpoints) de la API
└── views.py       # Lógica de negocio (ViewSets) y control de requests HTTP
```

---

## 2.2 Flujo de Datos HTTP a Base de Datos

Cuando el frontend realiza un `POST /api/comercial/ordenes-fabricacion/`:

1. **Enrutamiento (`config/urls.py` -> `comercial/urls.py`):**
   La petición entra por la raíz del proyecto y se deriva al archivo `urls.py` del dominio `comercial`, el cual mapea la URL al `OrdenFabricacionViewSet`.
   
2. **Controlador (`views.py`):**
   El ViewSet recibe la petición HTTP. Extrae el `request.data` (payload JSON).
   
3. **Validación y Serialización (`serializers.py`):**
   El ViewSet instancia el serializador `OrdenFabricacionSerializer(data=request.data)`.
   * El serializador ejecuta validaciones de tipo (ej. que la cantidad sea entera).
   * Lanza un error HTTP 400 (`serializers.ValidationError`) automáticamente si el JSON es inválido.
   
4. **Persistencia (`models.py`):**
   Si es válido, se invoca `serializer.save()`. El ORM de Django traduce los datos a una sentencia SQL `INSERT` y los guarda en la tabla `comercial_orden_fabricacion` de MariaDB.

5. **Respuesta (`views.py`):**
   El ViewSet devuelve un objeto `Response` con los datos serializados del registro recién creado y un HTTP Status Code `201 Created`.

---

## 2.3 Patrones de Implementación

### 2.3.1 Modelos: Propiedades y Meta
```python
class Anticipo(models.Model):
    orden_fabricacion = models.ForeignKey('comercial.OrdenFabricacion', on_delete=models.CASCADE)
    monto = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'comercial_anticipo' # Convención: siempre especificar tabla
        
    @property
    def moneda_simbolo(self):
        return "$" # Lógica puramente calculada, no en la DB
```

### 2.3.2 Serializadores: Relaciones Anidadas vs Planas
Para listar registros (`GET`), solemos incluir datos anidados usando `SerializerMethodField` o serializadores embebidos.
Para crear (`POST`), solemos aceptar solo `IDs` de relaciones (ForeignKeys).

*Por esto, en algunos dominios existen múltiples serializadores para el mismo modelo (ej. `OrdenFabricacionSerializer` para lectura y `OrdenFabricacionCreateSerializer` para escritura).*

### 2.3.3 Vistas (ViewSets) y Acciones Personalizadas
Un `ModelViewSet` abstrae el CRUD básico. Sin embargo, la lógica de negocio (máquinas de estado) se implementa utilizando el decorador `@action`.

```python
from rest_framework.decorators import action
from rest_framework.response import Response

class OrdenFabricacionViewSet(viewsets.ModelViewSet):
    queryset = OrdenFabricacion.objects.all()
    serializer_class = OrdenFabricacionSerializer

    @action(detail=True, methods=['post'])
    def iniciar(self, request, pk=None):
        of = self.get_object()
        
        # 1. Validar precondiciones
        if of.estado != 'pendiente':
            return Response({"error": "OF no está pendiente"}, status=400)
            
        # 2. Lógica
        of.estado = 'iniciada'
        of.save()
        
        return Response({"status": "OF Iniciada"})
```

### 2.3.4 Consultas Cruzadas (Cross-Domain)
Un dominio NO debe alterar el estado interno de otro de manera arbitraria. 
Si el dominio `comercial` necesita datos del dominio `compras`, debe importar el modelo, pero no sobre-escribir su lógica.

```python
# Dentro de comercial/views.py
from compras.models import FacturaCompra

# Lectura permitida:
facturas = FacturaCompra.objects.filter(orden_compra__pedido_material_item__pedido_material__of=mi_of)
```
*Django ORM permite cruzar múltiples ForeignKeys anidadas usando la sintaxis del doble guión bajo `__`.*