from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, NotFound
from drf_spectacular.utils import extend_schema
from .models import Proveedor, Insumo, FacturaCompra, MaterialCompra
from desarrollo.models import PedidoMaterial
from .serializers import ProveedorSerializer, InsumoSerializer, FacturaCompraSerializer
from desarrollo.serializers import PedidoMaterialSerializer
from django.db import transaction


class ComprasViewSet(viewsets.ViewSet):

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=['get'], url_path='pedidos-material')
    def list_pedidos_pendientes(self, request):
        pedidos = PedidoMaterial.objects.filter(estado="generado").order_by('-created_at')
        return Response({"data": PedidoMaterialSerializer(pedidos, many=True).data})

    @extend_schema(request=None, responses={200: dict})
    @action(detail=False, methods=['post'], url_path='proveedores')
    def create_proveedor(self, request):
        proveedor = Proveedor.objects.create(nombre=request.data.get('nombre'))
        return Response({"message": "Proveedor creado", "data": {"id": proveedor.id, "nombre": proveedor.nombre}})

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=['get'], url_path='proveedores')
    def list_proveedores(self, request):
        q = request.query_params.get('q')
        queryset = Proveedor.objects.all()
        if q:
            queryset = queryset.filter(nombre__icontains=q)
        return Response({"data": ProveedorSerializer(queryset, many=True).data})

    @extend_schema(request=None, responses={200: dict})
    @action(detail=False, methods=['post'], url_path='insumos')
    def create_insumo(self, request):
        insumo = Insumo.objects.create(nombre=request.data.get('nombre'))
        return Response({"message": "Insumo creado", "data": {"id": insumo.id, "nombre": insumo.nombre}})

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=['get'], url_path='insumos')
    def list_insumos(self, request):
        q = request.query_params.get('q')
        queryset = Insumo.objects.all()
        if q:
            queryset = queryset.filter(nombre__icontains=q)
        return Response({"data": InsumoSerializer(queryset, many=True).data})

    @extend_schema(request=None, responses={200: dict})
    @action(detail=False, methods=['post'], url_path='facturas')
    @transaction.atomic
    def registrar_factura(self, request):
        data = request.data
        pedido_id = data.get('pedido_material_id')

        try:
            pedido = PedidoMaterial.objects.get(id=pedido_id)
        except PedidoMaterial.DoesNotExist:
            raise NotFound(f"Pedido de material {pedido_id} no encontrado en Desarrollo")

        if pedido.estado == "facturado":
            raise ValidationError(f"Pedido {pedido_id} ya fue facturado")

        materiales_data = data.get('materiales', [])

        insumo_cache = {}
        proveedor_cache = {}
        monto_total = 0.0

        for m in materiales_data:
            monto_total += float(m.get('cantidad', 0)) * float(m.get('precio_unitario', 0))

            nombre_insumo = m.get('nombre')
            if nombre_insumo not in insumo_cache:
                insumo_obj, _ = Insumo.objects.get_or_create(nombre=nombre_insumo)
                insumo_cache[nombre_insumo] = insumo_obj

            proveedor_nombre = m.get('proveedor', '')
            if proveedor_nombre and proveedor_nombre not in proveedor_cache:
                proveedor_obj, _ = Proveedor.objects.get_or_create(nombre=proveedor_nombre)
                proveedor_cache[proveedor_nombre] = proveedor_obj

        factura = FacturaCompra.objects.create(
            pedido_material_id=pedido,
            monto_total=monto_total,
            estado="registrada"
        )

        for m in materiales_data:
            proveedor_nombre = m.get('proveedor', '')
            MaterialCompra.objects.create(
                factura_id=factura,
                insumo=insumo_cache[m.get('nombre')],
                cantidad=m.get('cantidad'),
                precio_unitario=m.get('precio_unitario'),
                unidad_medida=m.get('unidad_medida', 'unidades'),
                proveedor=proveedor_cache.get(proveedor_nombre)
            )

        pedido.estado = "facturado"
        pedido.save()

        return Response({
            "message": "Factura registrada y vinculada al pedido de material",
            "data": FacturaCompraSerializer(factura).data
        })

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=['get'], url_path='facturas')
    def list_facturas(self, request):
        facturas = FacturaCompra.objects.prefetch_related('materiales__insumo', 'materiales__proveedor').all().order_by('-created_at')
        return Response({"data": FacturaCompraSerializer(facturas, many=True).data})
