from django.test import TestCase
from rest_framework.test import APIClient
from .models import OrdenFabricacion, Anticipo

class ComercialAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
    def test_list_ordenes_fabricacion_empty(self):
        response = self.client.get('/api/v1/comercial/ordenes-fabricacion')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"data": []})

    def test_create_orden_fabricacion(self):
        payload = {
            "cliente": "Test Client",
            "descripcion": "Test Description",
            "plazo_entrega": "10 days",
            "monto_anticipo": 100.0,
            "moneda_anticipo": "USD",
            "anticipo_descripcion": "Test Advance"
        }
        response = self.client.post('/api/v1/comercial/ordenes-fabricacion', payload, format='json')
        self.assertEqual(response.status_code, 201)
        
        data = response.json()
        self.assertIn("message", data)
        self.assertIn("data", data)
        
        orden = data["data"]["orden"]
        self.assertEqual(orden["cliente"], "Test Client")
        self.assertEqual(orden["estado"], "pendiente_anticipo")
        
        anticipo = data["data"]["anticipo"]
        self.assertEqual(anticipo["estado"], "pendiente")
        self.assertEqual(anticipo["monto_estimado"], 100.0)

    def test_timeline(self):
        payload = {
            "cliente": "Test Client",
        }
        response = self.client.post('/api/v1/comercial/ordenes-fabricacion', payload, format='json')
        orden_id = response.json()["data"]["orden"]["id"]
        
        timeline_response = self.client.get(f'/api/v1/comercial/ordenes-fabricacion/{orden_id}/timeline')
        self.assertEqual(timeline_response.status_code, 200)
        timeline_data = timeline_response.json()
        self.assertIn("total_eventos", timeline_data)
        self.assertIn("timeline", timeline_data)
        self.assertGreater(len(timeline_data["timeline"]), 0)
