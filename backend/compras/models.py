from django.db import models

class Proveedor(models.Model):
    nombre = models.CharField(max_length=255, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "proveedores"

class Insumo(models.Model):
    nombre = models.CharField(max_length=255, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "insumos"

class FacturaCompra(models.Model):
    pedido_material_id = models.ForeignKey('desarrollo.PedidoMaterial', on_delete=models.CASCADE, db_column='pedido_material_id')
    proveedor = models.CharField(max_length=255, blank=True, default="")
    monto_total = models.FloatField(default=0.0)
    estado = models.CharField(max_length=50, default="registrada")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "facturas_compra"

class MaterialCompra(models.Model):
    factura_id = models.ForeignKey('FacturaCompra', on_delete=models.CASCADE, related_name='materiales', db_column='factura_id')
    nombre = models.CharField(max_length=255)
    cantidad = models.FloatField()
    precio_unitario = models.FloatField()
    unidad_medida = models.CharField(max_length=50, default="unidades")
    proveedor = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        db_table = "materiales_compra"