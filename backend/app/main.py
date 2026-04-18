from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.endpoints import (
    administracion,
    comercial,
    compras,
    desarrollo,
    logistica,
    panol,
    produccion,
)
from app.db.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="ERP Industrial - API Monolítica",
    description="Backend centralizado para validación de arquitectura (Track 2)",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "ERP Industrial API Online", "status": "Ready"}


app.include_router(comercial.router, prefix="/api/v1/comercial", tags=["Comercial"])
app.include_router(administracion.router, prefix="/api/v1/administracion", tags=["Administración"])
app.include_router(desarrollo.router, prefix="/api/v1/desarrollo", tags=["Desarrollo"])
app.include_router(compras.router, prefix="/api/v1/compras", tags=["Compras"])
app.include_router(panol.router, prefix="/api/v1/panol", tags=["Pañol"])
app.include_router(produccion.router, prefix="/api/v1/produccion", tags=["Producción"])
app.include_router(logistica.router, prefix="/api/v1/logistica", tags=["Logística"])
