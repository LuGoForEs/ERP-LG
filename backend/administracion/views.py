from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from drf_spectacular.utils import extend_schema
from comercial.models import OrdenFabricacion, Anticipo
from logistica.models import Despacho
from .serializers import AnticipoSerializer, OrdenFabricacionSerializer, DespachoSerializer

from django.contrib.auth.models import User
from django.db.models import Sum

class AdministracionViewSet(viewsets.ViewSet):
    
    @extend_schema(responses={200: dict})
    @action(detail=False, methods=['get'], url_path='stats')
    def get_stats(self, request):
        active_users = User.objects.filter(is_active=True).count()
        pending_of = OrdenFabricacion.objects.filter(estado='pendiente_anticipo').count()
        total_anticipos = Anticipo.objects.filter(estado='validado').aggregate(Sum('monto_estimado'))['monto_estimado__sum'] or 0
        
        return Response({
            "active_users": active_users,
            "workload": pending_of,
            "financial_total": total_anticipos,
            "system_health": "stable"
        })

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=['get'], url_path='ordenes')
    def list_ordenes(self, request):
        ordenes = OrdenFabricacion.objects.all().order_by('-created_at')
        anticipos = Anticipo.objects.all()
        by_of = {a.of_id.id: a for a in anticipos}
        result = []
        for o in ordenes:
            a = by_of.get(o.id)
            result.append({
                **OrdenFabricacionSerializer(o).data,
                "anticipo": AnticipoSerializer(a).data if a else None
            })
        return Response({"data": result})

    @extend_schema(request=None, responses={200: dict})
    @action(detail=True, methods=['put'], url_path='validar')
    def validar_anticipo(self, request, pk=None):
        try:
            anticipo = Anticipo.objects.get(pk=pk)
        except Anticipo.DoesNotExist:
            return Response({"detail": f"Anticipo {pk} no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        if anticipo.estado not in ("pendiente", "rechazado"):
            raise ValidationError(f"Anticipo ya procesado: {anticipo.estado}")

        pagado = str(request.data.get('pagado')).lower() in ['true', '1', 't', 'y', 'yes']
        observacion = request.data.get('observacion', "")
        factura = request.FILES.get('factura')

        factura_info = None
        if factura:
            factura_info = {
                "nombre": factura.name,
                "tipo": factura.content_type,
                "tamanio_bytes": factura.size,
            }

        anticipo.pagado = pagado
        anticipo.estado = "validado" if pagado else "rechazado"
        anticipo.observacion = observacion
        if factura_info:
            anticipo.factura_archivo = factura_info
        anticipo.save()

        orden = anticipo.of_id
        if orden is not None:
            orden.estado = "aprobada" if pagado else "rechazada_anticipo"
            orden.save()

        return Response({
            "message": f"Anticipo {pk} {'validado' if pagado else 'rechazado'}",
            "data": {
                "anticipo": AnticipoSerializer(anticipo).data,
                "orden": OrdenFabricacionSerializer(orden).data if orden else None,
            }
        })

    @extend_schema(request=None, responses={200: dict})
    @action(detail=True, methods=['put'], url_path='aprobar')
    def aprobar_despacho(self, request, pk=None):
        try:
            despacho = Despacho.objects.get(pk=pk)
        except Despacho.DoesNotExist:
            return Response({"detail": f"Despacho {pk} no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        if despacho.estado != "esperando_autorizacion":
            raise ValidationError(f"Despacho {pk} no está esperando autorización. Estado: {despacho.estado}")

        aprobado = str(request.data.get('aprobado')).lower() in ['true', '1', 't', 'y', 'yes']
        observacion = request.data.get('observacion', "")
        comprobante = request.FILES.get('comprobante_saldo')

        despacho.estado = "autorizado" if aprobado else "rechazado"
        despacho.observacion_admin = observacion
        if comprobante:
            despacho.comprobante_saldo = comprobante
        despacho.save()

        return Response({
            "message": f"Despacho {pk} {'autorizado' if aprobado else 'rechazado'}",
            "data": DespachoSerializer(despacho).data,
        })