from django.db import models
from simple_history.models import HistoricalRecords


class Lote(models.Model):
    of_id = models.ForeignKey('comercial.OrdenFabricacion', on_delete=models.CASCADE, db_column='of_id')
    descripcion = models.TextField(blank=True, default="")
    planos = models.ManyToManyField('desarrollo.Plano', blank=True, related_name='lotes')
    movimientos = models.ManyToManyField('panol.Movimiento', blank=True, related_name='lotes')
    estado = models.CharField(max_length=50, default="pre_produccion")
    observaciones = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    history = HistoricalRecords(excluded_fields=['planos', 'movimientos'])

    class Meta:
        db_table = "lotes"
