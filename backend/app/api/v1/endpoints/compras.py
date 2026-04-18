from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.db.session import get_session
from app.models import FacturaCompra, MaterialCompra as MaterialCompraModel, PedidoMaterial

router = APIRouter()


class MaterialCompra(BaseModel):
    nombre: str
    cantidad: int = Field(gt=0)
    precio_unitario: float = Field(gt=0)


class FacturaCompraCreate(BaseModel):
    pedido_material_id: int
    proveedor: str
    materiales: list[MaterialCompra]


def _factura_dump(f: FacturaCompra) -> dict:
    return {
        "id": f.id,
        "pedido_material_id": f.pedido_material_id,
        "proveedor": f.proveedor,
        "monto_total": f.monto_total,
        "estado": f.estado,
        "materiales": [
            {
                "nombre": m.nombre,
                "cantidad": m.cantidad,
                "precio_unitario": m.precio_unitario,
            }
            for m in f.materiales
        ],
    }


@router.get("/")
async def get_compras_status():
    return {"module": "Compras", "status": "active"}


@router.post("/facturas")
async def registrar_factura(
    payload: FacturaCompraCreate,
    session: AsyncSession = Depends(get_session),
):
    pedido = await session.get(PedidoMaterial, payload.pedido_material_id)
    if pedido is None:
        raise HTTPException(
            status_code=404,
            detail=f"Pedido de material {payload.pedido_material_id} no encontrado en Desarrollo",
        )
    if pedido.estado == "facturado":
        raise HTTPException(
            status_code=400,
            detail=f"Pedido {payload.pedido_material_id} ya fue facturado",
        )

    monto_total = sum(m.cantidad * m.precio_unitario for m in payload.materiales)

    factura = FacturaCompra(
        pedido_material_id=payload.pedido_material_id,
        proveedor=payload.proveedor,
        monto_total=monto_total,
        estado="registrada",
    )
    session.add(factura)
    await session.flush()

    for m in payload.materiales:
        session.add(MaterialCompraModel(factura_id=factura.id, **m.model_dump()))

    pedido.estado = "facturado"
    session.add(pedido)

    await session.commit()

    result = await session.scalars(
        select(FacturaCompra)
        .where(FacturaCompra.id == factura.id)
        .options(selectinload(FacturaCompra.materiales))
    )
    factura = result.one()

    return {
        "message": "Factura registrada y vinculada al pedido de material",
        "data": _factura_dump(factura),
    }


@router.get("/facturas")
async def list_facturas(session: AsyncSession = Depends(get_session)):
    result = await session.scalars(
        select(FacturaCompra).options(selectinload(FacturaCompra.materiales))
    )
    return {"data": [_factura_dump(f) for f in result.all()]}
