from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.db.session import get_session
from app.models import Anticipo, Despacho, OrdenFabricacion

router = APIRouter()


@router.get("/")
async def get_administracion_status():
    return {"module": "Administración", "status": "active"}


@router.get("/ordenes")
async def list_ordenes_con_anticipos(session: AsyncSession = Depends(get_session)):
    ordenes = (await session.scalars(select(OrdenFabricacion))).all()
    anticipos = (await session.scalars(select(Anticipo))).all()
    by_of = {a.of_id: a for a in anticipos}
    result = []
    for o in ordenes:
        a = by_of.get(o.id)
        result.append({**o.model_dump(), "anticipo": a.model_dump() if a else None})
    return {"data": result}


@router.put("/anticipos/{anticipo_id}/validar")
async def validar_anticipo(
    anticipo_id: int,
    pagado: bool = Form(...),
    observacion: str = Form(""),
    factura: UploadFile | None = File(None),
    session: AsyncSession = Depends(get_session),
):
    anticipo = await session.get(Anticipo, anticipo_id)
    if anticipo is None:
        raise HTTPException(status_code=404, detail=f"Anticipo {anticipo_id} no encontrado")

    if anticipo.estado not in ("pendiente", "rechazado"):
        raise HTTPException(
            status_code=400,
            detail=f"Anticipo ya procesado: {anticipo.estado}",
        )

    factura_info = None
    if factura:
        contenido = await factura.read()
        factura_info = {
            "nombre": factura.filename,
            "tipo": factura.content_type,
            "tamanio_bytes": len(contenido),
        }

    anticipo.pagado = pagado
    anticipo.estado = "validado" if pagado else "rechazado"
    anticipo.observacion = observacion
    anticipo.factura_archivo = factura_info
    session.add(anticipo)

    orden = await session.get(OrdenFabricacion, anticipo.of_id)
    if orden is not None:
        orden.estado = "aprobada" if pagado else "rechazada_anticipo"
        session.add(orden)

    await session.commit()
    await session.refresh(anticipo)
    if orden is not None:
        await session.refresh(orden)

    return {
        "message": f"Anticipo {anticipo_id} {'validado' if pagado else 'rechazado'}",
        "data": {
            "anticipo": anticipo.model_dump(),
            "orden": orden.model_dump() if orden else None,
        },
    }


@router.put("/despachos/{despacho_id}/aprobar")
async def aprobar_despacho(
    despacho_id: int,
    aprobado: bool = Form(...),
    observacion: str = Form(""),
    session: AsyncSession = Depends(get_session),
):
    despacho = await session.get(Despacho, despacho_id)
    if despacho is None:
        raise HTTPException(status_code=404, detail=f"Despacho {despacho_id} no encontrado")

    if despacho.estado != "esperando_autorizacion":
        raise HTTPException(
            status_code=400,
            detail=f"Despacho {despacho_id} no está esperando autorización. Estado: {despacho.estado}",
        )

    despacho.estado = "autorizado" if aprobado else "rechazado"
    despacho.observacion_admin = observacion
    session.add(despacho)
    await session.commit()
    await session.refresh(despacho)

    return {
        "message": f"Despacho {despacho_id} {'autorizado' if aprobado else 'rechazado'}",
        "data": despacho.model_dump(),
    }
