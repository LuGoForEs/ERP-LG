from django.urls import path
from django.http import JsonResponse
from .views import DesarrolloViewSet

def module_status(request): return JsonResponse({"module": "Desarrollo", "status": "active"})

urlpatterns = [
    path('', module_status),
    path('ordenes-disponibles', DesarrolloViewSet.as_view({'get': 'ordenes_disponibles'})),
    path('pedidos-material', DesarrolloViewSet.as_view({'get': 'list_pedidos_material', 'post': 'create_pedido_material'})),
    path('planos', DesarrolloViewSet.as_view({'get': 'list_planos', 'post': 'create_plano'})),
]