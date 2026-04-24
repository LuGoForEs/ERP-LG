from django.urls import path
from .views import ComprasViewSet

urlpatterns = [
    path('pedidos-material', ComprasViewSet.as_view({'get': 'list_pedidos_pendientes'})),
    path('proveedores', ComprasViewSet.as_view({'get': 'list_proveedores', 'post': 'create_proveedor'})),
    path('insumos', ComprasViewSet.as_view({'get': 'list_insumos', 'post': 'create_insumo'})),
    path('facturas', ComprasViewSet.as_view({'get': 'list_facturas', 'post': 'registrar_factura'})),
]