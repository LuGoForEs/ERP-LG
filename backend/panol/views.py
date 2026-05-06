from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, NotFound
from drf_spectacular.utils import extend_schema
from .models import Stock, Ingreso, Movimiento, MovimientoItem
from compras.models import FacturaCompra, Insumo
from .serializers import IngresoSerializer, MovimientoSerializer
from django.db import transaction


def _ajustar_stock(insumo: Insumo, delta: float):
    stock, created = Stock.objects.get_or_create(insumo=insumo, defaults={'cantidad': max(delta, 0)})
    if not created:
        stock.cantidad += delta
        stock.save()


class PanolViewSet(viewsets.ViewSet):

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=['get'])
    def stock(self, request):
        stocks = Stock.objects.select_related('insumo').all()
        return Response({"data": {s.insumo.nombre: s.cantidad for s in stocks}})

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

        materiales = factura.materiales.select_related('insumo').all()
        snapshot = [
            {"nombre": m.insumo.nombre, "cantidad": m.cantidad, "precio_unitario": m.precio_unitario}
            for m in materiales
        ]

        for m in materiales:
            _ajustar_stock(m.insumo, float(m.cantidad))

        ingreso = Ingreso.objects.create(factura_id=factura, estado="ingresado", snapshot=snapshot)

        factura.estado = "ingresada"
        factura.save()

        stocks = Stock.objects.select_related('insumo').all()
        stock_dict = {s.insumo.nombre: s.cantidad for s in stocks}

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
        materiales_data = request.data.get('materiales', [])

        insumo_map = {}
        for mat in materiales_data:
            nombre = mat.get('nombre')
            try:
                insumo_map[nombre] = Insumo.objects.get(nombre=nombre)
            except Insumo.DoesNotExist:
                raise ValidationError(f"Insumo '{nombre}' no registrado. Debe ingresarse primero desde Compras.")

        stocks = {s.insumo.nombre: s.cantidad for s in Stock.objects.select_related('insumo').all()}

        faltantes = []
        for mat in materiales_data:
            nombre = mat.get('nombre')
            cantidad = float(mat.get('cantidad', 0))
            disponible = stocks.get(nombre, 0)
            if disponible < cantidad:
                faltantes.append({"material": nombre, "solicitado": cantidad, "disponible": disponible})

        if faltantes:
            raise ValidationError({"message": "Stock insuficiente", "faltantes": faltantes})

        for mat in materiales_data:
            _ajustar_stock(insumo_map[mat.get('nombre')], -float(mat.get('cantidad', 0)))

        movimiento = Movimiento.objects.create(of_id_id=of_id, estado="despachado")

        for mat in materiales_data:
            MovimientoItem.objects.create(
                movimiento_id=movimiento,
                insumo=insumo_map[mat.get('nombre')],
                cantidad=mat.get('cantidad')
            )

        stocks_updated = {s.insumo.nombre: s.cantidad for s in Stock.objects.select_related('insumo').all()}

        return Response({
            "message": "Material despachado a Producción",
            "data": {
                "movimiento": {
                    "id": movimiento.id,
                    "of_id": movimiento.of_id_id,
                    "estado": movimiento.estado,
                    "materiales": [
                        {"nombre": it.insumo.nombre, "cantidad": it.cantidad}
                        for it in movimiento.items.select_related('insumo').all()
                    ],
                },
                "stock_actualizado": stocks_updated,
            }
        })

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=['get'], url_path='movimientos')
    def list_movimientos(self, request):
        movimientos = Movimiento.objects.prefetch_related('items__insumo').all()
        return Response({
            "data": [
                {
                    "id": m.id,
                    "of_id": m.of_id_id,
                    "estado": m.estado,
                    "materiales": [
                        {"nombre": it.insumo.nombre, "cantidad": it.cantidad}
                        for it in m.items.all()
                    ],
                }
                for m in movimientos
            ]
        })
