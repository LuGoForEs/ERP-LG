from celery import shared_task
from django.utils import timezone
from .models import OrdenFabricacion, Anticipo


@shared_task(name='comercial.tasks.rechazar_ofs_vencidas')
def rechazar_ofs_vencidas():
    """
    Rechaza automáticamente las OFs cuyo plazo de anticipo venció sin ser aprobadas.
    Se ejecuta a las 19:00 ART todos los días via Celery Beat.
    """
    ahora = timezone.now()
    rechazadas = 0

    ofs_pendientes = OrdenFabricacion.objects.filter(
        estado='pendiente_anticipo'
    ).select_related()

    for of in ofs_pendientes:
        if of.plazo_anticipo_dias <= 0:
            continue
        limite = of.created_at + timezone.timedelta(days=of.plazo_anticipo_dias)
        if ahora >= limite:
            of.estado = 'rechazada_anticipo'
            of.save(update_fields=['estado', 'updated_at'])

            Anticipo.objects.filter(of_id=of, estado='pendiente').update(
                estado='rechazado',
                observacion='Rechazado automáticamente por vencimiento del plazo de anticipo.',
            )
            rechazadas += 1

    return f'{rechazadas} OF(s) rechazadas por vencimiento de plazo.'
