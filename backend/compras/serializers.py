from rest_framework import serializers
from .models import Proveedor, Insumo, FacturaCompra, MaterialCompra
from desarrollo.serializers import PedidoMaterialSerializer

class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = ['id', 'nombre']

class InsumoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Insumo
        fields = ['id', 'nombre']

class MaterialCompraSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterialCompra
        fields = ['nombre', 'cantidad', 'unidad_medida', 'precio_unitario', 'proveedor']

class FacturaCompraSerializer(serializers.ModelSerializer):
    materiales = MaterialCompraSerializer(many=True, read_only=True)

    class Meta:
        model = FacturaCompra
        fields = ['id', 'pedido_material_id', 'proveedor', 'monto_total', 'estado', 'materiales']