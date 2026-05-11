from django.utils import timezone
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, NotFound
from drf_spectacular.utils import extend_schema
from .models import Lote
from desarrollo.models import Plano
from panol.models import Movimiento
from .serializers import LoteSerializer

ESTADOS = ['pre_produccion', 'produccion', 'final_produccion', 'terminado', 'en_despacho']


class ProduccionViewSet(viewsets.ViewSet):

    @extend_schema(request=None, responses={200: dict})
    @action(detail=False, methods=['post'], url_path='lotes-terminados')
    def finalizar_lote(self, request):
        of_id = request.data.get('of_id')
        descripcion = request.data.get('descripcion', '')

        planos_of = Plano.objects.filter(of_id=of_id)
        if not planos_of.exists():
            raise ValidationError(f"No hay planos enviados para la OF {of_id}. Desarrollo debe enviarlos primero.")

        movimientos_of = Movimiento.objects.filter(of_id=of_id)
        if not movimientos_of.exists():
            raise ValidationError(f"No hay materiales despachados para la OF {of_id}. Pañol debe despacharlos primero.")

        lote = Lote.objects.create(of_id_id=of_id, descripcion=descripcion, estado="pre_produccion")
        lote.planos.set(planos_of)
        lote.movimientos.set(movimientos_of)

        return Response({
            "message": "Lote iniciado en Pre-Producción",
            "data": LoteSerializer(lote).data
        })

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=['get'], url_path='lotes-terminados')
    def list_lotes(self, request):
        lotes = Lote.objects.all().order_by('-id')
        return Response({"data": LoteSerializer(lotes, many=True).data})

    @extend_schema(request=None, responses={200: dict})
    def avanzar_estado(self, request, pk=None):
        try:
            lote = Lote.objects.get(pk=pk)
        except Lote.DoesNotExist:
            raise NotFound(f"Lote {pk} no encontrado")

        observacion_texto = (request.data.get('observaciones') or '').strip()
        if not observacion_texto:
            raise ValidationError("Las observaciones de avance son obligatorias para cambiar el estado.")

        try:
            idx = ESTADOS.index(lote.estado)
        except ValueError:
            raise ValidationError(f"Estado actual '{lote.estado}' no reconocido.")

        if idx >= len(ESTADOS) - 1:
            raise ValidationError("El lote ya está en el estado final.")

        estado_anterior = lote.estado
        lote.estado = ESTADOS[idx + 1]
        lote.observaciones = (lote.observaciones or []) + [{
            'desde': estado_anterior,
            'hacia': lote.estado,
            'texto': observacion_texto,
            'fecha': timezone.now().isoformat(),
        }]
        lote.save()

        return Response({
            "message": f"Estado actualizado a '{lote.estado}'",
            "data": LoteSerializer(lote).data,
        })
