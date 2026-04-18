from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.db.session import get_session
from app.models import (
    Anticipo,
    Despacho,
    FacturaCompra,
    Ingreso,
    Lote,
    Movimiento,
    OrdenFabricacion,
    PedidoMaterial,
    Plano,
)

router = APIRouter()


@router.get("/")
async def get_comercial_status():
    return {"module": "Comercial", "status": "active"}


@router.get("/ordenes-fabricacion")
async def list_ordenes(session: AsyncSession = Depends(get_session)):
    result = await session.scalars(select(OrdenFabricacion))
    ordenes = result.all()
    return {"data": [o.model_dump() for o in ordenes]}


@router.post("/ordenes-fabricacion")
async def create_of(payload: dict, session: AsyncSession = Depends(get_session)):
    orden = OrdenFabricacion(
        cliente=payload.get("cliente", ""),
        descripcion=payload.get("descripcion", ""),
        plazo_entrega=payload.get("plazo_entrega", ""),
        monto_anticipo=float(payload.get("monto_anticipo") or 0),
        estado="pendiente_anticipo",
    )
    session.add(orden)
    await session.flush()

    anticipo = Anticipo(
        of_id=orden.id,
        cliente=orden.cliente,
        monto_estimado=orden.monto_anticipo,
        estado="pendiente",
        pagado=False,
    )
    session.add(anticipo)
    await session.commit()
    await session.refresh(orden)
    await session.refresh(anticipo)

    return {
        "message": "OF creada. Anticipo pendiente de validación por Administración",
        "data": {"orden": orden.model_dump(), "anticipo": anticipo.model_dump()},
    }


@router.get("/ordenes-fabricacion/{of_id}")
async def get_of(of_id: int, session: AsyncSession = Depends(get_session)):
    orden = await session.get(OrdenFabricacion, of_id)
    if orden is None:
        raise HTTPException(status_code=404, detail=f"OF {of_id} no encontrada")
    return {"data": orden.model_dump()}


@router.get("/anticipos")
async def list_anticipos(session: AsyncSession = Depends(get_session)):
    result = await session.scalars(select(Anticipo))
    anticipos = result.all()
    return {"data": [a.model_dump() for a in anticipos]}


def _fue_modificado(created, updated) -> bool:
    if created is None or updated is None:
        return False
    return (updated - created) > timedelta(seconds=1)


@router.get("/ordenes-fabricacion/{of_id}/timeline")
async def timeline_of(of_id: int, session: AsyncSession = Depends(get_session)):
    orden = await session.get(OrdenFabricacion, of_id)
    if orden is None:
        raise HTTPException(status_code=404, detail=f"OF {of_id} no encontrada")

    anticipos = (
        await session.scalars(select(Anticipo).where(Anticipo.of_id == of_id))
    ).all()
    pedidos = (
        await session.scalars(select(PedidoMaterial).where(PedidoMaterial.of_id == of_id))
    ).all()
    planos = (
        await session.scalars(select(Plano).where(Plano.of_id == of_id))
    ).all()
    movimientos = (
        await session.scalars(select(Movimiento).where(Movimiento.of_id == of_id))
    ).all()
    lotes = (
        await session.scalars(select(Lote).where(Lote.of_id == of_id))
    ).all()

    pedido_ids = [p.id for p in pedidos]
    facturas = []
    if pedido_ids:
        facturas = (
            await session.scalars(
                select(FacturaCompra).where(
                    FacturaCompra.pedido_material_id.in_(pedido_ids)
                )
            )
        ).all()

    factura_ids = [f.id for f in facturas]
    ingresos = []
    if factura_ids:
        ingresos = (
            await session.scalars(
                select(Ingreso).where(Ingreso.factura_id.in_(factura_ids))
            )
        ).all()

    lote_ids = [l.id for l in lotes]
    despachos = []
    if lote_ids:
        despachos = (
            await session.scalars(
                select(Despacho).where(Despacho.lote_id.in_(lote_ids))
            )
        ).all()

    eventos = []

    eventos.append({
        "timestamp": orden.created_at,
        "dominio": "comercial",
        "tipo": "of.creada",
        "mensaje": f"OF #{orden.id} creada para {orden.cliente}",
        "referencia": {"entidad": "orden_fabricacion", "id": orden.id},
        "estado": "pendiente_anticipo",
    })
    if _fue_modificado(orden.created_at, orden.updated_at):
        eventos.append({
            "timestamp": orden.updated_at,
            "dominio": "comercial",
            "tipo": f"of.{orden.estado}",
            "mensaje": f"OF #{orden.id} pasó a estado: {orden.estado}",
            "referencia": {"entidad": "orden_fabricacion", "id": orden.id},
            "estado": orden.estado,
        })

    for a in anticipos:
        eventos.append({
            "timestamp": a.created_at,
            "dominio": "comercial",
            "tipo": "anticipo.creado",
            "mensaje": f"Anticipo #{a.id} registrado (monto estimado: {a.monto_estimado})",
            "referencia": {"entidad": "anticipo", "id": a.id},
            "estado": "pendiente",
        })
        if _fue_modificado(a.created_at, a.updated_at):
            eventos.append({
                "timestamp": a.updated_at,
                "dominio": "administracion",
                "tipo": f"anticipo.{a.estado}",
                "mensaje": f"Anticipo #{a.id} {a.estado}" + (f" — {a.observacion}" if a.observacion else ""),
                "referencia": {"entidad": "anticipo", "id": a.id},
                "estado": a.estado,
            })

    for p in pedidos:
        eventos.append({
            "timestamp": p.created_at,
            "dominio": "desarrollo",
            "tipo": "pedido_material.generado",
            "mensaje": f"Pedido de materiales #{p.id} generado por {p.emisor}",
            "referencia": {"entidad": "pedido_material", "id": p.id},
            "estado": "generado",
        })
        if _fue_modificado(p.created_at, p.updated_at):
            eventos.append({
                "timestamp": p.updated_at,
                "dominio": "desarrollo",
                "tipo": f"pedido_material.{p.estado}",
                "mensaje": f"Pedido #{p.id} pasó a estado: {p.estado}",
                "referencia": {"entidad": "pedido_material", "id": p.id},
                "estado": p.estado,
            })

    for pl in planos:
        eventos.append({
            "timestamp": pl.created_at,
            "dominio": "desarrollo",
            "tipo": "plano.enviado",
            "mensaje": f"Plano #{pl.id} enviado ({pl.descripcion})",
            "referencia": {"entidad": "plano", "id": pl.id},
            "estado": "enviado",
        })

    for f in facturas:
        eventos.append({
            "timestamp": f.created_at,
            "dominio": "compras",
            "tipo": "factura_compra.registrada",
            "mensaje": f"Factura #{f.id} registrada — proveedor: {f.proveedor} (total: {f.monto_total})",
            "referencia": {"entidad": "factura_compra", "id": f.id},
            "estado": "registrada",
        })
        if _fue_modificado(f.created_at, f.updated_at):
            eventos.append({
                "timestamp": f.updated_at,
                "dominio": "panol",
                "tipo": f"factura_compra.{f.estado}",
                "mensaje": f"Factura #{f.id} pasó a estado: {f.estado}",
                "referencia": {"entidad": "factura_compra", "id": f.id},
                "estado": f.estado,
            })

    for i in ingresos:
        eventos.append({
            "timestamp": i.created_at,
            "dominio": "panol",
            "tipo": "ingreso.registrado",
            "mensaje": f"Ingreso #{i.id} de materiales al stock",
            "referencia": {"entidad": "ingreso", "id": i.id},
            "estado": "ingresado",
        })

    for m in movimientos:
        eventos.append({
            "timestamp": m.created_at,
            "dominio": "panol",
            "tipo": "movimiento.despachado_produccion",
            "mensaje": f"Movimiento #{m.id} despachado a Producción",
            "referencia": {"entidad": "movimiento", "id": m.id},
            "estado": "despachado",
        })

    for l in lotes:
        eventos.append({
            "timestamp": l.created_at,
            "dominio": "produccion",
            "tipo": "lote.terminado",
            "mensaje": f"Lote #{l.id} finalizado",
            "referencia": {"entidad": "lote", "id": l.id},
            "estado": "terminado",
        })
        if _fue_modificado(l.created_at, l.updated_at):
            eventos.append({
                "timestamp": l.updated_at,
                "dominio": "produccion",
                "tipo": f"lote.{l.estado}",
                "mensaje": f"Lote #{l.id} pasó a estado: {l.estado}",
                "referencia": {"entidad": "lote", "id": l.id},
                "estado": l.estado,
            })

    for d in despachos:
        eventos.append({
            "timestamp": d.created_at,
            "dominio": "logistica",
            "tipo": "despacho.creado",
            "mensaje": f"Despacho #{d.id} creado — destino: {d.destino}",
            "referencia": {"entidad": "despacho", "id": d.id},
            "estado": "pendiente",
        })
        if _fue_modificado(d.created_at, d.updated_at):
            dominio = "administracion" if d.estado in ("autorizado", "rechazado") else "logistica"
            eventos.append({
                "timestamp": d.updated_at,
                "dominio": dominio,
                "tipo": f"despacho.{d.estado}",
                "mensaje": f"Despacho #{d.id} pasó a estado: {d.estado}"
                + (f" — {d.observacion_admin}" if d.observacion_admin else ""),
                "referencia": {"entidad": "despacho", "id": d.id},
                "estado": d.estado,
            })

    eventos.sort(key=lambda e: e["timestamp"])

    return {
        "orden": orden.model_dump(),
        "total_eventos": len(eventos),
        "timeline": eventos,
    }
