from django.db import models
from django.conf import settings
from simple_history.models import HistoricalRecords


class OrdenFabricacion(models.Model):
    cliente = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, default="")
    plazo_entrega = models.CharField(max_length=255, blank=True, default="")
    monto_anticipo = models.FloatField(default=0.0)
    moneda_anticipo = models.CharField(max_length=10, default="ARS")
    anticipo_descripcion = models.TextField(null=True, blank=True)
    estado = models.CharField(max_length=50, default="pendiente_anticipo")
    responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='ordenes_fabricacion',
        db_column='responsable_id'
    )
    plazo_anticipo_dias = models.IntegerField(default=7)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    history = HistoricalRecords()

    class Meta:
        db_table = "ordenes_fabricacion"


class Anticipo(models.Model):
    of_id = models.ForeignKey('OrdenFabricacion', on_delete=models.CASCADE, related_name='anticipos', db_column='of_id')
    monto_estimado = models.FloatField(default=0.0)
    estado = models.CharField(max_length=50, default="pendiente")
    pagado = models.BooleanField(default=False)
    observacion = models.TextField(blank=True, default="")
    factura_archivo = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    history = HistoricalRecords()

    class Meta:
        db_table = "anticipos"