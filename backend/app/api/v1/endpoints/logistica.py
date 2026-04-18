from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.db.session import get_session
from app.models import Despacho, Lote

router = APIRouter()


class DespachoCreate(BaseModel):
    lote_id: int
    destino: str
    transportista: str = ""


@router.get("/")
async def get_logistica_status():
    return {"module": "Logística", "status": "active"}


@router.post("/despachos")
async def create_despacho(
    payload: DespachoCreate,
    session: AsyncSession = Depends(get_session),
):
    lote = await session.get(Lote, payload.lote_id)
    if lote is None:
        raise HTTPException(
            status_code=404,
            detail=f"Lote {payload.lote_id} no encontrado en Producción",
        )
    if lote.estado != "terminado":
        raise HTTPException(
            status_code=400,
            detail=f"Lote {payload.lote_id} no está terminado. Estado: {lote.estado}",
        )

    despacho = Despacho(
        lote_id=payload.lote_id,
        of_id=lote.of_id,
        destino=payload.destino,
        transportista=payload.transportista,
        estado="pendiente",
    )
    session.add(despacho)

    lote.estado = "en_despacho"
    session.add(lote)

    await session.commit()
    await session.refresh(despacho)

    return {"message": "Despacho creado", "data": despacho.model_dump()}


@router.get("/despachos")
async def list_despachos(session: AsyncSession = Depends(get_session)):
    rows = (await session.scalars(select(Despacho))).all()
    return {"data": [d.model_dump() for d in rows]}


@router.post("/despachos/{despacho_id}/solicitar-autorizacion")
async def solicitar_autorizacion(
    despacho_id: int,
    session: AsyncSession = Depends(get_session),
):
    despacho = await session.get(Despacho, despacho_id)
    if despacho is None:
        raise HTTPException(status_code=404, detail=f"Despacho {despacho_id} no encontrado")

    if despacho.estado != "pendiente":
        raise HTTPException(
            status_code=400,
            detail=f"Despacho {despacho_id} no está pendiente. Estado: {despacho.estado}",
        )

    despacho.estado = "esperando_autorizacion"
    session.add(despacho)
    await session.commit()
    await session.refresh(despacho)

    return {
        "message": f"Autorización solicitada para despacho {despacho_id}",
        "data": despacho.model_dump(),
    }


@router.post("/despachos/{despacho_id}/ejecutar")
async def ejecutar_despacho(
    despacho_id: int,
    session: AsyncSession = Depends(get_session),
):
    despacho = await session.get(Despacho, despacho_id)
    if despacho is None:
        raise HTTPException(status_code=404, detail=f"Despacho {despacho_id} no encontrado")

    if despacho.estado != "autorizado":
        raise HTTPException(
            status_code=400,
            detail=f"Despacho {despacho_id} no está autorizado. Estado: {despacho.estado}. "
            "Administración debe aprobarlo primero.",
        )

    despacho.estado = "ejecutado"
    session.add(despacho)
    await session.commit()
    await session.refresh(despacho)

    return {"message": f"Despacho {despacho_id} ejecutado", "data": despacho.model_dump()}
