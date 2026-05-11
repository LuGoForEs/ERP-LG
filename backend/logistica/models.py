from django.db import models


class Despacho(models.Model):
    lote_id = models.ForeignKey('produccion.Lote', on_delete=models.CASCADE, db_column='lote_id')
    destino = models.CharField(max_length=255)
    transportista = models.CharField(max_length=255, blank=True, default="")
    estado = models.CharField(max_length=50, default="pendiente")
    observacion_admin = models.TextField(blank=True, default="")
    comprobante_saldo = models.FileField(upload_to='comprobantes_saldo/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "despachos"
