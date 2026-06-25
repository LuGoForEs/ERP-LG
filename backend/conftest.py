import pytest
from rest_framework.test import APIClient


@pytest.fixture
def auth_user(db):
    """Usuario autenticado básico. La autorización por defecto del API es
    IsAuthenticated (el RBAC por panel no se aplica a nivel de vista), por lo
    que cualquier usuario válido habilita el acceso; la lógica de negocio
    (p. ej. OF aprobada) sigue evaluándose igual."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    return User.objects.create_user(username='tester', password='testpass123')


@pytest.fixture
def api_client(auth_user):
    client = APIClient()
    client.force_authenticate(user=auth_user)
    return client
