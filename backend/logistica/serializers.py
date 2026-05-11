from rest_framework import serializers
from .models import Despacho

class DespachoSerializer(serializers.ModelSerializer):
    of_id = serializers.SerializerMethodField()

    class Meta:
        model = Despacho
        fields = '__all__'

    def get_of_id(self, obj):
        try:
            return obj.lote_id.of_id_id
        except Exception:
            return None