from rest_framework import serializers
from .models import PedidoMaterial, OrdenCompra, PedidoMaterialItem, Plano
from comercial.models import OrdenFabricacion

class PedidoMaterialItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PedidoMaterialItem
        fields = ['id', 'cantidad', 'descripcion', 'uso_en', 'observaciones', 'oc_id', 'oc_fecha']

class PedidoMaterialSerializer(serializers.ModelSerializer):
    items = PedidoMaterialItemSerializer(many=True, read_only=True)

    class Meta:
        model = PedidoMaterial
        fields = ['id', 'of_id', 'emisor', 'fecha', 'plazo_entrega', 'equipo', 'estado', 'items']

class OrdenFabricacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrdenFabricacion
        fields = '__all__'

class PlanoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plano
        fields = '__all__'