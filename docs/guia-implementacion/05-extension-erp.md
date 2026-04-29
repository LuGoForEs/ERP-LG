# ERP-LG — Guía de Implementación
## Capítulo 5: Extender el ERP (Añadir un Nuevo Dominio)

---

## 5.1 Guía Paso a Paso

Si el ERP necesita integrar un nuevo sector de la empresa (por ejemplo, "Recursos Humanos" o "Mantenimiento"), el proceso para crear un nuevo dominio e integrarlo al ecosistema consta de los siguientes pasos:

### 1. Inicializar la app de Django
Desde el contenedor de backend, ejecutar el comando `startapp`:
```bash
docker exec -it erp-backend python manage.py startapp recursos_humanos
```

### 2. Configurar el Dominio en Django
Agregar la nueva app a `INSTALLED_APPS` en `config/settings.py`:
```python
INSTALLED_APPS = [
    # ... apps por defecto
    'comercial',
    'compras',
    'recursos_humanos', # Nuevo dominio
]
```

### 3. Diseñar los Modelos (`models.py`)
Definir las entidades del nuevo Bounded Context. Si requiere asociarse a la OF, importar el modelo y establecer la relación:
```python
from django.db import models
from comercial.models import OrdenFabricacion

class ParteDiario(models.Model):
    of = models.ForeignKey(OrdenFabricacion, on_delete=models.CASCADE)
    horas_trabajadas = models.DecimalField(max_digits=5, decimal_places=2)
    fecha = models.DateField(auto_now_add=True)
    
    class Meta:
        db_table = 'recursos_humanos_parte_diario'
```

### 4. Crear Serializadores y Vistas (`serializers.py` y `views.py`)
* **Serializador:** Heredar de `serializers.ModelSerializer`.
* **Vista:** Heredar de `viewsets.ModelViewSet` e implementar acciones extra con `@action(detail=True)` si el modelo tiene máquina de estados.

### 5. Registrar URLs (`urls.py`)
Crear `recursos_humanos/urls.py`, instanciar un `DefaultRouter` y registrar la vista:
```python
from rest_framework.routers import DefaultRouter
from .views import ParteDiarioViewSet

router = DefaultRouter()
router.register(r'partes-diarios', ParteDiarioViewSet)

urlpatterns = router.urls
```
Luego, incluir este archivo en el enrutador principal `config/urls.py`:
```python
path('api/rrhh/', include('recursos_humanos.urls')),
```

### 6. Migrar Base de Datos
Generar y aplicar la migración para materializar la nueva tabla en MariaDB.
```bash
docker exec -it erp-backend python manage.py makemigrations recursos_humanos
docker exec -it erp-backend python manage.py migrate
```

---

## 5.2 Integración en el Frontend

Una vez que la API está operativa y expuesta en `/api/rrhh/`, se debe construir su respectivo módulo en React.

1. **Crear Componente Base:** Crear `src/components/RRHHPanel.jsx`.
2. **Implementar Estado:** Agregar `useState` para entidades y *polling* en el efecto.
3. **Actualizar Routing en `App.jsx`:**
   * Importar el panel: `import RRHHPanel from './components/RRHHPanel';`
   * Añadir el botón en el menú de navegación (`aside`).
   * Evaluar la vista dentro del switch-case principal de renderizado (`renderContent()`).

### 5.3 Checklist de Integración
- [ ] La app fue declarada en `settings.py`.
- [ ] La tabla explícita fue definida mediante `Meta.db_table`.
- [ ] Las Foreign Keys externas no generan ciclos de importación circular.
- [ ] Los endpoints están registrados en `config/urls.py`.
- [ ] El panel del frontend maneja el estado offline en caso de que la API `/api/rrhh/` retorne error 500.
- [ ] Las pruebas E2E (Playwright) incluyen al menos el renderizado del nuevo panel.
