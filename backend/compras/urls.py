from django.urls import path
from django.http import JsonResponse
from .views import ComprasViewSet

def module_status(request): return JsonResponse({"module": "Compras", "status": "active"})

urlpatterns = [
    path('', module_status),
    path('pedidos-material', ComprasViewSet.as_view({'get': 'list_pedidos_pendientes'})),
    path('proveedores', ComprasViewSet.as_view({'get': 'list_proveedores', 'post': 'create_proveedor'})),
    path('insumos/template', ComprasViewSet.as_view({'get': 'download_template'})),
    path('insumos/bulk', ComprasViewSet.as_view({'post': 'bulk_upload_articulos'})),
    path('insumos', ComprasViewSet.as_view({'get': 'list_insumos', 'post': 'create_insumo'})),
    path('facturas', ComprasViewSet.as_view({'get': 'list_facturas', 'post': 'registrar_factura'})),
    path('facturas/<int:pk>', ComprasViewSet.as_view({'get': 'get_factura'})),
    path('facturas/<int:pk>/pdf', ComprasViewSet.as_view({'get': 'download_factura_pdf'})),
]