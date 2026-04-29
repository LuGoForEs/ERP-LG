from django.db import models


class Ingreso(models.Model):
    factura_id = models.ForeignKey('compras.FacturaCompra', on_delete=models.CASCADE, db_column='factura_id')
    estado = models.CharField(max_length=50, default="ingresado")
    snapshot = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ingresos"


class Stock(models.Model):
    insumo = models.OneToOneField(
        'compras.Insumo', on_delete=models.CASCADE,
        related_name='stock_entry', db_column='insumo_id'
    )
    unidad = models.CharField(max_length=50, default="u")
    cantidad = models.FloatField(default=0.0)

    @property
    def nombre(self):
        return self.insumo.nombre

    class Meta:
        db_table = "stock"


class Movimiento(models.Model):
    of_id = models.ForeignKey('comercial.OrdenFabricacion', on_delete=models.CASCADE, db_column='of_id')
    estado = models.CharField(max_length=50, default="despachado")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "movimientos"


class MovimientoItem(models.Model):
    movimiento_id = models.ForeignKey('Movimiento', on_delete=models.CASCADE, related_name='items', db_column='movimiento_id')
    insumo = models.ForeignKey(
        'compras.Insumo', on_delete=models.CASCADE,
        related_name='movimiento_items', db_column='insumo_id'
    )
    cantidad = models.FloatField()
    unidad = models.CharField(max_length=50, default="u")

    @property
    def nombre(self):
        return self.insumo.nombre

    class Meta:
        db_table = "movimientos_items"
