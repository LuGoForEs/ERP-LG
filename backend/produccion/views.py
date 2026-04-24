from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from .models import Lote
from desarrollo.models import Plano
from panol.models import Movimiento
from .serializers import LoteSerializer

class ProduccionViewSet(viewsets.ViewSet):

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

        lote = Lote.objects.create(
            of_id_id=of_id,
            descripcion=descripcion,
            planos_asociados=[p.id for p in planos_of],
            movimientos_asociados=[m.id for m in movimientos_of],
            estado="terminado"
        )

        return Response({
            "message": "Lote finalizado y disponible para Logística",
            "data": LoteSerializer(lote).data
        })

    @action(detail=False, methods=['get'], url_path='lotes-terminados')
    def list_lotes(self, request):
        lotes = Lote.objects.all()
        return Response({"data": LoteSerializer(lotes, many=True).data})