from django.urls import path
from .views import PanolViewSet

urlpatterns = [
    path('stock', PanolViewSet.as_view({'get': 'stock'})),
    path('ingresos', PanolViewSet.as_view({'get': 'list_ingresos', 'post': 'registrar_ingreso'})),
    path('movimientos', PanolViewSet.as_view({'get': 'list_movimientos'})),
    path('movimientos/produccion', PanolViewSet.as_view({'post': 'despachar_a_produccion'})),
]