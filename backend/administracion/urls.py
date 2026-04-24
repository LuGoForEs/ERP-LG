from django.urls import path
from django.http import JsonResponse
from .views import AdministracionViewSet

def api_root(request): return JsonResponse({"status": "ok"})

urlpatterns = [
    path('', api_root),
    path('ordenes', AdministracionViewSet.as_view({'get': 'list_ordenes'})),
    path('anticipos/<int:pk>/validar', AdministracionViewSet.as_view({'put': 'validar_anticipo'})),
    path('despachos/<int:pk>/aprobar', AdministracionViewSet.as_view({'put': 'aprobar_despacho'})),
]