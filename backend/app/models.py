from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Column
from sqlalchemy.dialects.mysql import JSON
from sqlmodel import Field, Relationship, SQLModel


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


_CREATED = {"default_factory": _now, "nullable": False}
_UPDATED = {
    "default_factory": _now,
    "nullable": False,
    "sa_column_kwargs": {"onupdate": _now},
}


# --- Comercial ---------------------------------------------------------------

class OrdenFabricacion(SQLModel, table=True):
    __tablename__ = "ordenes_fabricacion"

    id: Optional[int] = Field(default=None, primary_key=True)
    cliente: str
    descripcion: str = ""
    plazo_entrega: str = ""
    monto_anticipo: float = 0.0
    estado: str = "pendiente_anticipo"
    created_at: datetime = Field(**_CREATED)
    updated_at: datetime = Field(**_UPDATED)

    anticipos: list["Anticipo"] = Relationship(back_populates="orden")


class Anticipo(SQLModel, table=True):
    __tablename__ = "anticipos"

    id: Optional[int] = Field(default=None, primary_key=True)
    of_id: int = Field(foreign_key="ordenes_fabricacion.id", index=True)
    cliente: str
    monto_estimado: float = 0.0
    estado: str = "pendiente"
    pagado: bool = False
    observacion: str = ""
    factura_archivo: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(**_CREATED)
    updated_at: datetime = Field(**_UPDATED)

    orden: Optional[OrdenFabricacion] = Relationship(back_populates="anticipos")


# --- Desarrollo --------------------------------------------------------------

class PedidoMaterial(SQLModel, table=True):
    __tablename__ = "pedidos_material"

    id: Optional[int] = Field(default=None, primary_key=True)
    of_id: int = Field(foreign_key="ordenes_fabricacion.id", index=True)
    emisor: str
    fecha: str
    plazo_entrega: str = ""
    equipo: str = ""
    estado: str = "generado"
    created_at: datetime = Field(**_CREATED)
    updated_at: datetime = Field(**_UPDATED)

    items: list["PedidoMaterialItem"] = Relationship(
        back_populates="pedido",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class PedidoMaterialItem(SQLModel, table=True):
    __tablename__ = "pedidos_material_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    pedido_id: int = Field(foreign_key="pedidos_material.id", index=True)
    cantidad: float
    descripcion: str
    uso_en: str = ""
    observaciones: str = ""
    oc_numero: str = ""
    oc_fecha: str = ""

    pedido: Optional[PedidoMaterial] = Relationship(back_populates="items")


class Plano(SQLModel, table=True):
    __tablename__ = "planos"

    id: Optional[int] = Field(default=None, primary_key=True)
    of_id: int = Field(foreign_key="ordenes_fabricacion.id", index=True)
    descripcion: str
    archivo_nombre: str
    archivo_tipo: str
    archivo_tamanio: int
    estado: str = "enviado"
    created_at: datetime = Field(**_CREATED)
    updated_at: datetime = Field(**_UPDATED)


# --- Compras -----------------------------------------------------------------

class Proveedor(SQLModel, table=True):
    __tablename__ = "proveedores"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(index=True, unique=True)
    created_at: datetime = Field(**_CREATED)
    updated_at: datetime = Field(**_UPDATED)


class Insumo(SQLModel, table=True):
    __tablename__ = "insumos"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(index=True, unique=True)
    created_at: datetime = Field(**_CREATED)
    updated_at: datetime = Field(**_UPDATED)


class FacturaCompra(SQLModel, table=True):
    __tablename__ = "facturas_compra"

    id: Optional[int] = Field(default=None, primary_key=True)
    pedido_material_id: int = Field(foreign_key="pedidos_material.id", index=True)
    proveedor: str = ""
    monto_total: float = 0.0
    estado: str = "registrada"
    created_at: datetime = Field(**_CREATED)
    updated_at: datetime = Field(**_UPDATED)

    materiales: list["MaterialCompra"] = Relationship(
        back_populates="factura",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class MaterialCompra(SQLModel, table=True):
    __tablename__ = "materiales_compra"

    id: Optional[int] = Field(default=None, primary_key=True)
    factura_id: int = Field(foreign_key="facturas_compra.id", index=True)
    nombre: str
    cantidad: float
    precio_unitario: float
    unidad_medida: str = "unidades"
    proveedor: str = ""

    factura: Optional[FacturaCompra] = Relationship(back_populates="materiales")


# --- Pañol -------------------------------------------------------------------

class Ingreso(SQLModel, table=True):
    __tablename__ = "ingresos"

    id: Optional[int] = Field(default=None, primary_key=True)
    factura_id: int = Field(foreign_key="facturas_compra.id", index=True)
    estado: str = "ingresado"
    snapshot: Optional[list] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(**_CREATED)
    updated_at: datetime = Field(**_UPDATED)


class Stock(SQLModel, table=True):
    __tablename__ = "stock"

    nombre: str = Field(primary_key=True)
    cantidad: int = 0


class Movimiento(SQLModel, table=True):
    __tablename__ = "movimientos"

    id: Optional[int] = Field(default=None, primary_key=True)
    of_id: int = Field(foreign_key="ordenes_fabricacion.id", index=True)
    estado: str = "despachado"
    created_at: datetime = Field(**_CREATED)
    updated_at: datetime = Field(**_UPDATED)

    items: list["MovimientoItem"] = Relationship(
        back_populates="movimiento",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class MovimientoItem(SQLModel, table=True):
    __tablename__ = "movimientos_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    movimiento_id: int = Field(foreign_key="movimientos.id", index=True)
    nombre: str
    cantidad: int

    movimiento: Optional[Movimiento] = Relationship(back_populates="items")


# --- Producción --------------------------------------------------------------

class Lote(SQLModel, table=True):
    __tablename__ = "lotes"

    id: Optional[int] = Field(default=None, primary_key=True)
    of_id: int = Field(foreign_key="ordenes_fabricacion.id", index=True)
    descripcion: str = ""
    planos_asociados: Optional[list[int]] = Field(default=None, sa_column=Column(JSON))
    movimientos_asociados: Optional[list[int]] = Field(default=None, sa_column=Column(JSON))
    estado: str = "terminado"
    created_at: datetime = Field(**_CREATED)
    updated_at: datetime = Field(**_UPDATED)


# --- Logística ---------------------------------------------------------------

class Despacho(SQLModel, table=True):
    __tablename__ = "despachos"

    id: Optional[int] = Field(default=None, primary_key=True)
    lote_id: int = Field(foreign_key="lotes.id", index=True)
    of_id: Optional[int] = Field(default=None, foreign_key="ordenes_fabricacion.id")
    destino: str
    transportista: str = ""
    estado: str = "pendiente"
    observacion_admin: str = ""
    created_at: datetime = Field(**_CREATED)
    updated_at: datetime = Field(**_UPDATED)
