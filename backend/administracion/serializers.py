from rest_framework import serializers
from comercial.models import Anticipo, OrdenFabricacion
from logistica.models import Despacho

class AnticipoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Anticipo
        fields = '__all__'

class OrdenFabricacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrdenFabricacion
        fields = '__all__'

class DespachoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Despacho
        fields = '__all__'