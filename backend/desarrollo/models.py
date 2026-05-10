from django.db import models


class PedidoMaterial(models.Model):
    of_id = models.ForeignKey('comercial.OrdenFabricacion', on_delete=models.CASCADE, db_column='of_id')
    emisor = models.CharField(max_length=255)
    fecha = models.DateField(null=True, blank=True)
    plazo_entrega = models.CharField(max_length=255, blank=True, default="")
    equipo = models.CharField(max_length=255, blank=True, default="")
    estado = models.CharField(max_length=50, default="generado")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "pedidos_material"


class OrdenCompra(models.Model):
    pm_id = models.ForeignKey('PedidoMaterial', on_delete=models.CASCADE, db_column='pm_id')
    estado = models.CharField(max_length=50, default="emitida")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ordenes_compra"


class PedidoMaterialItem(models.Model):
    pedido_id = models.ForeignKey('PedidoMaterial', on_delete=models.CASCADE, related_name='items', db_column='pedido_id')
    cantidad = models.FloatField()
    descripcion = models.TextField()
    uso_en = models.CharField(max_length=255, blank=True, default="")
    observaciones = models.TextField(blank=True, default="")
    oc_id = models.ForeignKey('OrdenCompra', null=True, blank=True, on_delete=models.SET_NULL, db_column='oc_id')
    oc_fecha = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "pedidos_material_items"


class Plano(models.Model):
    of_id = models.ForeignKey('comercial.OrdenFabricacion', on_delete=models.CASCADE, db_column='of_id')
    descripcion = models.TextField()
    archivo_nombre = models.CharField(max_length=255)
    archivo_tipo = models.CharField(max_length=100)
    archivo_tamanio = models.IntegerField()
    archivo = models.FileField(upload_to='planos/', null=True, blank=True)
    estado = models.CharField(max_length=50, default="enviado")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "planos"
