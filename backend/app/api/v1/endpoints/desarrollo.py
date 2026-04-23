from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.db.session import get_session
from app.models import Anticipo, OrdenCompra, OrdenFabricacion, PedidoMaterial, PedidoMaterialItem, Plano

router = APIRouter()


class ItemPedidoMaterial(BaseModel):
    cantidad: float = Field(gt=0)
    unidad: str = "u"
    descripcion: str
    uso_en: str = ""
    observaciones: str = ""
    oc_fecha: str = ""


class PedidoMaterialCreate(BaseModel):
    of_id: int
    emisor: str
    fecha: str
    plazo_entrega: str = ""
    equipo: str = ""
    items: list[ItemPedidoMaterial] = Field(min_length=1)


ALLOWED_MIME_TYPES = {"application/pdf"}


async def verificar_of_aprobada(of_id: int, session: AsyncSession):
    orden = await session.get(OrdenFabricacion, of_id)
    if orden is None:
        raise HTTPException(status_code=404, detail=f"OF {of_id} no encontrada")
    if orden.estado != "aprobada":
        anticipo = (
            await session.scalars(select(Anticipo).where(Anticipo.of_id == of_id))
        ).first()
        estado_anticipo = anticipo.estado if anticipo else "sin anticipo"
        raise HTTPException(
            status_code=403,
            detail=f"OF {of_id} no disponible. Estado: {orden.estado}. Anticipo: {estado_anticipo}",
        )
    return orden


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
                "unidad": it.unidad,
                "descripcion": it.descripcion,
                "uso_en": it.uso_en,
                "observaciones": it.observaciones,
                "oc_id": it.oc_id,
                "oc_fecha": it.oc_fecha,
            }
            for it in pedido.items
        ],
    }


@router.get("/")
async def get_desarrollo_status():
    return {"module": "Desarrollo", "status": "active"}


@router.get("/ordenes-disponibles")
async def list_ordenes_disponibles(session: AsyncSession = Depends(get_session)):
    result = await session.scalars(
        select(OrdenFabricacion).where(OrdenFabricacion.estado == "aprobada")
    )
    return {"data": [o.model_dump() for o in result.all()]}


@router.post("/pedidos-material")
async def create_pedido_material(
    payload: PedidoMaterialCreate,
    session: AsyncSession = Depends(get_session),
):
    await verificar_of_aprobada(payload.of_id, session)

    # 1. Crear el Pedido de Material
    pedido = PedidoMaterial(
        of_id=payload.of_id,
        emisor=payload.emisor,
        fecha=payload.fecha,
        plazo_entrega=payload.plazo_entrega,
        equipo=payload.equipo,
        estado="generado",
    )
    session.add(pedido)
    await session.flush() # Para tener el pedido.id

    # 2. Generar la Orden de Compra (OC) correlativa para este pedido
    # El ID de la OC será el número consecutivo global
    oc = OrdenCompra(
        of_id=payload.of_id,
        pm_id=pedido.id,
        estado="emitida"
    )
    session.add(oc)
    await session.flush() # Para tener el oc.id (NRO de OC)

    # 3. Crear los Items vinculados a la OC
    for item_data in payload.items:
        item = PedidoMaterialItem(
            pedido_id=pedido.id,
            oc_id=oc.id,
            **item_data.model_dump()
        )
        session.add(item)

    await session.commit()

    # Recargar con relaciones
    result = await session.scalars(
        select(PedidoMaterial)
        .where(PedidoMaterial.id == pedido.id)
        .options(selectinload(PedidoMaterial.items))
    )
    pedido = result.one()
    return {"message": f"Pedido generado con éxito. OC NRO: {oc.id}", "data": _pedido_dump(pedido)}


@router.get("/pedidos-material")
async def list_pedidos(session: AsyncSession = Depends(get_session)):
    result = await session.scalars(
        select(PedidoMaterial).options(selectinload(PedidoMaterial.items))
    )
    return {"data": [_pedido_dump(p) for p in result.all()]}


@router.post("/planos")
async def create_plano(
    of_id: int = Form(...),
    descripcion: str = Form(...),
    archivo: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
):
    await verificar_of_aprobada(of_id, session)

    if archivo.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Solo se permiten archivos PDF. Recibido: {archivo.content_type}",
        )

    contenido = await archivo.read()

    plano = Plano(
        of_id=of_id,
        descripcion=descripcion,
        archivo_nombre=archivo.filename or "",
        archivo_tipo=archivo.content_type or "",
        archivo_tamanio=len(contenido),
        estado="enviado",
    )
    session.add(plano)
    await session.commit()
    await session.refresh(plano)

    return {
        "message": "Plano enviado a Producción",
        "data": {
            "id": plano.id,
            "of_id": plano.of_id,
            "descripcion": plano.descripcion,
            "archivo": {
                "nombre": plano.archivo_nombre,
                "tipo": plano.archivo_tipo,
                "tamanio_bytes": plano.archivo_tamanio,
            },
            "estado": plano.estado,
        },
    }


@router.get("/planos")
async def list_planos(session: AsyncSession = Depends(get_session)):
    result = await session.scalars(select(Plano))
    return {
        "data": [
            {
                "id": p.id,
                "of_id": p.of_id,
                "descripcion": p.descripcion,
                "archivo": {
                    "nombre": p.archivo_nombre,
                    "tipo": p.archivo_tipo,
                    "tamanio_bytes": p.archivo_tamanio,
                },
                "estado": p.estado,
            }
            for p in result.all()
        ]
    }
