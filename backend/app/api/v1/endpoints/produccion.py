from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.api.v1.endpoints.desarrollo import planos_db
from app.api.v1.endpoints.panol import movimientos_db

router = APIRouter()

lotes_db = {}
lote_counter = 0


class LoteTerminadoCreate(BaseModel):
    of_id: int
    descripcion: str = ""


@router.get("/")
async def get_produccion_status():
    return {"module": "Producción", "status": "active"}


@router.post("/lotes-terminados")
async def finalizar_lote(payload: LoteTerminadoCreate):
    global lote_counter

    planos_of = [p for p in planos_db.values() if p.get("of_id") == payload.of_id]
    if not planos_of:
        raise HTTPException(
            status_code=400,
            detail=f"No hay planos enviados para la OF {payload.of_id}. Desarrollo debe enviarlos primero.",
        )

    movimientos_of = [m for m in movimientos_db.values() if m.get("of_id") == payload.of_id]
    if not movimientos_of:
        raise HTTPException(
            status_code=400,
            detail=f"No hay materiales despachados para la OF {payload.of_id}. Pañol debe despacharlos primero.",
        )

    lote_counter += 1
    lote = {
        "id": lote_counter,
        "of_id": payload.of_id,
        "descripcion": payload.descripcion,
        "planos_asociados": [p["id"] for p in planos_of],
        "movimientos_asociados": [m["id"] for m in movimientos_of],
        "estado": "terminado",
    }
    lotes_db[lote_counter] = lote

    return {"message": "Lote finalizado y disponible para Logística", "data": lote}


@router.get("/lotes-terminados")
async def list_lotes():
    return {"data": list(lotes_db.values())}
