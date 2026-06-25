import pytest
from rest_framework.test import APIClient
from comercial.factories import OrdenFabricacionFactory
from desarrollo.models import PedidoMaterial, OrdenCompra

@pytest.mark.django_db
def test_registrar_factura_exito(api_client: APIClient):
    orden = OrdenFabricacionFactory(estado="aprobada")
    pedido = PedidoMaterial.objects.create(of_id=orden, emisor="Ing", fecha="2026-01-01", estado="generado")
    
    payload = {
        "pedido_material_id": pedido.id,
        "materiales": [
            {
                "nombre": "Chapa acero 3mm",
                "cantidad": 10.5,
                "unidad_medida": "kilogramos",
                "precio_unitario": 1500.0,
                "proveedor": "Acindar"
            }
        ]
    }
    
    response = api_client.post('/api/v1/compras/facturas', payload, format='json')
    assert response.status_code == 200
    
    data = response.json()["data"]
    assert data["estado"] == "registrada"
    assert data["monto_total"] == 15750.0 # 10.5 * 1500
    assert len(data["materiales"]) == 1
    
    # Verificar que el pedido cambió de estado
    pedido.refresh_from_db()
    assert pedido.estado == "facturado"

@pytest.mark.django_db
def test_registrar_factura_falla_si_ya_facturado(api_client: APIClient):
    orden = OrdenFabricacionFactory(estado="aprobada")
    pedido = PedidoMaterial.objects.create(of_id=orden, emisor="Ing", fecha="2026-01-01", estado="facturado")
    
    payload = {
        "pedido_material_id": pedido.id,
        "materiales": []
    }
    
    response = api_client.post('/api/v1/compras/facturas', payload, format='json')
    assert response.status_code == 400
    assert "ya fue facturado" in response.json()[0]
