from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrdenFabricacionViewSet, AnticipoViewSet

router = DefaultRouter(trailing_slash=False)
router.register(r'ordenes-fabricacion', OrdenFabricacionViewSet, basename='ordenes-fabricacion')
router.register(r'anticipos', AnticipoViewSet, basename='anticipos')

urlpatterns = [
    path('', include(router.urls)),
]