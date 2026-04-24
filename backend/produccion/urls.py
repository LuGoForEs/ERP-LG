from django.urls import path
from django.http import JsonResponse
from .views import ProduccionViewSet

def module_status(request): return JsonResponse({"module": "Producción", "status": "active"})

urlpatterns = [
    path('', module_status),
    path('lotes-terminados', ProduccionViewSet.as_view({'get': 'list_lotes', 'post': 'finalizar_lote'})),
]