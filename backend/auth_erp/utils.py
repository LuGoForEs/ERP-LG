"""Utilidades compartidas para sanitización de input expuesto al WAF.

Centraliza la validación de parámetros que viajan en query strings y son
candidatos a disparar reglas OWASP (SQLi, XSS) cuando contienen caracteres
especiales — aunque el ORM esté blindado, el WAF de Cloudflare puede bloquear
el request antes de llegar al backend.

También expone validación por firma de archivos (magic bytes) para uploads,
evitando que el WAF/origen reciba binarios sin tipo verificable.
"""
from __future__ import annotations

import re

from rest_framework.exceptions import ValidationError

# Letras (incluye acentos y eñe), dígitos, guion bajo, espacio, punto, coma,
# guion medio. NO permite comillas, paréntesis, punto y coma, ni operadores.
_SEARCH_Q_RE = re.compile(r'^[\w\sáéíóúüñÁÉÍÓÚÜÑ.,_\-]{0,100}$')


def validate_search_q(raw, *, field_name: str = 'q') -> str:
    """Valida un parámetro de búsqueda libre. Devuelve el string normalizado
    (trim). Si trae caracteres no permitidos, lanza DRF ValidationError 400."""
    if raw is None:
        return ''
    s = str(raw).strip()
    if not s:
        return ''
    if not _SEARCH_Q_RE.match(s):
        raise ValidationError({field_name: 'Parámetro de búsqueda inválido. Usá solo letras, números, espacios o . , _ -'})
    return s


# Firmas (magic bytes) por familia de archivo. Se valida leyendo los primeros
# bytes del upload sin consumirlo (file.seek(0) al final).
_SIGNATURES = {
    'pdf':   [b'%PDF-'],
    # XLSX/DOCX/ODT son zip → comparten encabezado PK\x03\x04 (también PK\x05\x06 para zip vacío).
    'xlsx':  [b'PK\x03\x04', b'PK\x05\x06'],
    'png':   [b'\x89PNG\r\n\x1a\n'],
    'jpeg':  [b'\xff\xd8\xff'],
    'gif':   [b'GIF87a', b'GIF89a'],
}


def _matches_signature(head: bytes, family: str) -> bool:
    return any(head.startswith(sig) for sig in _SIGNATURES.get(family, []))


def validate_file_signature(uploaded, *, allowed_families, max_size_mb: int = 20):
    """Valida un archivo subido (django UploadedFile).

    - `allowed_families`: lista de familias permitidas (claves de `_SIGNATURES`,
      ej. ['pdf'], ['xlsx'], ['png','jpeg']).
    - `max_size_mb`: tamaño máximo en MB.

    Lanza DRF ValidationError 400 si no pasa. Deja el cursor del archivo
    al inicio para que el caller pueda leerlo a continuación.
    """
    if uploaded is None:
        raise ValidationError({'detail': 'Falta el archivo.'})

    max_bytes = max_size_mb * 1024 * 1024
    if uploaded.size and uploaded.size > max_bytes:
        raise ValidationError({'detail': f'El archivo supera el tamaño máximo permitido ({max_size_mb} MB).'})

    try:
        head = uploaded.read(16)
    finally:
        try: uploaded.seek(0)
        except Exception: pass

    if not any(_matches_signature(head, fam) for fam in allowed_families):
        labels = ', '.join(allowed_families)
        raise ValidationError({'detail': f'Tipo de archivo no permitido. Se aceptan: {labels}.'})
    return uploaded
