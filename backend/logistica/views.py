from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, NotFound
from drf_spectacular.utils import extend_schema
from .models import Despacho
from produccion.models import Lote
from .serializers import DespachoSerializer
from notificaciones.events import emit_event

class LogisticaViewSet(viewsets.ViewSet):

    @extend_schema(request=None, responses={200: dict})
    @action(detail=False, methods=['post'], url_path='despachos')
    def create_despacho(self, request):
        lote_id = request.data.get('lote_id')
        try:
            lote = Lote.objects.get(id=lote_id)
        except Lote.DoesNotExist:
            raise NotFound(f"Lote {lote_id} no encontrado en Producción")

        if lote.estado != "terminado" and lote.estado != "en_despacho":
            raise ValidationError(f"Lote {lote_id} no está terminado. Estado: {lote.estado}")

        despacho = Despacho.objects.create(
            lote_id=lote,
            destino=request.data.get('destino', ''),
            transportista=request.data.get('transportista', ''),
            estado="pendiente"
        )

        lote.estado = "en_despacho"
        lote.save()

        return Response({"message": "Despacho creado", "data": DespachoSerializer(despacho).data})

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=['get'], url_path='despachos')
    def list_despachos(self, request):
        despachos = Despacho.objects.all()
        return Response({"data": DespachoSerializer(despachos, many=True).data})

    @extend_schema(request=None, responses={200: dict})
    @action(detail=True, methods=['post'], url_path='solicitar-autorizacion')
    def solicitar_autorizacion(self, request, pk=None):
        try:
            despacho = Despacho.objects.get(pk=pk)
        except Despacho.DoesNotExist:
            raise NotFound(f"Despacho {pk} no encontrado")

        if despacho.estado != "pendiente":
            raise ValidationError(f"Despacho {pk} no está pendiente. Estado: {despacho.estado}")

        despacho.estado = "esperando_autorizacion"
        despacho.save()

        emit_event(
            'logistica', 'administracion', 'despacho_espera_autorizacion',
            f"Logística solicitó autorización para el despacho #{despacho.id}",
            'despacho', despacho.id,
        )

        return Response({
            "message": f"Autorización solicitada para despacho {pk}",
            "data": DespachoSerializer(despacho).data,
        })

    @extend_schema(request=None, responses={200: dict})
    @action(detail=True, methods=['post'], url_path='ejecutar')
    def ejecutar_despacho(self, request, pk=None):
        try:
            despacho = Despacho.objects.get(pk=pk)
        except Despacho.DoesNotExist:
            raise NotFound(f"Despacho {pk} no encontrado")

        if despacho.estado != "autorizado":
            raise ValidationError(
                f"Despacho {pk} no está autorizado. Estado: {despacho.estado}. "
                "Administración debe aprobarlo primero."
            )

        despacho.estado = "ejecutado"
        despacho.save()

        emit_event(
            'logistica', ['comercial', 'produccion'], 'despacho_ejecutado',
            f"Logística ejecutó el despacho #{despacho.id}",
            'despacho', despacho.id,
        )

        return Response({"message": f"Despacho {pk} ejecutado", "data": DespachoSerializer(despacho).data})