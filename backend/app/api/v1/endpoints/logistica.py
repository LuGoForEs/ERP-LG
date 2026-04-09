from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.api.v1.endpoints.produccion import lotes_db

router = APIRouter()

despachos_db = {}
despacho_counter = 0


class DespachoCreate(BaseModel):
    lote_id: int
    destino: str
    transportista: str = ""


@router.get("/")
async def get_logistica_status():
    return {"module": "Logística", "status": "active"}


@router.post("/despachos")
async def create_despacho(payload: DespachoCreate):
    global despacho_counter

    if payload.lote_id not in lotes_db:
        raise HTTPException(
            status_code=404,
            detail=f"Lote {payload.lote_id} no encontrado en Producción",
        )

    lote = lotes_db[payload.lote_id]
    if lote["estado"] != "terminado":
        raise HTTPException(
            status_code=400,
            detail=f"Lote {payload.lote_id} no está terminado. Estado: {lote['estado']}",
        )

    despacho_counter += 1
    despacho = {
        "id": despacho_counter,
        "lote_id": payload.lote_id,
        "of_id": lote.get("of_id"),
        "destino": payload.destino,
        "transportista": payload.transportista,
        "estado": "pendiente",
    }
    despachos_db[despacho_counter] = despacho

    lote["estado"] = "en_despacho"

    return {"message": "Despacho creado", "data": despacho}


@router.get("/despachos")
async def list_despachos():
    return {"data": list(despachos_db.values())}


@router.post("/despachos/{despacho_id}/solicitar-autorizacion")
async def solicitar_autorizacion(despacho_id: int):
    if despacho_id not in despachos_db:
        raise HTTPException(status_code=404, detail=f"Despacho {despacho_id} no encontrado")

    despacho = despachos_db[despacho_id]
    if despacho["estado"] != "pendiente":
        raise HTTPException(
            status_code=400,
            detail=f"Despacho {despacho_id} no está pendiente. Estado: {despacho['estado']}",
        )

    despacho["estado"] = "esperando_autorizacion"
    return {
        "message": f"Autorización solicitada para despacho {despacho_id}",
        "data": despacho,
    }


@router.post("/despachos/{despacho_id}/ejecutar")
async def ejecutar_despacho(despacho_id: int):
    if despacho_id not in despachos_db:
        raise HTTPException(status_code=404, detail=f"Despacho {despacho_id} no encontrado")

    despacho = despachos_db[despacho_id]
    if despacho["estado"] != "autorizado":
        raise HTTPException(
            status_code=400,
            detail=f"Despacho {despacho_id} no está autorizado. Estado: {despacho['estado']}. "
            "Administración debe aprobarlo primero.",
        )

    despacho["estado"] = "ejecutado"
    return {"message": f"Despacho {despacho_id} ejecutado", "data": despacho}
