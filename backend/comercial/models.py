from django.db import models

class OrdenFabricacion(models.Model):
    cliente = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, default="")
    plazo_entrega = models.CharField(max_length=255, blank=True, default="")
    monto_anticipo = models.FloatField(default=0.0)
    moneda_anticipo = models.CharField(max_length=10, default="ARS")
    anticipo_descripcion = models.TextField(null=True, blank=True)
    estado = models.CharField(max_length=50, default="pendiente_anticipo")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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

    class Meta:
        db_table = "anticipos"