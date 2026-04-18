from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.db.session import get_session
from app.models import Lote, Movimiento, Plano

router = APIRouter()


class LoteTerminadoCreate(BaseModel):
    of_id: int
    descripcion: str = ""


@router.get("/")
async def get_produccion_status():
    return {"module": "Producción", "status": "active"}


@router.post("/lotes-terminados")
async def finalizar_lote(
    payload: LoteTerminadoCreate,
    session: AsyncSession = Depends(get_session),
):
    planos_of = (
        await session.scalars(select(Plano).where(Plano.of_id == payload.of_id))
    ).all()
    if not planos_of:
        raise HTTPException(
            status_code=400,
            detail=f"No hay planos enviados para la OF {payload.of_id}. Desarrollo debe enviarlos primero.",
        )

    movimientos_of = (
        await session.scalars(select(Movimiento).where(Movimiento.of_id == payload.of_id))
    ).all()
    if not movimientos_of:
        raise HTTPException(
            status_code=400,
            detail=f"No hay materiales despachados para la OF {payload.of_id}. Pañol debe despacharlos primero.",
        )

    lote = Lote(
        of_id=payload.of_id,
        descripcion=payload.descripcion,
        planos_asociados=[p.id for p in planos_of],
        movimientos_asociados=[m.id for m in movimientos_of],
        estado="terminado",
    )
    session.add(lote)
    await session.commit()
    await session.refresh(lote)

    return {
        "message": "Lote finalizado y disponible para Logística",
        "data": lote.model_dump(),
    }


@router.get("/lotes-terminados")
async def list_lotes(session: AsyncSession = Depends(get_session)):
    rows = (await session.scalars(select(Lote))).all()
    return {"data": [l.model_dump() for l in rows]}
