from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.api.v1.endpoints.desarrollo import pedidos_db

router = APIRouter()

facturas_db = {}
factura_counter = 0


class MaterialCompra(BaseModel):
    nombre: str
    cantidad: int = Field(gt=0)
    precio_unitario: float = Field(gt=0)


class FacturaCompraCreate(BaseModel):
    pedido_material_id: int
    proveedor: str
    materiales: list[MaterialCompra]


@router.get("/")
async def get_compras_status():
    return {"module": "Compras", "status": "active"}


@router.post("/facturas")
async def registrar_factura(payload: FacturaCompraCreate):
    global factura_counter

    if payload.pedido_material_id not in pedidos_db:
        raise HTTPException(
            status_code=404,
            detail=f"Pedido de material {payload.pedido_material_id} no encontrado en Desarrollo",
        )

    pedido = pedidos_db[payload.pedido_material_id]
    if pedido["estado"] == "facturado":
        raise HTTPException(
            status_code=400,
            detail=f"Pedido {payload.pedido_material_id} ya fue facturado",
        )

    monto_total = sum(m.cantidad * m.precio_unitario for m in payload.materiales)

    factura_counter += 1
    factura = {
        "id": factura_counter,
        "pedido_material_id": payload.pedido_material_id,
        "proveedor": payload.proveedor,
        "materiales": [m.model_dump() for m in payload.materiales],
        "monto_total": monto_total,
        "estado": "registrada",
    }
    facturas_db[factura_counter] = factura

    pedido["estado"] = "facturado"

    return {
        "message": "Factura registrada y vinculada al pedido de material",
        "data": factura,
    }


@router.get("/facturas")
async def list_facturas():
    return {"data": list(facturas_db.values())}
