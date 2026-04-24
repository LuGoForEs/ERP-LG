from django.urls import path, include
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter
from .views import OrdenFabricacionViewSet, AnticipoViewSet

def module_status(request): return JsonResponse({"module": "Comercial", "status": "active"})

router = DefaultRouter(trailing_slash=False)
router.register(r'ordenes-fabricacion', OrdenFabricacionViewSet, basename='ordenes-fabricacion')
router.register(r'anticipos', AnticipoViewSet, basename='anticipos')

urlpatterns = [
    path('', module_status),
    path('', include(router.urls)),
]