"""Endpoints del módulo Soporte de sistemas.

Trazabilidad de OF: junta los `historical_*` records de todos los modelos
asociados a una orden de fabricación (comercial → desarrollo → compras →
pañol → producción → logística) y devuelve una timeline unificada.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from auth_erp.views import IsSoporteOrSuperuser, can_access_soporte_features
from auth_erp.utils import validate_search_q

from comercial.models import OrdenFabricacion, Anticipo
from desarrollo.models import PedidoMaterial, OrdenCompra, Plano
from panol.models import Ingreso, Movimiento
from produccion.models import Lote
from logistica.models import Despacho

import mimetypes

from django.http import FileResponse, Http404

from .models import Ticket, TicketComment, TicketAttachment
from .serializers import (
    TicketSerializer, TicketCreateSerializer, TicketCommentSerializer,
    TicketAttachmentSerializer,
)
from .emails import send_new_ticket_email, send_ticket_comment_email
from notificaciones.events import emit_event


# ─── Adjuntos: límites y validaciones ────────────────────────────────────────
ATTACHMENT_MAX_SIZE   = 10 * 1024 * 1024  # 10 MB por archivo
ATTACHMENT_MAX_COUNT  = 5                  # archivos por ticket
ATTACHMENT_ALLOWED_EXT = {
    'jpg', 'jpeg', 'png', 'gif', 'webp',
    'pdf',
    'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'csv', 'txt', 'log',
    'zip',
}


def _attachment_ext_ok(filename):
    if '.' not in filename:
        return False
    return filename.rsplit('.', 1)[-1].lower() in ATTACHMENT_ALLOWED_EXT


def _validate_uploaded_file(uploaded):
    """Valida un archivo subido. Devuelve None si OK, o mensaje de error."""
    if uploaded.size > ATTACHMENT_MAX_SIZE:
        return f'El archivo "{uploaded.name}" supera el tamaño máximo (10 MB).'
    if not _attachment_ext_ok(uploaded.name):
        return f'Tipo de archivo no permitido: "{uploaded.name}".'
    return None


def _attach_file(ticket, uploaded, user):
    """Crea un TicketAttachment desde un archivo subido. Asume archivo válido."""
    content_type = uploaded.content_type or mimetypes.guess_type(uploaded.name)[0] or ''
    return TicketAttachment.objects.create(
        ticket=ticket,
        file=uploaded,
        original_name=uploaded.name[:255],
        content_type=content_type[:120],
        size=uploaded.size or 0,
        uploaded_by=user,
    )


def _closed_or_none(ticket):
    """Devuelve Response 403 si el ticket está cerrado; None si está abierto.

    El cierre es irreversible y aplica a todos los actores (incluido soporte).
    """
    if ticket.status == 'cerrado':
        return Response(
            {'detail': 'Ticket cerrado: no admite modificaciones.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    return None


HISTORY_ACTION_LABELS = {'+': 'creado', '~': 'modificado', '-': 'eliminado'}


def _serialize_history_record(h, source_app, source_model, ref_label):
    """Convierte un HistoricalRecord a un dict serializable de timeline."""
    user = h.history_user
    user_label = None
    if user is not None:
        user_label = (f"{user.first_name} {user.last_name}".strip()
                      or user.username or user.email)
    changes = []
    try:
        prev = h.prev_record
        if prev is not None:
            delta = h.diff_against(prev)
            for change in delta.changes:
                changes.append({
                    'field': change.field,
                    'old': str(change.old) if change.old is not None else None,
                    'new': str(change.new) if change.new is not None else None,
                })
    except Exception:
        pass

    # Snapshot del registro (campos planos, sin relaciones complejas)
    snapshot = {}
    for f in h.instance._meta.fields:
        try:
            snapshot[f.name] = getattr(h, f.name)
        except Exception:
            continue
    # serializar valores no-JSON
    for k, v in list(snapshot.items()):
        if hasattr(v, 'isoformat'):
            snapshot[k] = v.isoformat()
        elif v is not None and not isinstance(v, (str, int, float, bool, list, dict)):
            snapshot[k] = str(v)

    return {
        'ts': h.history_date.isoformat() if h.history_date else None,
        'app': source_app,
        'modelo': source_model,
        'ref_id': h.instance.pk,
        'ref_label': ref_label,
        'accion': HISTORY_ACTION_LABELS.get(h.history_type, h.history_type),
        'history_type': h.history_type,
        'usuario': user_label,
        'usuario_id': user.id if user else None,
        'changes': changes,
        'snapshot': snapshot,
    }


def _related_records(of):
    """Devuelve los registros vinculados a una OF agrupados por modelo.

    Cada item es una tupla (instancia, source_app, source_model, ref_label)
    para que el caller pueda iterar el historial de cada uno.
    """
    items = []
    items.append((of, 'comercial', 'OrdenFabricacion', f'OF #{of.id}'))

    for a in Anticipo.objects.filter(of_id=of):
        items.append((a, 'comercial', 'Anticipo', f'Anticipo #{a.id}'))

    pedidos = list(PedidoMaterial.objects.filter(of_id=of))
    for pm in pedidos:
        items.append((pm, 'desarrollo', 'PedidoMaterial', f'PM #{pm.id}'))
        for oc in OrdenCompra.objects.filter(pm_id=pm):
            items.append((oc, 'desarrollo', 'OrdenCompra', f'OC #{oc.id}'))

    for p in Plano.objects.filter(of_id=of):
        items.append((p, 'desarrollo', 'Plano', f'Plano #{p.id}'))

    movimientos = list(Movimiento.objects.filter(of_id=of))
    for m in movimientos:
        items.append((m, 'panol', 'Movimiento', f'Movimiento #{m.id}'))

    # Ingresos se encadenan vía FacturaCompra → MaterialCompra → PedidoMaterialItem
    # En PR 1 los listamos por todas las facturas asociadas a OC de la OF.
    from compras.models import FacturaCompra, MaterialCompra  # local import para evitar ciclos
    if pedidos:
        oc_ids = list(OrdenCompra.objects.filter(pm_id__in=pedidos).values_list('id', flat=True))
        if oc_ids:
            material_factura_ids = MaterialCompra.objects.filter(
                oc_id__in=oc_ids
            ).values_list('factura_id', flat=True).distinct()
            for ing in Ingreso.objects.filter(factura_id__in=material_factura_ids):
                items.append((ing, 'panol', 'Ingreso', f'Ingreso #{ing.id}'))

    lotes = list(Lote.objects.filter(of_id=of))
    for lo in lotes:
        items.append((lo, 'produccion', 'Lote', f'Lote #{lo.id}'))
        for d in Despacho.objects.filter(lote_id=lo):
            items.append((d, 'logistica', 'Despacho', f'Despacho #{d.id}'))

    return items


class OFTrazabilidadView(APIView):
    """GET /api/v1/soporte/of/<id>/trazabilidad/ — timeline unificada de una OF."""
    permission_classes = [IsAuthenticated, IsSoporteOrSuperuser]

    def get(self, request, of_id):
        try:
            of = OrdenFabricacion.objects.get(pk=of_id)
        except OrdenFabricacion.DoesNotExist:
            return Response({'detail': 'OF no encontrada'}, status=status.HTTP_404_NOT_FOUND)

        timeline = []
        for inst, app, model, label in _related_records(of):
            history_qs = inst.history.all().order_by('history_date')
            for h in history_qs:
                timeline.append(_serialize_history_record(h, app, model, label))

        # Orden cronológico ascendente — el frontend puede invertir para mostrar
        # "más reciente arriba" si lo prefiere.
        timeline.sort(key=lambda x: x['ts'] or '')

        return Response({
            'of': {
                'id': of.id,
                'cliente': of.cliente,
                'estado': of.estado,
                'created_at': of.created_at.isoformat(),
            },
            'count': len(timeline),
            'timeline': timeline,
        })


class OFListView(APIView):
    """GET /api/v1/soporte/of/ — lista de OF para el buscador del panel Soporte.

    Devuelve una proyección liviana (id, cliente, estado, created_at). Solo
    accesible a roles con permisos de soporte.
    """
    permission_classes = [IsAuthenticated, IsSoporteOrSuperuser]

    def get(self, request):
        q = validate_search_q(request.query_params.get('q', '')).lower()
        qs = OrdenFabricacion.objects.all().order_by('-created_at')
        if q:
            qs = qs.filter(cliente__icontains=q)
        data = [
            {
                'id': o.id,
                'cliente': o.cliente,
                'estado': o.estado,
                'created_at': o.created_at.isoformat(),
            }
            for o in qs[:200]
        ]
        return Response({'data': data})


# ─── Tickets ──────────────────────────────────────────────────────────────────

def _primary_role_label(user):
    """Devuelve un label legible del rol principal del usuario para snapshot.

    Para superusuarios devuelve 'Administrador de sistema'. Sino concatena los
    roles asignados con label legible.
    """
    if user.is_superuser:
        return 'Administrador de sistema'
    roles = list(user.roles.values_list('role', flat=True))
    if not roles:
        return ''
    label_map = {
        'comercial': 'Comercial', 'administracion': 'Administración',
        'desarrollo': 'Desarrollo', 'compras': 'Compras', 'panol': 'Pañol',
        'produccion': 'Producción', 'logistica': 'Logística',
        'gerencia': 'Gerencia', 'soporte': 'Soporte de sistemas',
    }
    return ', '.join(label_map.get(r, r) for r in roles)


class TicketListCreateView(APIView):
    """GET → lista de tickets (soporte ve todos, usuario solo los propios).
    POST → cualquier usuario autenticado puede abrir un ticket.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if can_access_soporte_features(request.user):
            qs = Ticket.objects.all()
        else:
            qs = Ticket.objects.filter(created_by=request.user)
        qs = qs.order_by('-created_at').prefetch_related('comments')
        data = TicketSerializer(qs, many=True).data
        return Response({'data': data})

    def post(self, request):
        serializer = TicketCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        v = serializer.validated_data

        # Validar archivos adjuntos (multipart) si los hay, antes de crear nada.
        files = request.FILES.getlist('files') if hasattr(request, 'FILES') else []
        if len(files) > ATTACHMENT_MAX_COUNT:
            return Response(
                {'detail': f'Máximo {ATTACHMENT_MAX_COUNT} archivos por ticket.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        for f in files:
            err = _validate_uploaded_file(f)
            if err:
                return Response({'detail': err}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        full_name = (f"{user.first_name} {user.last_name}".strip()
                     or user.username or user.email or '')
        ticket = Ticket.objects.create(
            created_by=user,
            subject=v['subject'],
            body=v['body'],
            priority=v.get('priority', 'media'),
            status='abierto',
            snapshot_full_name=full_name,
            snapshot_email=user.email or '',
            snapshot_role=_primary_role_label(user),
        )

        for f in files:
            _attach_file(ticket, f, user)

        send_new_ticket_email(ticket)
        try:
            emit_event(
                source='comercial',
                targets=['soporte'],
                event_type='ticket_creado',
                message=f'Nuevo ticket #{ticket.id} — {ticket.subject}',
                ref_type='ticket',
                ref_id=ticket.id,
            )
        except Exception:
            pass

        return Response(
            {'data': TicketSerializer(ticket).data},
            status=status.HTTP_201_CREATED,
        )


class TicketDetailView(APIView):
    """GET/PATCH /api/v1/soporte/tickets/<id>/

    GET: owner del ticket o soporte.
    PATCH: solo soporte (cambia status, priority, assignee).
    """
    permission_classes = [IsAuthenticated]

    def _get_or_403(self, request, pk):
        try:
            ticket = Ticket.objects.get(pk=pk)
        except Ticket.DoesNotExist:
            return None, Response({'detail': 'Ticket no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        if not can_access_soporte_features(request.user) and ticket.created_by_id != request.user.id:
            return None, Response({'detail': 'Sin permiso'}, status=status.HTTP_403_FORBIDDEN)
        return ticket, None

    def get(self, request, pk):
        ticket, err = self._get_or_403(request, pk)
        if err:
            return err
        return Response({'data': TicketSerializer(ticket).data})

    def patch(self, request, pk):
        if not can_access_soporte_features(request.user):
            return Response({'detail': 'Sin permiso'}, status=status.HTTP_403_FORBIDDEN)
        try:
            ticket = Ticket.objects.get(pk=pk)
        except Ticket.DoesNotExist:
            return Response({'detail': 'Ticket no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        # Una vez cerrado el ticket es inmutable — ningún cambio se acepta,
        # ni siquiera reabrirlo.
        blocked = _closed_or_none(ticket)
        if blocked:
            return blocked

        new_status = request.data.get('status')
        new_priority = request.data.get('priority')
        assignee_id = request.data.get('assignee_id')

        if new_status:
            if new_status not in dict(Ticket.STATUS_CHOICES):
                return Response({'detail': 'Estado inválido'}, status=status.HTTP_400_BAD_REQUEST)
            ticket.status = new_status
        if new_priority:
            if new_priority not in dict(Ticket.PRIORITY_CHOICES):
                return Response({'detail': 'Prioridad inválida'}, status=status.HTTP_400_BAD_REQUEST)
            ticket.priority = new_priority
        if assignee_id is not None:
            # Solo permitir asignar usuarios con acceso de soporte.
            from django.contrib.auth.models import User
            try:
                candidate = User.objects.get(pk=assignee_id) if assignee_id else None
            except User.DoesNotExist:
                return Response({'detail': 'Usuario asignado no existe'}, status=status.HTTP_400_BAD_REQUEST)
            if candidate is not None and not can_access_soporte_features(candidate):
                return Response({'detail': 'El usuario asignado no tiene rol soporte'}, status=status.HTTP_400_BAD_REQUEST)
            ticket.assignee = candidate

        ticket.save()
        return Response({'data': TicketSerializer(ticket).data})


class TicketCommentCreateView(APIView):
    """POST /api/v1/soporte/tickets/<id>/comments/ — owner o soporte agrega respuesta."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            ticket = Ticket.objects.get(pk=pk)
        except Ticket.DoesNotExist:
            return Response({'detail': 'Ticket no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if not can_access_soporte_features(request.user) and ticket.created_by_id != request.user.id:
            return Response({'detail': 'Sin permiso'}, status=status.HTTP_403_FORBIDDEN)

        blocked = _closed_or_none(ticket)
        if blocked:
            return blocked

        body = (request.data.get('body') or '').strip()
        if not body:
            return Response({'detail': 'El mensaje no puede estar vacío'}, status=status.HTTP_400_BAD_REQUEST)

        comment = TicketComment.objects.create(ticket=ticket, author=request.user, body=body)

        # Notificación por email a la contraparte
        send_ticket_comment_email(comment)
        try:
            from notificaciones.events import ALL_NODES
            if can_access_soporte_features(request.user):
                # Soporte respondió → notificar al creador en TODOS sus nodos visibles.
                # Si no tiene roles operativos, fallback al canal 'soporte' (que el creador
                # igual recibe vía su sesión si tiene permiso) y a 'comercial' como red de seguridad.
                creator = ticket.created_by
                creator_roles = (
                    set(creator.roles.values_list('role', flat=True)) if creator else set()
                )
                targets = sorted(creator_roles & ALL_NODES) or ['comercial']
            else:
                # Usuario respondió → notificar a soporte.
                targets = ['soporte']
            emit_event(
                source='soporte',
                targets=targets,
                event_type='ticket_comentario',
                message=f'Nuevo comentario en ticket #{ticket.id}',
                ref_type='ticket',
                ref_id=ticket.id,
            )
        except Exception:
            pass

        return Response(
            {'data': TicketCommentSerializer(comment).data},
            status=status.HTTP_201_CREATED,
        )


# ─── Adjuntos: endpoints ─────────────────────────────────────────────────────

def _ticket_or_403(request, ticket_id):
    try:
        ticket = Ticket.objects.get(pk=ticket_id)
    except Ticket.DoesNotExist:
        return None, Response({'detail': 'Ticket no encontrado'}, status=status.HTTP_404_NOT_FOUND)
    if not can_access_soporte_features(request.user) and ticket.created_by_id != request.user.id:
        return None, Response({'detail': 'Sin permiso'}, status=status.HTTP_403_FORBIDDEN)
    return ticket, None


class TicketAttachmentListCreateView(APIView):
    """GET / POST /api/v1/soporte/tickets/<id>/attachments/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, ticket_id):
        ticket, err = _ticket_or_403(request, ticket_id)
        if err:
            return err
        qs = ticket.attachments.all()
        return Response({'data': TicketAttachmentSerializer(qs, many=True).data})

    def post(self, request, ticket_id):
        ticket, err = _ticket_or_403(request, ticket_id)
        if err:
            return err

        blocked = _closed_or_none(ticket)
        if blocked:
            return blocked

        files = request.FILES.getlist('files') if hasattr(request, 'FILES') else []
        if not files:
            return Response({'detail': 'No se recibieron archivos.'}, status=status.HTTP_400_BAD_REQUEST)

        current = ticket.attachments.count()
        if current + len(files) > ATTACHMENT_MAX_COUNT:
            return Response(
                {'detail': f'Máximo {ATTACHMENT_MAX_COUNT} archivos por ticket ({current} ya cargados).'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        for f in files:
            err_msg = _validate_uploaded_file(f)
            if err_msg:
                return Response({'detail': err_msg}, status=status.HTTP_400_BAD_REQUEST)

        created = [_attach_file(ticket, f, request.user) for f in files]

        # Notificar a soporte que hay nuevo adjunto (excepto si el que sube ya es soporte).
        try:
            if not can_access_soporte_features(request.user):
                emit_event(
                    source='comercial',
                    targets=['soporte'],
                    event_type='ticket_adjunto',
                    message=f'Nuevo adjunto en ticket #{ticket.id}',
                    ref_type='ticket',
                    ref_id=ticket.id,
                )
        except Exception:
            pass

        return Response(
            {'data': TicketAttachmentSerializer(created, many=True).data},
            status=status.HTTP_201_CREATED,
        )


class TicketAttachmentDownloadView(APIView):
    """GET /api/v1/soporte/tickets/<id>/attachments/<aid>/download/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, ticket_id, aid):
        ticket, err = _ticket_or_403(request, ticket_id)
        if err:
            return err
        try:
            att = ticket.attachments.get(pk=aid)
        except TicketAttachment.DoesNotExist:
            raise Http404('Adjunto no encontrado')
        if not att.file:
            raise Http404('Archivo no disponible')
        resp = FileResponse(
            att.file.open('rb'),
            as_attachment=True,
            filename=att.original_name,
            content_type=att.content_type or 'application/octet-stream',
        )
        return resp


class TicketAttachmentDeleteView(APIView):
    """DELETE /api/v1/soporte/tickets/<id>/attachments/<aid>/"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, ticket_id, aid):
        ticket, err = _ticket_or_403(request, ticket_id)
        if err:
            return err

        blocked = _closed_or_none(ticket)
        if blocked:
            return blocked

        try:
            att = ticket.attachments.get(pk=aid)
        except TicketAttachment.DoesNotExist:
            return Response({'detail': 'Adjunto no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        # Solo el uploader o soporte puede borrar.
        if att.uploaded_by_id != request.user.id and not can_access_soporte_features(request.user):
            return Response({'detail': 'Sin permiso para eliminar este adjunto'}, status=status.HTTP_403_FORBIDDEN)
        try:
            att.file.delete(save=False)
        except Exception:
            pass
        att.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
