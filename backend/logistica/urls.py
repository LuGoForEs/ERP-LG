from django.urls import path
from .views import LogisticaViewSet

urlpatterns = [
    path('despachos', LogisticaViewSet.as_view({'get': 'list_despachos', 'post': 'create_despacho'})),
    path('despachos/<int:pk>/solicitar-autorizacion', LogisticaViewSet.as_view({'post': 'solicitar_autorizacion'})),
    path('despachos/<int:pk>/ejecutar', LogisticaViewSet.as_view({'post': 'ejecutar_despacho'})),
]