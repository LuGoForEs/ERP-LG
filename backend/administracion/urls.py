from django.urls import path
from django.http import JsonResponse
from .views import AdministracionViewSet

def module_status(request): return JsonResponse({"module": "Administración", "status": "active"})

urlpatterns = [
    path('', module_status),
    path('stats', AdministracionViewSet.as_view({'get': 'get_stats'})),
    path('ordenes', AdministracionViewSet.as_view({'get': 'list_ordenes'})),
    path('anticipos/<int:pk>/validar', AdministracionViewSet.as_view({'put': 'validar_anticipo'})),
    path('despachos/<int:pk>/aprobar', AdministracionViewSet.as_view({'put': 'aprobar_despacho'})),
]