from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select, or_

from app.db.session import get_session
from app.models import (
    FacturaCompra,
    MaterialCompra as MaterialCompraModel,
    PedidoMaterial,
    Proveedor,
    Insumo,
)

router = APIRouter()


class MaterialCompra(BaseModel):
    nombre: str
    cantidad: float = Field(gt=0)
    unidad_medida: str
    precio_unitario: float = Field(gt=0)
    proveedor: str


class FacturaCompraCreate(BaseModel):
    pedido_material_id: int
    materiales: list[MaterialCompra]


class ProveedorCreate(BaseModel):
    nombre: str


class InsumoCreate(BaseModel):
    nombre: str


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
                "unidad_medida": m.unidad_medida,
                "precio_unitario": m.precio_unitario,
                "proveedor": m.proveedor,
            }
            for m in f.materiales
        ],
    }


def _pedido_dump(pedido: PedidoMaterial) -> dict:
    return {
        "id": pedido.id,
        "of_id": pedido.of_id,
        "emisor": pedido.emisor,
        "fecha": pedido.fecha,
        "plazo_entrega": pedido.plazo_entrega,
        "equipo": pedido.equipo,
        "estado": pedido.estado,
        "items": [
            {
                "id": it.id,
                "cantidad": it.cantidad,
                "descripcion": it.descripcion,
                "uso_en": it.uso_en,
                "observaciones": it.observaciones,
                "oc_numero": it.oc_numero,
                "oc_fecha": it.oc_fecha,
            }
            for it in pedido.items
        ],
    }


@router.get("/")
async def get_compras_status():
    return {"module": "Compras", "status": "active"}


@router.get("/pedidos-material")
async def list_pedidos_pendientes(session: AsyncSession = Depends(get_session)):
    # Compras needs to see Pedidos de Material to create an OC/Factura
    result = await session.scalars(
        select(PedidoMaterial)
        .where(PedidoMaterial.estado == "generado")
        .options(selectinload(PedidoMaterial.items))
    )
    return {"data": [_pedido_dump(p) for p in result.all()]}


@router.post("/proveedores")
async def create_proveedor(
    payload: ProveedorCreate, session: AsyncSession = Depends(get_session)
):
    proveedor = Proveedor(nombre=payload.nombre)
    session.add(proveedor)
    await session.commit()
    await session.refresh(proveedor)
    return {"message": "Proveedor creado", "data": {"id": proveedor.id, "nombre": proveedor.nombre}}


@router.get("/proveedores")
async def list_proveedores(
    q: Optional[str] = Query(None), session: AsyncSession = Depends(get_session)
):
    query = select(Proveedor)
    if q:
        query = query.where(Proveedor.nombre.ilike(f"%{q}%"))
    result = await session.scalars(query)
    return {"data": [{"id": p.id, "nombre": p.nombre} for p in result.all()]}


@router.post("/insumos")
async def create_insumo(
    payload: InsumoCreate, session: AsyncSession = Depends(get_session)
):
    insumo = Insumo(nombre=payload.nombre)
    session.add(insumo)
    await session.commit()
    await session.refresh(insumo)
    return {"message": "Insumo creado", "data": {"id": insumo.id, "nombre": insumo.nombre}}


@router.get("/insumos")
async def list_insumos(
    q: Optional[str] = Query(None), session: AsyncSession = Depends(get_session)
):
    query = select(Insumo)
    if q:
        query = query.where(Insumo.nombre.ilike(f"%{q}%"))
    result = await session.scalars(query)
    return {"data": [{"id": i.id, "nombre": i.nombre} for i in result.all()]}


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

    # Use the first provider for Factura header backwards compatibility (or Varios)
    header_proveedor = payload.materiales[0].proveedor if payload.materiales else "Varios"
    if len(set([m.proveedor for m in payload.materiales])) > 1:
        header_proveedor = "Varios"

    monto_total = 0.0
    for m in payload.materiales:
        monto_total += m.cantidad * m.precio_unitario
        
        # Automatically save insumo if it doesn't exist
        insumo_existente = (
            await session.scalars(select(Insumo).where(Insumo.nombre == m.nombre))
        ).first()
        if not insumo_existente:
            nuevo_insumo = Insumo(nombre=m.nombre)
            session.add(nuevo_insumo)

        # Automatically save provider if it doesn't exist
        if m.proveedor:
            proveedor_existente = (
                await session.scalars(select(Proveedor).where(Proveedor.nombre == m.proveedor))
            ).first()
            if not proveedor_existente:
                nuevo_proveedor = Proveedor(nombre=m.proveedor)
                session.add(nuevo_proveedor)

    factura = FacturaCompra(
        pedido_material_id=payload.pedido_material_id,
        proveedor=header_proveedor,
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
