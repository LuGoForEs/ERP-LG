from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.db.session import get_session
from app.models import (
    FacturaCompra,
    Ingreso,
    MaterialCompra,
    Movimiento,
    MovimientoItem,
    Stock,
)

router = APIRouter()


class IngresoCreate(BaseModel):
    factura_id: int


class MaterialDespacho(BaseModel):
    nombre: str
    cantidad: int = Field(gt=0)


class DespachoProduccionCreate(BaseModel):
    of_id: int
    materiales: list[MaterialDespacho]


async def _stock_dict(session: AsyncSession) -> dict[str, int]:
    rows = (await session.scalars(select(Stock))).all()
    return {s.nombre: s.cantidad for s in rows}


async def _ajustar_stock(session: AsyncSession, nombre: str, delta: int):
    s = await session.get(Stock, nombre)
    if s is None:
        s = Stock(nombre=nombre, cantidad=max(delta, 0))
        session.add(s)
    else:
        s.cantidad += delta
        session.add(s)


@router.get("/")
async def get_panol_status():
    return {"module": "Pañol", "status": "active"}


@router.post("/ingresos")
async def registrar_ingreso(
    payload: IngresoCreate,
    session: AsyncSession = Depends(get_session),
):
    result = await session.scalars(
        select(FacturaCompra)
        .where(FacturaCompra.id == payload.factura_id)
        .options(selectinload(FacturaCompra.materiales))
    )
    factura = result.first()
    if factura is None:
        raise HTTPException(
            status_code=404,
            detail=f"Factura {payload.factura_id} no encontrada en Compras",
        )
    if factura.estado == "ingresada":
        raise HTTPException(
            status_code=400,
            detail=f"Factura {payload.factura_id} ya fue ingresada al stock",
        )

    snapshot = [
        {"nombre": m.nombre, "cantidad": m.cantidad, "precio_unitario": m.precio_unitario}
        for m in factura.materiales
    ]
    for m in factura.materiales:
        await _ajustar_stock(session, m.nombre, m.cantidad)

    ingreso = Ingreso(
        factura_id=payload.factura_id,
        estado="ingresado",
        snapshot=snapshot,
    )
    session.add(ingreso)

    factura.estado = "ingresada"
    session.add(factura)

    await session.commit()
    await session.refresh(ingreso)

    return {
        "message": "Materiales ingresados al stock",
        "data": {
            "ingreso": {
                "id": ingreso.id,
                "factura_id": ingreso.factura_id,
                "materiales": ingreso.snapshot,
                "estado": ingreso.estado,
            },
            "stock_actualizado": await _stock_dict(session),
        },
    }


@router.get("/ingresos")
async def list_ingresos(session: AsyncSession = Depends(get_session)):
    rows = (await session.scalars(select(Ingreso))).all()
    return {
        "data": [
            {
                "id": i.id,
                "factura_id": i.factura_id,
                "materiales": i.snapshot or [],
                "estado": i.estado,
            }
            for i in rows
        ]
    }


@router.get("/stock")
async def get_stock(session: AsyncSession = Depends(get_session)):
    return {"data": await _stock_dict(session)}


@router.post("/movimientos/produccion")
async def despachar_a_produccion(
    payload: DespachoProduccionCreate,
    session: AsyncSession = Depends(get_session),
):
    stock_actual = await _stock_dict(session)

    faltantes = []
    for mat in payload.materiales:
        disponible = stock_actual.get(mat.nombre, 0)
        if disponible < mat.cantidad:
            faltantes.append({
                "material": mat.nombre,
                "solicitado": mat.cantidad,
                "disponible": disponible,
            })

    if faltantes:
        raise HTTPException(
            status_code=400,
            detail={"message": "Stock insuficiente", "faltantes": faltantes},
        )

    for mat in payload.materiales:
        await _ajustar_stock(session, mat.nombre, -mat.cantidad)

    movimiento = Movimiento(of_id=payload.of_id, estado="despachado")
    session.add(movimiento)
    await session.flush()

    for mat in payload.materiales:
        session.add(MovimientoItem(
            movimiento_id=movimiento.id,
            nombre=mat.nombre,
            cantidad=mat.cantidad,
        ))

    await session.commit()

    result = await session.scalars(
        select(Movimiento)
        .where(Movimiento.id == movimiento.id)
        .options(selectinload(Movimiento.items))
    )
    movimiento = result.one()

    return {
        "message": "Material despachado a Producción",
        "data": {
            "movimiento": {
                "id": movimiento.id,
                "of_id": movimiento.of_id,
                "estado": movimiento.estado,
                "materiales": [
                    {"nombre": it.nombre, "cantidad": it.cantidad}
                    for it in movimiento.items
                ],
            },
            "stock_actualizado": await _stock_dict(session),
        },
    }


@router.get("/movimientos")
async def list_movimientos(session: AsyncSession = Depends(get_session)):
    rows = (await session.scalars(
        select(Movimiento).options(selectinload(Movimiento.items))
    )).all()
    return {
        "data": [
            {
                "id": m.id,
                "of_id": m.of_id,
                "estado": m.estado,
                "materiales": [
                    {"nombre": it.nombre, "cantidad": it.cantidad} for it in m.items
                ],
            }
            for m in rows
        ]
    }
