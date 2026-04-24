from django.urls import path
from django.http import JsonResponse
from .views import LogisticaViewSet

def module_status(request): return JsonResponse({"module": "Logística", "status": "active"})

urlpatterns = [
    path('', module_status),
    path('despachos', LogisticaViewSet.as_view({'get': 'list_despachos', 'post': 'create_despacho'})),
    path('despachos/<int:pk>/solicitar-autorizacion', LogisticaViewSet.as_view({'post': 'solicitar_autorizacion'})),
    path('despachos/<int:pk>/ejecutar', LogisticaViewSet.as_view({'post': 'ejecutar_despacho'})),
]