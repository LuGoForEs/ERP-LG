from django.db import models


class Proveedor(models.Model):
    nombre = models.CharField(max_length=255, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "proveedores"


class Insumo(models.Model):
    nombre = models.CharField(max_length=255, unique=True, db_index=True)
    categoria = models.CharField(max_length=100, blank=True, default='')
    subcategoria = models.CharField(max_length=100, blank=True, default='')
    unidad = models.CharField(max_length=20, blank=True, default='u')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "insumos"


class FacturaCompra(models.Model):
    pedido_material_id = models.ForeignKey(
        'desarrollo.PedidoMaterial', on_delete=models.CASCADE,
        null=True, blank=True, db_column='pedido_material_id'
    )
    monto_total = models.FloatField(default=0.0)
    estado = models.CharField(max_length=50, default="registrada")
    pdf_archivo = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def proveedor(self):
        nombres = list(
            self.materiales
            .exclude(proveedor=None)
            .values_list('proveedor__nombre', flat=True)
            .distinct()
        )
        if not nombres:
            return "Sin proveedor"
        return nombres[0] if len(nombres) == 1 else "Varios"

    class Meta:
        db_table = "facturas_compra"


class MaterialCompra(models.Model):
    factura_id = models.ForeignKey(
        'FacturaCompra', on_delete=models.CASCADE, related_name='materiales', db_column='factura_id'
    )
    insumo = models.ForeignKey(
        'Insumo', null=True, on_delete=models.CASCADE, related_name='materiales_compra', db_column='insumo_id'
    )
    cantidad = models.FloatField()
    precio_unitario = models.FloatField()
    unidad_medida = models.CharField(max_length=50, default="unidades")
    proveedor = models.ForeignKey(
        'Proveedor', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='materiales_compra', db_column='proveedor_id'
    )

    @property
    def nombre(self):
        return self.insumo.nombre

    class Meta:
        db_table = "materiales_compra"
