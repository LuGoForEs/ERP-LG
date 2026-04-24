from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, NotFound
from drf_spectacular.utils import extend_schema
from .models import Stock, Ingreso, Movimiento, MovimientoItem
from compras.models import FacturaCompra
from .serializers import IngresoSerializer, MovimientoSerializer
from django.db import transaction

def _ajustar_stock(nombre: str, delta: float):
    stock, created = Stock.objects.get_or_create(nombre=nombre, defaults={'cantidad': max(delta, 0)})
    if not created:
        stock.cantidad += delta
        stock.save()

class PanolViewSet(viewsets.ViewSet):

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=['get'])
    def stock(self, request):
        stocks = Stock.objects.all()
        return Response({"data": {s.nombre: s.cantidad for s in stocks}})

    @extend_schema(request=None, responses={200: dict})
    @action(detail=False, methods=['post'], url_path='ingresos')
    @transaction.atomic
    def registrar_ingreso(self, request):
        factura_id = request.data.get('factura_id')
        try:
            factura = FacturaCompra.objects.get(id=factura_id)
        except FacturaCompra.DoesNotExist:
            raise NotFound(f"Factura {factura_id} no encontrada en Compras")

        if factura.estado == "ingresada":
            raise ValidationError(f"Factura {factura_id} ya fue ingresada al stock")

        materiales = factura.materiales.all()
        snapshot = [
            {"nombre": m.nombre, "cantidad": m.cantidad, "precio_unitario": m.precio_unitario}
            for m in materiales
        ]

        for m in materiales:
            _ajustar_stock(m.nombre, float(m.cantidad))

        ingreso = Ingreso.objects.create(
            factura_id=factura,
            estado="ingresado",
            snapshot=snapshot
        )

        factura.estado = "ingresada"
        factura.save()

        stocks = Stock.objects.all()
        stock_dict = {s.nombre: s.cantidad for s in stocks}

        return Response({
            "message": "Materiales ingresados al stock",
            "data": {
                "ingreso": {
                    "id": ingreso.id,
                    "factura_id": ingreso.factura_id.id,
                    "materiales": ingreso.snapshot,
                    "estado": ingreso.estado,
                },
                "stock_actualizado": stock_dict,
            }
        })

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=['get'], url_path='ingresos')
    def list_ingresos(self, request):
        ingresos = Ingreso.objects.all()
        return Response({
            "data": [
                {
                    "id": i.id,
                    "factura_id": i.factura_id.id,
                    "materiales": i.snapshot or [],
                    "estado": i.estado,
                }
                for i in ingresos
            ]
        })

    @extend_schema(request=None, responses={200: dict})
    @action(detail=False, methods=['post'], url_path='movimientos/produccion')
    @transaction.atomic
    def despachar_a_produccion(self, request):
        of_id = request.data.get('of_id')
        materiales = request.data.get('materiales', [])

        stocks = Stock.objects.all()
        stock_actual = {s.nombre: s.cantidad for s in stocks}

        faltantes = []
        for mat in materiales:
            nombre = mat.get('nombre')
            cantidad = float(mat.get('cantidad', 0))
            disponible = stock_actual.get(nombre, 0)
            if disponible < cantidad:
                faltantes.append({
                    "material": nombre,
                    "solicitado": cantidad,
                    "disponible": disponible,
                })

        if faltantes:
            raise ValidationError({"message": "Stock insuficiente", "faltantes": faltantes})

        for mat in materiales:
            _ajustar_stock(mat.get('nombre'), -float(mat.get('cantidad', 0)))

        movimiento = Movimiento.objects.create(of_id_id=of_id, estado="despachado")

        for mat in materiales:
            MovimientoItem.objects.create(
                movimiento_id=movimiento,
                nombre=mat.get('nombre'),
                cantidad=mat.get('cantidad')
            )

        stocks_updated = Stock.objects.all()
        stock_dict = {s.nombre: s.cantidad for s in stocks_updated}

        return Response({
            "message": "Material despachado a Producción",
            "data": {
                "movimiento": {
                    "id": movimiento.id,
                    "of_id": movimiento.of_id_id,
                    "estado": movimiento.estado,
                    "materiales": [
                        {"nombre": it.nombre, "cantidad": it.cantidad}
                        for it in movimiento.items.all()
                    ],
                },
                "stock_actualizado": stock_dict,
            }
        })

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=['get'], url_path='movimientos')
    def list_movimientos(self, request):
        movimientos = Movimiento.objects.all()
        return Response({
            "data": [
                {
                    "id": m.id,
                    "of_id": m.of_id_id,
                    "estado": m.estado,
                    "materiales": [
                        {"nombre": it.nombre, "cantidad": it.cantidad} for it in m.items.all()
                    ],
                }
                for m in movimientos
            ]
        })