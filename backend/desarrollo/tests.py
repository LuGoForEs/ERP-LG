import pytest
from rest_framework.test import APIClient
from comercial.factories import OrdenFabricacionFactory, AnticipoFactory

@pytest.mark.django_db
def test_crear_pedido_material_exito(api_client: APIClient):
    orden = OrdenFabricacionFactory(estado="aprobada")
    AnticipoFactory(of_id=orden, estado="validado", pagado=True)
    
    payload = {
        "of_id": orden.id,
        "emisor": "Ingenieria",
        "fecha": "2026-04-24",
        "equipo": "Tanque 5000L",
        "items": [
            {
                "cantidad": 10.5,
                "descripcion": "Chapa acero 3mm"
            },
            {
                "cantidad": 5,
                "descripcion": "Válvulas 2 pulgadas"
            }
        ]
    }
    
    response = api_client.post('/api/v1/desarrollo/pedidos-material', payload, format='json')
    assert response.status_code == 200
    
    data = response.json()["data"]
    assert data["estado"] == "generado"
    assert len(data["items"]) == 2

@pytest.mark.django_db
def test_crear_pedido_material_rechazado_si_of_no_aprobada(api_client: APIClient):
    orden = OrdenFabricacionFactory(estado="pendiente_anticipo")
    
    payload = {
        "of_id": orden.id,
        "emisor": "Ingenieria",
        "fecha": "2026-04-24",
        "items": [
            {
                "cantidad": 10.5,
                "descripcion": "Chapa acero 3mm"
            }
        ]
    }
    
    response = api_client.post('/api/v1/desarrollo/pedidos-material', payload, format='json')
    assert response.status_code == 403
    assert "no disponible" in response.json()["detail"]
