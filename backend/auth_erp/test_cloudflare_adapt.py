"""Tests de regresión para las adaptaciones a Cloudflare."""
from __future__ import annotations

import pytest
from django.core.cache import cache
from django.test import RequestFactory
from rest_framework.exceptions import ValidationError

from auth_erp.middleware import CloudflareIPMiddleware
from auth_erp.utils import validate_search_q, validate_file_signature


# ─── Middleware: CF-Connecting-IP ─────────────────────────────────────────────

@pytest.fixture
def rf():
    return RequestFactory()


def _run_mw(request):
    captured = {}
    def view(req):
        captured['remote_addr'] = req.META.get('REMOTE_ADDR')
        captured['orig']        = req.META.get('HTTP_X_REMOTE_ADDR_ORIG')
        return 'ok'
    CloudflareIPMiddleware(view)(request)
    return captured


def test_middleware_uses_cf_connecting_ip_when_peer_is_trusted_proxy(rf):
    req = rf.get('/')
    req.META['REMOTE_ADDR'] = '172.18.0.5'  # red docker
    req.META['HTTP_CF_CONNECTING_IP'] = '203.0.113.10'
    out = _run_mw(req)
    assert out['remote_addr'] == '203.0.113.10'
    assert out['orig'] == '172.18.0.5'


def test_middleware_falls_back_to_x_forwarded_for(rf):
    req = rf.get('/')
    req.META['REMOTE_ADDR'] = '10.0.0.2'
    req.META['HTTP_X_FORWARDED_FOR'] = '198.51.100.7, 172.18.0.1'
    out = _run_mw(req)
    assert out['remote_addr'] == '198.51.100.7'


def test_middleware_ignores_headers_when_peer_is_public(rf):
    req = rf.get('/')
    req.META['REMOTE_ADDR'] = '203.0.113.50'  # peer público (no proxy de confianza)
    req.META['HTTP_CF_CONNECTING_IP'] = '1.2.3.4'  # ignorado
    out = _run_mw(req)
    assert out['remote_addr'] == '203.0.113.50'
    assert out['orig'] is None


def test_middleware_no_headers_no_op(rf):
    req = rf.get('/')
    req.META['REMOTE_ADDR'] = '172.18.0.5'
    out = _run_mw(req)
    assert out['remote_addr'] == '172.18.0.5'


# ─── validate_search_q ────────────────────────────────────────────────────────

def test_search_q_accepts_normal_strings():
    assert validate_search_q('tornillo M6') == 'tornillo M6'
    assert validate_search_q(' acero_inox ') == 'acero_inox'
    assert validate_search_q('pintura epóxica') == 'pintura epóxica'
    assert validate_search_q('') == ''
    assert validate_search_q(None) == ''


def test_search_q_rejects_sqli_like_payloads():
    for bad in ["'; DROP TABLE--", "1' OR '1'='1", '<script>', 'foo;bar', 'a"b']:
        with pytest.raises(ValidationError):
            validate_search_q(bad)


def test_search_q_max_length():
    assert validate_search_q('x' * 100) == 'x' * 100
    with pytest.raises(ValidationError):
        validate_search_q('x' * 101)


# ─── validate_file_signature ──────────────────────────────────────────────────

class _FakeUpload:
    def __init__(self, payload: bytes, name: str = 'f.bin'):
        self.payload = payload
        self.pos = 0
        self.name = name
        self.size = len(payload)

    def read(self, n=None):
        chunk = self.payload[self.pos:(self.pos + n) if n else None]
        self.pos += len(chunk)
        return chunk

    def seek(self, p):
        self.pos = p


def test_file_signature_accepts_pdf():
    validate_file_signature(_FakeUpload(b'%PDF-1.7\nrest'), allowed_families=['pdf'])


def test_file_signature_accepts_xlsx_zip_header():
    validate_file_signature(_FakeUpload(b'PK\x03\x04rest_of_zip'), allowed_families=['xlsx'])


def test_file_signature_rejects_mismatch():
    with pytest.raises(ValidationError):
        validate_file_signature(_FakeUpload(b'PK\x03\x04junk'), allowed_families=['pdf'])
    with pytest.raises(ValidationError):
        validate_file_signature(_FakeUpload(b'\xff\xd8\xff\xe0'), allowed_families=['pdf'])


def test_file_signature_max_size():
    big = _FakeUpload(b'%PDF-' + b'x' * (3 * 1024 * 1024))
    with pytest.raises(ValidationError):
        validate_file_signature(big, allowed_families=['pdf'], max_size_mb=2)


# ─── LoginRateThrottle: 6 POSTs → 429 ─────────────────────────────────────────

@pytest.mark.django_db
def test_login_throttle_blocks_after_5_attempts(api_client, settings):
    cache.clear()
    url = '/api/v1/auth/login/'
    # Sin TURNSTILE_SECRET_KEY, _verify_recaptcha pasa siempre.
    settings.RECAPTCHA_SECRET_KEY = ''
    payload = {'email': 'noexiste@example.com', 'password': 'x', 'turnstile_token': 't'}

    statuses = []
    for _ in range(6):
        r = api_client.post(url, payload, format='json')
        statuses.append(r.status_code)

    # Los primeros 5 son 401 (credenciales malas), el 6º es 429 (throttle).
    assert statuses[:5] == [401] * 5
    assert statuses[5] == 429
