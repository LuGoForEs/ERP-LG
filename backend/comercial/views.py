from datetime import timedelta
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import OrdenFabricacion, Anticipo
from .serializers import OrdenFabricacionSerializer, AnticipoSerializer, OrdenFabricacionCreateSerializer

from desarrollo.models import PedidoMaterial, Plano
from compras.models import FacturaCompra
from panol.models import Ingreso, Movimiento
from produccion.models import Lote
from logistica.models import Despacho

def _fue_modificado(created, updated) -> bool:
    if created is None or updated is None:
        return False
    return (updated - created) > timedelta(seconds=1)

from drf_spectacular.utils import extend_schema

class OrdenFabricacionViewSet(viewsets.ModelViewSet):
    queryset = OrdenFabricacion.objects.all()
    serializer_class = OrdenFabricacionSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({"data": serializer.data})

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({"data": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = OrdenFabricacionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        orden = OrdenFabricacion.objects.create(
            cliente=data.get('cliente', ''),
            descripcion=data.get('descripcion', ''),
            plazo_entrega=data.get('plazo_entrega', ''),
            monto_anticipo=float(data.get('monto_anticipo') or 0),
            moneda_anticipo=data.get('moneda_anticipo', 'ARS'),
            anticipo_descripcion=data.get('anticipo_descripcion'),
            estado='pendiente_anticipo'
        )

        anticipo = Anticipo.objects.create(
            of_id=orden,
            cliente=orden.cliente,
            monto_estimado=orden.monto_anticipo,
            estado='pendiente',
            pagado=False
        )

        return Response({
            "message": "OF creada. Anticipo pendiente de validación por Administración",
            "data": {
                "orden": OrdenFabricacionSerializer(orden).data,
                "anticipo": AnticipoSerializer(anticipo).data
            }
        }, status=status.HTTP_201_CREATED)

    @extend_schema(responses={200: dict})
    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        orden = self.get_object()
        
        anticipos = list(orden.anticipos.all())
        pedidos = list(PedidoMaterial.objects.filter(of_id=orden))
        planos = list(Plano.objects.filter(of_id=orden))
        movimientos = list(Movimiento.objects.filter(of_id=orden))
        lotes = list(Lote.objects.filter(of_id=orden))

        pedido_ids = [p.id for p in pedidos]
        facturas = list(FacturaCompra.objects.filter(pedido_material_id__in=pedido_ids)) if pedido_ids else []

        factura_ids = [f.id for f in facturas]
        ingresos = list(Ingreso.objects.filter(factura_id__in=factura_ids)) if factura_ids else []

        lote_ids = [l.id for l in lotes]
        despachos = list(Despacho.objects.filter(lote_id__in=lote_ids)) if lote_ids else []

        eventos = []

        eventos.append({
            "timestamp": orden.created_at.isoformat(),
            "dominio": "comercial",
            "tipo": "of.creada",
            "mensaje": f"OF #{orden.id} creada para {orden.cliente}",
            "referencia": {"entidad": "orden_fabricacion", "id": orden.id},
            "estado": "pendiente_anticipo",
        })
        if _fue_modificado(orden.created_at, orden.updated_at):
            eventos.append({
                "timestamp": orden.updated_at.isoformat(),
                "dominio": "comercial",
                "tipo": f"of.{orden.estado}",
                "mensaje": f"OF #{orden.id} pasó a estado: {orden.estado}",
                "referencia": {"entidad": "orden_fabricacion", "id": orden.id},
                "estado": orden.estado,
            })

        for a in anticipos:
            eventos.append({
                "timestamp": a.created_at.isoformat(),
                "dominio": "comercial",
                "tipo": "anticipo.creado",
                "mensaje": f"Anticipo #{a.id} registrado (monto estimado: {a.monto_estimado})",
                "referencia": {"entidad": "anticipo", "id": a.id},
                "estado": "pendiente",
            })
            if _fue_modificado(a.created_at, a.updated_at):
                eventos.append({
                    "timestamp": a.updated_at.isoformat(),
                    "dominio": "administracion",
                    "tipo": f"anticipo.{a.estado}",
                    "mensaje": f"Anticipo #{a.id} {a.estado}" + (f" — {a.observacion}" if a.observacion else ""),
                    "referencia": {"entidad": "anticipo", "id": a.id},
                    "estado": a.estado,
                })

        for p in pedidos:
            eventos.append({
                "timestamp": p.created_at.isoformat(),
                "dominio": "desarrollo",
                "tipo": "pedido_material.generado",
                "mensaje": f"Pedido de materiales #{p.id} generado por {p.emisor}",
                "referencia": {"entidad": "pedido_material", "id": p.id},
                "estado": "generado",
            })
            if _fue_modificado(p.created_at, p.updated_at):
                eventos.append({
                    "timestamp": p.updated_at.isoformat(),
                    "dominio": "desarrollo",
                    "tipo": f"pedido_material.{p.estado}",
                    "mensaje": f"Pedido #{p.id} pasó a estado: {p.estado}",
                    "referencia": {"entidad": "pedido_material", "id": p.id},
                    "estado": p.estado,
                })

        for pl in planos:
            eventos.append({
                "timestamp": pl.created_at.isoformat(),
                "dominio": "desarrollo",
                "tipo": "plano.enviado",
                "mensaje": f"Plano #{pl.id} enviado ({pl.descripcion})",
                "referencia": {"entidad": "plano", "id": pl.id},
                "estado": "enviado",
            })

        for f in facturas:
            eventos.append({
                "timestamp": f.created_at.isoformat(),
                "dominio": "compras",
                "tipo": "factura_compra.registrada",
                "mensaje": f"Factura #{f.id} registrada — proveedor: {f.proveedor} (total: {f.monto_total})",
                "referencia": {"entidad": "factura_compra", "id": f.id},
                "estado": "registrada",
            })
            if _fue_modificado(f.created_at, f.updated_at):
                eventos.append({
                    "timestamp": f.updated_at.isoformat(),
                    "dominio": "panol",
                    "tipo": f"factura_compra.{f.estado}",
                    "mensaje": f"Factura #{f.id} pasó a estado: {f.estado}",
                    "referencia": {"entidad": "factura_compra", "id": f.id},
                    "estado": f.estado,
                })

        for i in ingresos:
            eventos.append({
                "timestamp": i.created_at.isoformat(),
                "dominio": "panol",
                "tipo": "ingreso.registrado",
                "mensaje": f"Ingreso #{i.id} de materiales al stock",
                "referencia": {"entidad": "ingreso", "id": i.id},
                "estado": "ingresado",
            })

        for m in movimientos:
            eventos.append({
                "timestamp": m.created_at.isoformat(),
                "dominio": "panol",
                "tipo": "movimiento.despachado_produccion",
                "mensaje": f"Movimiento #{m.id} despachado a Producción",
                "referencia": {"entidad": "movimiento", "id": m.id},
                "estado": "despachado",
            })

        for l in lotes:
            eventos.append({
                "timestamp": l.created_at.isoformat(),
                "dominio": "produccion",
                "tipo": "lote.terminado",
                "mensaje": f"Lote #{l.id} finalizado",
                "referencia": {"entidad": "lote", "id": l.id},
                "estado": "terminado",
            })
            if _fue_modificado(l.created_at, l.updated_at):
                eventos.append({
                    "timestamp": l.updated_at.isoformat(),
                    "dominio": "produccion",
                    "tipo": f"lote.{l.estado}",
                    "mensaje": f"Lote #{l.id} pasó a estado: {l.estado}",
                    "referencia": {"entidad": "lote", "id": l.id},
                    "estado": l.estado,
                })

        for d in despachos:
            eventos.append({
                "timestamp": d.created_at.isoformat(),
                "dominio": "logistica",
                "tipo": "despacho.creado",
                "mensaje": f"Despacho #{d.id} creado — destino: {d.destino}",
                "referencia": {"entidad": "despacho", "id": d.id},
                "estado": "pendiente",
            })
            if _fue_modificado(d.created_at, d.updated_at):
                dominio = "administracion" if d.estado in ("autorizado", "rechazado") else "logistica"
                eventos.append({
                    "timestamp": d.updated_at.isoformat(),
                    "dominio": dominio,
                    "tipo": f"despacho.{d.estado}",
                    "mensaje": f"Despacho #{d.id} pasó a estado: {d.estado}"
                    + (f" — {d.observacion_admin}" if d.observacion_admin else ""),
                    "referencia": {"entidad": "despacho", "id": d.id},
                    "estado": d.estado,
                })

        eventos.sort(key=lambda e: e["timestamp"])

        return Response({
            "orden": OrdenFabricacionSerializer(orden).data,
            "total_eventos": len(eventos),
            "timeline": eventos,
        })


class AnticipoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Anticipo.objects.all()
    serializer_class = AnticipoSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({"data": serializer.data})