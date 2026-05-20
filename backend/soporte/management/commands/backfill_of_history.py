"""Siembra registros históricos 'punto cero' usando el created_at real de cada modelo.

Idempotente: si un modelo ya tiene historial, se saltea (no duplica).
Sólo opera sobre los 9 modelos del flujo de OF.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from comercial.models import OrdenFabricacion, Anticipo
from desarrollo.models import PedidoMaterial, OrdenCompra, Plano
from panol.models import Ingreso, Movimiento
from produccion.models import Lote
from logistica.models import Despacho


TRACKED_MODELS = [
    OrdenFabricacion,
    Anticipo,
    PedidoMaterial,
    OrdenCompra,
    Plano,
    Ingreso,
    Movimiento,
    Lote,
    Despacho,
]


class Command(BaseCommand):
    help = 'Siembra historial "punto cero" para registros pre-existentes usando su created_at original.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='No escribe en DB, solo reporta cuántos registros sembraría.')

    def handle(self, *args, **opts):
        dry = opts['dry_run']
        total_seed = 0
        total_skip = 0

        for Model in TRACKED_MODELS:
            HistModel = Model.history.model
            seeded = 0
            skipped = 0

            for inst in Model.objects.all():
                if HistModel.objects.filter(id=inst.pk).exists():
                    skipped += 1
                    continue

                if dry:
                    seeded += 1
                    continue

                with transaction.atomic():
                    # Construir registro histórico con history_type='+' (creación)
                    # y history_date = created_at del modelo (o updated_at si no hay).
                    hist_date = getattr(inst, 'created_at', None) or getattr(inst, 'updated_at', None)
                    if hist_date is None:
                        # No hay forma confiable de fechar — saltar.
                        skipped += 1
                        continue

                    # Cargar todos los campos planos del modelo (sin relaciones M2M).
                    hist_kwargs = {}
                    for f in Model._meta.fields:
                        hist_kwargs[f.attname] = getattr(inst, f.attname)
                    hist_kwargs['history_date'] = hist_date
                    hist_kwargs['history_type'] = '+'
                    hist_kwargs['history_change_reason'] = 'Backfill inicial (pre-auditoría)'

                    HistModel.objects.create(**hist_kwargs)
                    seeded += 1

            total_seed += seeded
            total_skip += skipped
            self.stdout.write(
                f"{Model.__module__}.{Model.__name__}: sembrados={seeded} salteados={skipped}"
            )

        msg = f"Total sembrados: {total_seed} | salteados: {total_skip}"
        if dry:
            msg = "(dry-run) " + msg
        self.stdout.write(self.style.SUCCESS(msg))
