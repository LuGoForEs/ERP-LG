from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from app.api.v1.endpoints.comercial import anticipos_db, ordenes_db

router = APIRouter()

pedidos_db = {}
planos_db = {}
pedido_counter = 0
plano_counter = 0


class ItemPedidoMaterial(BaseModel):
    cantidad: int = Field(gt=0)
    descripcion: str
    uso_en: str = ""
    observaciones: str = ""
    oc_numero: str = ""
    oc_fecha: str = ""


class PedidoMaterialCreate(BaseModel):
    of_id: int
    emisor: str
    fecha: str
    plazo_entrega: str = ""
    equipo: str = ""
    items: list[ItemPedidoMaterial] = Field(min_length=1)


ALLOWED_MIME_TYPES = {"application/pdf"}


def verificar_of_aprobada(of_id):
    if of_id not in ordenes_db:
        raise HTTPException(status_code=404, detail=f"OF {of_id} no encontrada")
    orden = ordenes_db[of_id]
    if orden["estado"] != "aprobada":
        anticipo = next(
            (a for a in anticipos_db.values() if a["of_id"] == of_id), None
        )
        estado_anticipo = anticipo["estado"] if anticipo else "sin anticipo"
        raise HTTPException(
            status_code=403,
            detail=f"OF {of_id} no disponible. Estado: {orden['estado']}. Anticipo: {estado_anticipo}",
        )


@router.get("/")
async def get_desarrollo_status():
    return {"module": "Desarrollo", "status": "active"}


@router.get("/ordenes-disponibles")
async def list_ordenes_disponibles():
    disponibles = [o for o in ordenes_db.values() if o["estado"] == "aprobada"]
    return {"data": disponibles}


@router.post("/pedidos-material")
async def create_pedido_material(payload: PedidoMaterialCreate):
    global pedido_counter
    verificar_of_aprobada(payload.of_id)

    pedido_counter += 1
    pedido = {
        "id": pedido_counter,
        "of_id": payload.of_id,
        "emisor": payload.emisor,
        "fecha": payload.fecha,
        "plazo_entrega": payload.plazo_entrega,
        "equipo": payload.equipo,
        "items": [item.model_dump() for item in payload.items],
        "estado": "generado",
    }
    pedidos_db[pedido_counter] = pedido
    return {"message": "Pedido de materiales generado", "data": pedido}


@router.get("/pedidos-material")
async def list_pedidos():
    return {"data": list(pedidos_db.values())}


@router.post("/planos")
async def create_plano(
    of_id: int = Form(...),
    descripcion: str = Form(...),
    archivo: UploadFile = File(...),
):
    global plano_counter
    verificar_of_aprobada(of_id)

    if archivo.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Solo se permiten archivos PDF. Recibido: {archivo.content_type}",
        )

    contenido = await archivo.read()

    plano_counter += 1
    plano = {
        "id": plano_counter,
        "of_id": of_id,
        "descripcion": descripcion,
        "archivo": {
            "nombre": archivo.filename,
            "tipo": archivo.content_type,
            "tamanio_bytes": len(contenido),
        },
        "estado": "enviado",
    }
    planos_db[plano_counter] = plano
    return {"message": "Plano enviado a Producción", "data": plano}


@router.get("/planos")
async def list_planos():
    return {"data": list(planos_db.values())}
