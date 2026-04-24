from django.urls import path
from .views import AdministracionViewSet

urlpatterns = [
    path('ordenes', AdministracionViewSet.as_view({'get': 'list_ordenes'})),
    path('anticipos/<int:pk>/validar', AdministracionViewSet.as_view({'put': 'validar_anticipo'})),
    path('despachos/<int:pk>/aprobar', AdministracionViewSet.as_view({'put': 'aprobar_despacho'})),
]