from rest_framework import serializers
from .models import Lote


class LoteSerializer(serializers.ModelSerializer):
    planos_asociados = serializers.SerializerMethodField()
    movimientos_asociados = serializers.SerializerMethodField()

    def get_planos_asociados(self, obj):
        return list(obj.planos.values_list('id', flat=True))

    def get_movimientos_asociados(self, obj):
        return list(obj.movimientos.values_list('id', flat=True))

    class Meta:
        model = Lote
        fields = ['id', 'of_id', 'descripcion', 'planos_asociados', 'movimientos_asociados', 'estado', 'created_at', 'updated_at']
