from rest_framework import serializers
from .models import OrdenFabricacion, Anticipo

class OrdenFabricacionSerializer(serializers.ModelSerializer):
    responsable_nombre = serializers.SerializerMethodField()

    class Meta:
        model = OrdenFabricacion
        fields = '__all__'

    def get_responsable_nombre(self, obj):
        if obj.responsable:
            return obj.responsable.get_full_name() or obj.responsable.username
        return None

class AnticipoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Anticipo
        fields = '__all__'

class OrdenFabricacionCreateSerializer(serializers.Serializer):
    cliente = serializers.CharField(max_length=255)
    descripcion = serializers.CharField(required=False, allow_blank=True, default="")
    plazo_entrega = serializers.CharField(required=False, allow_blank=True, default="")
    monto_anticipo = serializers.FloatField(required=False, default=0.0)
    moneda_anticipo = serializers.CharField(required=False, default="ARS")
    anticipo_descripcion = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    plazo_anticipo_dias = serializers.IntegerField(required=False, default=7, min_value=1)