from rest_framework import serializers
from .models import Proveedor, Insumo, FacturaCompra, MaterialCompra


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = ['id', 'nombre']


class InsumoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Insumo
        fields = ['id', 'nombre']


class MaterialCompraSerializer(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()
    proveedor = serializers.SerializerMethodField()

    def get_nombre(self, obj):
        return obj.insumo.nombre

    def get_proveedor(self, obj):
        return obj.proveedor.nombre if obj.proveedor else ''

    class Meta:
        model = MaterialCompra
        fields = ['nombre', 'cantidad', 'unidad_medida', 'precio_unitario', 'proveedor']


class FacturaCompraSerializer(serializers.ModelSerializer):
    materiales = MaterialCompraSerializer(many=True, read_only=True)
    proveedor = serializers.SerializerMethodField()

    def get_proveedor(self, obj):
        return obj.proveedor

    class Meta:
        model = FacturaCompra
        fields = ['id', 'pedido_material_id', 'proveedor', 'monto_total', 'estado', 'materiales']
