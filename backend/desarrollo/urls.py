from django.urls import path
from .views import DesarrolloViewSet

urlpatterns = [
    path('ordenes-disponibles', DesarrolloViewSet.as_view({'get': 'ordenes_disponibles'})),
    path('pedidos-material', DesarrolloViewSet.as_view({'get': 'list_pedidos_material', 'post': 'create_pedido_material'})),
    path('planos', DesarrolloViewSet.as_view({'get': 'list_planos', 'post': 'create_plano'})),
]