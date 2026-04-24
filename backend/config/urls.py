from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # OpenAPI Schema & Swagger
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    # API endpoints (to be implemented)
    # path('api/v1/comercial/', include('comercial.urls')),
    # path('api/v1/administracion/', include('administracion.urls')),
    # path('api/v1/desarrollo/', include('desarrollo.urls')),
    # path('api/v1/compras/', include('compras.urls')),
    # path('api/v1/panol/', include('panol.urls')),
    # path('api/v1/produccion/', include('produccion.urls')),
    # path('api/v1/logistica/', include('logistica.urls')),
]