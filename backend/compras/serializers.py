from rest_framework import serializers
from .models import Proveedor, Insumo, FacturaCompra, MaterialCompra


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = ['id', 'nombre']


class InsumoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Insumo
        fields = ['id', 'nombre', 'categoria', 'subcategoria', 'unidad']


class MaterialCompraSerializer(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()
    proveedor = serializers.SerializerMethodField()

    def get_nombre(self, obj):
        return obj.insumo.nombre if obj.insumo else ''

    def get_proveedor(self, obj):
        return obj.proveedor.nombre if obj.proveedor else ''

    class Meta:
        model = MaterialCompra
        fields = ['nombre', 'cantidad', 'unidad_medida', 'precio_unitario', 'proveedor']


class FacturaCompraSerializer(serializers.ModelSerializer):
    materiales = MaterialCompraSerializer(many=True, read_only=True)
    proveedor = serializers.SerializerMethodField()
    tiene_pdf = serializers.SerializerMethodField()
    ingreso = serializers.SerializerMethodField()

    def get_proveedor(self, obj):
        return obj.proveedor

    def get_tiene_pdf(self, obj):
        return bool(obj.pdf_archivo and obj.pdf_archivo.get('datos'))

    def get_ingreso(self, obj):
        i = obj.ingreso_set.first()
        if not i:
            return None
        return {
            'id': i.id,
            'verificacion_estado': i.verificacion_estado,
            'verificacion_notas': i.verificacion_notas,
        }

    class Meta:
        model = FacturaCompra
        fields = ['id', 'pedido_material_id', 'proveedor', 'monto_total', 'estado', 'tiene_pdf', 'ingreso', 'materiales']
