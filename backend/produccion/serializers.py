from rest_framework import serializers
from .models import Lote


class LoteSerializer(serializers.ModelSerializer):
    planos_asociados = serializers.SerializerMethodField()
    movimientos_asociados = serializers.SerializerMethodField()

    def get_planos_asociados(self, obj):
        result = []
        for p in obj.planos.all():
            result.append({
                'id': p.id,
                'descripcion': p.descripcion,
                'archivo_nombre': p.archivo_nombre,
                'tiene_archivo': bool(p.archivo),
            })
        return result

    def get_movimientos_asociados(self, obj):
        return list(obj.movimientos.values_list('id', flat=True))

    class Meta:
        model = Lote
        fields = ['id', 'of_id', 'descripcion', 'planos_asociados', 'movimientos_asociados', 'estado', 'observaciones', 'created_at', 'updated_at']
