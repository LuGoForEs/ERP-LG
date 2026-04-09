from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from app.api.v1.endpoints.comercial import anticipos_db, ordenes_db
from app.api.v1.endpoints.logistica import despachos_db as logistica_despachos_db

router = APIRouter()


@router.get("/")
async def get_administracion_status():
    return {"module": "Administración", "status": "active"}


@router.get("/ordenes")
async def list_ordenes_con_anticipos():
    result = []
    for orden in ordenes_db.values():
        anticipo = next(
            (a for a in anticipos_db.values() if a["of_id"] == orden["id"]), None
        )
        result.append({**orden, "anticipo": anticipo})
    return {"data": result}


@router.put("/anticipos/{anticipo_id}/validar")
async def validar_anticipo(
    anticipo_id: int,
    pagado: bool = Form(...),
    observacion: str = Form(""),
    factura: UploadFile | None = File(None),
):
    if anticipo_id not in anticipos_db:
        raise HTTPException(status_code=404, detail=f"Anticipo {anticipo_id} no encontrado")

    anticipo = anticipos_db[anticipo_id]

    if anticipo["estado"] not in ("pendiente", "rechazado"):
        raise HTTPException(
            status_code=400,
            detail=f"Anticipo ya procesado: {anticipo['estado']}",
        )

    factura_info = None
    if factura:
        contenido = await factura.read()
        factura_info = {
            "nombre": factura.filename,
            "tipo": factura.content_type,
            "tamanio_bytes": len(contenido),
        }

    anticipo["pagado"] = pagado
    anticipo["estado"] = "validado" if pagado else "rechazado"
    anticipo["observacion"] = observacion
    anticipo["factura_archivo"] = factura_info

    of_id = anticipo.get("of_id")
    if of_id and of_id in ordenes_db:
        ordenes_db[of_id]["estado"] = "aprobada" if pagado else "rechazada_anticipo"

    return {
        "message": f"Anticipo {anticipo_id} {'validado' if pagado else 'rechazado'}",
        "data": {
            "anticipo": anticipo,
            "orden": ordenes_db.get(of_id),
        },
    }


@router.put("/despachos/{despacho_id}/aprobar")
async def aprobar_despacho(
    despacho_id: int,
    aprobado: bool = Form(...),
    observacion: str = Form(""),
):
    if despacho_id not in logistica_despachos_db:
        raise HTTPException(status_code=404, detail=f"Despacho {despacho_id} no encontrado")

    despacho = logistica_despachos_db[despacho_id]
    if despacho["estado"] != "esperando_autorizacion":
        raise HTTPException(
            status_code=400,
            detail=f"Despacho {despacho_id} no está esperando autorización. Estado: {despacho['estado']}",
        )

    despacho["estado"] = "autorizado" if aprobado else "rechazado"
    despacho["observacion_admin"] = observacion

    return {
        "message": f"Despacho {despacho_id} {'autorizado' if aprobado else 'rechazado'}",
        "data": despacho,
    }
