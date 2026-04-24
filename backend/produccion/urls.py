from django.urls import path
from .views import ProduccionViewSet

urlpatterns = [
    path('lotes-terminados', ProduccionViewSet.as_view({'get': 'list_lotes', 'post': 'finalizar_lote'})),
]