from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.api.v1.endpoints.compras import facturas_db

router = APIRouter()

ingresos_db = {}
movimientos_db = {}
stock_db = {}
ingreso_counter = 0
movimiento_counter = 0


class IngresoCreate(BaseModel):
    factura_id: int


class MaterialDespacho(BaseModel):
    nombre: str
    cantidad: int = Field(gt=0)


class DespachoProduccionCreate(BaseModel):
    of_id: int
    materiales: list[MaterialDespacho]


@router.get("/")
async def get_panol_status():
    return {"module": "Pañol", "status": "active"}


@router.post("/ingresos")
async def registrar_ingreso(payload: IngresoCreate):
    global ingreso_counter

    if payload.factura_id not in facturas_db:
        raise HTTPException(
            status_code=404,
            detail=f"Factura {payload.factura_id} no encontrada en Compras",
        )

    factura = facturas_db[payload.factura_id]
    if factura["estado"] == "ingresada":
        raise HTTPException(
            status_code=400,
            detail=f"Factura {payload.factura_id} ya fue ingresada al stock",
        )

    for material in factura["materiales"]:
        nombre = material["nombre"]
        stock_db[nombre] = stock_db.get(nombre, 0) + material["cantidad"]

    ingreso_counter += 1
    ingreso = {
        "id": ingreso_counter,
        "factura_id": payload.factura_id,
        "materiales": factura["materiales"],
        "estado": "ingresado",
    }
    ingresos_db[ingreso_counter] = ingreso

    factura["estado"] = "ingresada"

    return {
        "message": "Materiales ingresados al stock",
        "data": {"ingreso": ingreso, "stock_actualizado": dict(stock_db)},
    }


@router.get("/ingresos")
async def list_ingresos():
    return {"data": list(ingresos_db.values())}


@router.get("/stock")
async def get_stock():
    return {"data": stock_db}


@router.post("/movimientos/produccion")
async def despachar_a_produccion(payload: DespachoProduccionCreate):
    global movimiento_counter

    faltantes = []
    for mat in payload.materiales:
        disponible = stock_db.get(mat.nombre, 0)
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
        stock_db[mat.nombre] -= mat.cantidad

    movimiento_counter += 1
    movimiento = {
        "id": movimiento_counter,
        "of_id": payload.of_id,
        "materiales": [m.model_dump() for m in payload.materiales],
        "estado": "despachado",
    }
    movimientos_db[movimiento_counter] = movimiento

    return {
        "message": "Material despachado a Producción",
        "data": {"movimiento": movimiento, "stock_actualizado": dict(stock_db)},
    }


@router.get("/movimientos")
async def list_movimientos():
    return {"data": list(movimientos_db.values())}
