from rest_framework import serializers
from .models import Stock, Ingreso, Movimiento, MovimientoItem


class StockSerializer(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()

    def get_nombre(self, obj):
        return obj.insumo.nombre

    class Meta:
        model = Stock
        fields = ['id', 'nombre', 'unidad', 'cantidad']


class IngresoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingreso
        fields = '__all__'


class MovimientoItemSerializer(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()

    def get_nombre(self, obj):
        return obj.insumo.nombre

    class Meta:
        model = MovimientoItem
        fields = ['nombre', 'cantidad']


class MovimientoSerializer(serializers.ModelSerializer):
    items = MovimientoItemSerializer(many=True, read_only=True)

    class Meta:
        model = Movimiento
        fields = ['id', 'of_id', 'estado', 'items']
