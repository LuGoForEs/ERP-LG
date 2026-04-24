import factory
from comercial.models import OrdenFabricacion, Anticipo

class OrdenFabricacionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = OrdenFabricacion
    
    cliente = factory.Faker('company')
    descripcion = factory.Faker('text')
    plazo_entrega = "30 dias"
    monto_anticipo = 150000.0
    moneda_anticipo = "ARS"
    estado = "pendiente_anticipo"

class AnticipoFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Anticipo

    of_id = factory.SubFactory(OrdenFabricacionFactory)
    cliente = factory.SelfAttribute('of_id.cliente')
    monto_estimado = factory.SelfAttribute('of_id.monto_anticipo')
    estado = "pendiente"
    pagado = False
