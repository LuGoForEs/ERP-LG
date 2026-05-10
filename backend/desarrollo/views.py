from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied
from drf_spectacular.utils import extend_schema
from .models import PedidoMaterial, OrdenCompra, PedidoMaterialItem, Plano
from comercial.models import OrdenFabricacion, Anticipo
from .serializers import PedidoMaterialSerializer, OrdenFabricacionSerializer, PlanoSerializer
from django.db import transaction
from django.http import FileResponse

ALLOWED_MIME_TYPES = {"application/pdf"}

def verificar_of_aprobada(of_id: int):
    try:
        orden = OrdenFabricacion.objects.get(id=of_id)
    except OrdenFabricacion.DoesNotExist:
        raise NotFound(f"OF {of_id} no encontrada")
    
    if orden.estado != "aprobada":
        anticipo = Anticipo.objects.filter(of_id=orden).first()
        estado_anticipo = anticipo.estado if anticipo else "sin anticipo"
        raise PermissionDenied(f"OF {of_id} no disponible. Estado: {orden.estado}. Anticipo: {estado_anticipo}")
    return orden

class DesarrolloViewSet(viewsets.ViewSet):

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=['get'], url_path='ordenes-disponibles')
    def ordenes_disponibles(self, request):
        ordenes = OrdenFabricacion.objects.filter(estado="aprobada").order_by('-created_at')
        serializer = OrdenFabricacionSerializer(ordenes, many=True)
        return Response({"data": serializer.data})

    @extend_schema(request=None, responses={200: dict})
    @action(detail=False, methods=['post'], url_path='pedidos-material')
    @transaction.atomic
    def create_pedido_material(self, request):
        data = request.data
        of_id = data.get('of_id')
        verificar_of_aprobada(of_id)

        pedido = PedidoMaterial.objects.create(
            of_id_id=of_id,
            emisor=data.get('emisor'),
            fecha=data.get('fecha'),
            plazo_entrega=data.get('plazo_entrega', ''),
            equipo=data.get('equipo', ''),
            estado="generado"
        )

        oc = OrdenCompra.objects.create(
            pm_id=pedido,
            estado="emitida"
        )

        items_data = data.get('items', [])
        for item_data in items_data:
            PedidoMaterialItem.objects.create(
                pedido_id=pedido,
                oc_id=oc,
                cantidad=item_data.get('cantidad'),
                descripcion=item_data.get('descripcion'),
                uso_en=item_data.get('uso_en', ''),
                observaciones=item_data.get('observaciones', ''),
                oc_fecha=item_data.get('oc_fecha', '')
            )

        return Response({
            "message": f"Pedido generado con éxito. OC NRO: {oc.id}", 
            "data": PedidoMaterialSerializer(pedido).data
        })

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=['get'], url_path='pedidos-material')
    def list_pedidos_material(self, request):
        pedidos = PedidoMaterial.objects.all().order_by('-created_at')
        return Response({"data": PedidoMaterialSerializer(pedidos, many=True).data})

    @extend_schema(request=None, responses={200: dict})
    @action(detail=False, methods=['post'], url_path='planos')
    def create_plano(self, request):
        of_id = request.data.get('of_id')
        if not of_id:
            raise ValidationError("of_id es requerido")
            
        of_id = int(of_id)
        verificar_of_aprobada(of_id)
        
        archivo = request.FILES.get('archivo')
        if not archivo:
             raise ValidationError("archivo es requerido")

        if archivo.content_type not in ALLOWED_MIME_TYPES:
            raise ValidationError(f"Solo se permiten archivos PDF. Recibido: {archivo.content_type}")

        plano = Plano.objects.create(
            of_id_id=of_id,
            descripcion=request.data.get('descripcion', ''),
            archivo_nombre=archivo.name,
            archivo_tipo=archivo.content_type,
            archivo_tamanio=archivo.size,
            archivo=archivo,
            estado="enviado"
        )

        return Response({
            "message": "Plano enviado a Producción",
            "data": {
                "id": plano.id,
                "of_id": plano.of_id_id,
                "descripcion": plano.descripcion,
                "archivo": {
                    "nombre": plano.archivo_nombre,
                    "tipo": plano.archivo_tipo,
                    "tamanio_bytes": plano.archivo_tamanio,
                },
                "estado": plano.estado,
            }
        })

    @extend_schema(responses={200: bytes})
    def download_plano(self, request, pk=None):
        try:
            plano = Plano.objects.get(pk=pk)
        except Plano.DoesNotExist:
            raise NotFound("Plano no encontrado")
        if not plano.archivo:
            raise NotFound("Archivo no disponible para este plano")
        response = FileResponse(plano.archivo.open('rb'), content_type=plano.archivo_tipo or 'application/pdf')
        response['Content-Disposition'] = f'inline; filename="{plano.archivo_nombre}"'
        return response

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=['get'], url_path='planos')
    def list_planos(self, request):
        planos = Plano.objects.all().order_by('-created_at')
        return Response({
            "data": [
                {
                    "id": p.id,
                    "of_id": p.of_id_id,
                    "descripcion": p.descripcion,
                    "archivo": {
                        "nombre": p.archivo_nombre,
                        "tipo": p.archivo_tipo,
                        "tamanio_bytes": p.archivo_tamanio,
                    },
                    "estado": p.estado,
                }
                for p in planos
            ]
        })