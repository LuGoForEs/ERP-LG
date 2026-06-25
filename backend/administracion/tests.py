import pytest
from rest_framework.test import APIClient
from comercial.factories import OrdenFabricacionFactory, AnticipoFactory

@pytest.mark.django_db
def test_validar_anticipo_pagado(api_client: APIClient):
    orden = OrdenFabricacionFactory()
    anticipo = AnticipoFactory(of_id=orden)
    
    payload = {
        "pagado": "true",
        "observacion": "Pago recibido en banco"
    }
    
    response = api_client.put(f'/api/v1/administracion/anticipos/{anticipo.id}/validar', payload, format='multipart')
    assert response.status_code == 200
    
    data = response.json()["data"]
    assert data["anticipo"]["estado"] == "validado"
    assert data["anticipo"]["pagado"] is True
    assert data["orden"]["estado"] == "aprobada"

@pytest.mark.django_db
def test_validar_anticipo_rechazado(api_client: APIClient):
    orden = OrdenFabricacionFactory()
    anticipo = AnticipoFactory(of_id=orden)
    
    payload = {
        "pagado": "false",
        "observacion": "Falta firma"
    }
    
    response = api_client.put(f'/api/v1/administracion/anticipos/{anticipo.id}/validar', payload, format='multipart')
    assert response.status_code == 200
    
    data = response.json()["data"]
    assert data["anticipo"]["estado"] == "rechazado"
    assert data["anticipo"]["pagado"] is False
    assert data["orden"]["estado"] == "rechazada_anticipo"
