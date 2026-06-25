"""
Seed de demostración: 30 OFs × 10 estados distintos del flujo ERP SIBOTEC.
Ejecutar con: python manage.py seed_demo [--reset]
"""
from django.core.management.base import BaseCommand
from datetime import date, timedelta

# ─── CATÁLOGO DE INSUMOS (nombre, categoría, subcategoría, unidad, stock) ─────
INSUMOS = [
    ('Acero inoxidable 304',          'Metales',         'Chapas',      'kg',  2400.0),
    ('Acero al carbono A36',           'Metales',         'Chapas',      'kg',  3100.0),
    ('Tubería HDPE Ø160mm',            'Plásticos',       'Tuberías',    'm',    850.0),
    ('Tubería acero s/costura Ø4"',    'Metales',         'Tuberías',    'm',    320.0),
    ('Motor eléctrico 15kW',           'Electromecánico', 'Motores',     'u',      6.0),
    ('Motor eléctrico 7.5kW',          'Electromecánico', 'Motores',     'u',      9.0),
    ('Válvula de cierre DN100',         'Hidráulica',      'Válvulas',    'u',     24.0),
    ('Válvula de alivio 3/4"',          'Hidráulica',      'Válvulas',    'u',     35.0),
    ('Chapa galvanizada 2mm',           'Metales',         'Chapas',      'kg',  1850.0),
    ('Pintura epoxi bicomponente',      'Recubrimientos',  'Pinturas',    'L',    180.0),
    ('Tornillo M12x50 galvanizado',    'Fijaciones',      'Tornillos',   'u',   8500.0),
    ('Cable eléctrico 6mm²',            'Eléctrico',       'Cables',      'm',   1200.0),
    ('Bomba centrífuga 3HP',            'Electromecánico', 'Bombas',      'u',     12.0),
    ('Perfil HEB 200',                  'Metales',         'Perfiles',    'kg',  2100.0),
    ('Electrodo de soldadura E7018',   'Insumos proceso', 'Soldadura',   'kg',    450.0),
    ('Brida DN100 PN16 acero',          'Hidráulica',      'Accesorios',  'u',     28.0),
    ('Aislante lana roca 50mm',         'Aislación',       'Térmico',     'm²',   320.0),
    ('Reductor de velocidad 15:1',      'Electromecánico', 'Transmisión', 'u',      8.0),
    ('Perfil tubular 100x100x4mm',     'Metales',         'Perfiles',    'kg',    980.0),
    ('Rejilla de acero galvanizada',    'Metales',         'Rejillas',    'm²',    145.0),
]

PROVEEDORES = [
    'MetalPro S.A.',
    'Plastiductos SRL',
    'ElectroPower S.A.',
    'Ferretería Industrial Norte',
    'Química Industrial del Plata',
    'Hidro Suministros Cuyo SRL',
    'Calderas & Presión S.A.',
]

# Abrev para los dicts de materiales → (insumo, cant, precio_u, unidad, proveedor)
MP = 'MetalPro S.A.'
PL = 'Plastiductos SRL'
EP = 'ElectroPower S.A.'
FIN = 'Ferretería Industrial Norte'
QIP = 'Química Industrial del Plata'
HSC = 'Hidro Suministros Cuyo SRL'
CAP = 'Calderas & Presión S.A.'

# ─── DATOS DE ESCENARIOS ───────────────────────────────────────────────────────

# EJECUTADOS: flujo completo hasta despacho ejecutado
_EJECUTADOS = [
    dict(
        cliente='ACUÍFERO SRL',
        desc='Tanque de almacenamiento inox 304 — 50.000 L',
        monto=450_000, plazo='45 días hábiles',
        nota_ant='Transferencia bancaria confirmada. Ref. TRF-2026-0214.',
        emisor='Ing. Martínez, R.', equipo='Taller calderería', plazo_pm='28 días',
        pm_items=[(420,'Acero inoxidable 304','Cuerpo y techo del tanque','Espesor 3mm'),
                  (2,'Motor eléctrico 15kW','Sistema de agitación','Trifásico 380V IE3'),
                  (4,'Válvula de cierre DN100','Salidas inferiores del tanque','')],
        mats=[('Acero inoxidable 304',420,600,'kg',MP),
              ('Motor eléctrico 15kW',2,85_000,'u',EP),
              ('Válvula de cierre DN100',4,3_500,'u',FIN)],
        plano='Tanque 50kL inox 304 — planos generales rev.3',
        lote='Tanque 50kL rev.3 — inspeccionado y aprobado por QC',
        nota_ing='Materiales recibidos íntegros. Sin faltantes ni daños.',
        destino='Av. del Trabajo 1820, Villa María, Córdoba (CP 5900)',
        transp='Transportes Córdoba Express S.A.',
        nota_desp='Documentación verificada. Aprobado el 18/04/2026.',
    ),
    dict(
        cliente='FRIGORÍFICO DEL SUR S.A.',
        desc='Cámara de enfriamiento industrial — capacidad 200 m³',
        monto=610_000, plazo='55 días hábiles',
        nota_ant='Anticipo acreditado. Inicio de obra aprobado por comité técnico.',
        emisor='Ing. Blanco, P.', equipo='Taller estructuras frías', plazo_pm='30 días',
        pm_items=[(350,'Acero al carbono A36','Estructura portante de la cámara','S/planos rev.2'),
                  (180,'Chapa galvanizada 2mm','Revestimiento interior','Doble pared'),
                  (3,'Motor eléctrico 7.5kW','Unidad de refrigeración','Trifásico 50Hz')],
        mats=[('Acero al carbono A36',350,520,'kg',MP),
              ('Chapa galvanizada 2mm',180,480,'kg',MP),
              ('Motor eléctrico 7.5kW',3,42_000,'u',EP)],
        plano='Cámara fría 200m³ — distribución y detalles constructivos rev.2',
        lote='Cámara fría 200m³ — ensamblaje completo verificado termográficamente',
        nota_ing='Conforme. Chapas con certificado de galvanizado IRAM 2301.',
        destino='Ruta Provincial 3 km 22, General Pico, La Pampa (CP 6300)',
        transp='Frigorex Logística S.R.L.',
        nota_desp='Aprobado. Vehículo habilitado para carga de maquinaria.',
    ),
    dict(
        cliente='PAPELERA ANDINA SRL',
        desc='Digestor de pulpa con agitador de ancla — 10.000 L',
        monto=390_000, plazo='40 días hábiles',
        nota_ant='Pago recibido. Prioridad según cronograma de planta.',
        emisor='Tec. Quiroga, J.', equipo='Área proceso papel', plazo_pm='25 días',
        pm_items=[(280,'Acero inoxidable 304','Cuba del digestor','Pulido interior 2B'),
                  (2,'Bomba centrífuga 3HP','Circulación de pulpa','Cuerpo inox'),
                  (150,'Cable eléctrico 6mm²','Tablero de control','IRAM 2178')],
        mats=[('Acero inoxidable 304',280,600,'kg',MP),
              ('Bomba centrífuga 3HP',2,48_000,'u',EP),
              ('Cable eléctrico 6mm²',150,850,'m',EP)],
        plano='Digestor 10kL — planos generales y detalle de agitador rev.1',
        lote='Digestor 10kL — probado a 1,3× presión de trabajo. Sin pérdidas.',
        nota_ing='Conforme. Bomba con certificado de curva hidráulica.',
        destino='Parque Industrial Sur, Módulo 7, Zárate, Buenos Aires',
        transp='Carga Pesada Buenos Aires S.A.',
        nota_desp='Aprobado el 22/04/2026. Entrega con grúa en destino.',
    ),
]

# AUTORIZADOS: despacho aprobado por admin, logística no ejecutó aún
_AUTORIZADOS = [
    dict(
        cliente='CERÁMICA LA RIOJA S.A.',
        desc='Caldera de vapor saturado 3 bar — 500 kg/h',
        monto=620_000, plazo='50 días hábiles',
        nota_ant='Anticipo aprobado por gerencia. Prioridad alta.',
        emisor='Ing. Suárez, D.', equipo='Taller presión y calderas', plazo_pm='35 días',
        pm_items=[(280,'Acero al carbono A36','Cuerpo cilíndrico de la caldera','Espesor 8mm'),
                  (60,'Tubería acero s/costura Ø4"','Serpentín interior','Schedule 40'),
                  (8,'Válvula de alivio 3/4"','Sistema de seguridad','ASME')],
        mats=[('Acero al carbono A36',280,520,'kg',MP),
              ('Tubería acero s/costura Ø4"',60,4_200,'m',HSC),
              ('Válvula de alivio 3/4"',8,2_800,'u',FIN)],
        plano='Caldera 500kg/h — planos ASME Sección I rev.2',
        lote='Caldera vapor 3 bar — ensayo hidráulico OK a 1,5× presión',
        nota_ing='Conforme. Tuberías con certificados de calidad IRAM.',
        destino='Ruta Prov. 150 km 38, Aimogasta, La Rioja (CP 5340)',
        transp='Carga Pesada del NOA S.A.',
        nota_desp='Aprobado. Verificar restricciones de altura en ruta 150 antes de salir.',
    ),
    dict(
        cliente='BODEGA MENDOCINA S.A.',
        desc='Cisterna de acero inoxidable para vino — 80.000 L',
        monto=720_000, plazo='60 días hábiles',
        nota_ant='Anticipo recibido. Urgente por temporada de vendimia.',
        emisor='Ing. Correa, V.', equipo='Taller tanques grandes', plazo_pm='40 días',
        pm_items=[(560,'Acero inoxidable 304','Virolas y fondo cónico','Ra 0,8 interior'),
                  (6,'Válvula de cierre DN100','Toma inferior y venteo','Sanitario inox'),
                  (600,'Tornillo M12x50 galvanizado','Fijación de sillas y accesorios','')],
        mats=[('Acero inoxidable 304',560,600,'kg',MP),
              ('Válvula de cierre DN100',6,3_500,'u',FIN),
              ('Tornillo M12x50 galvanizado',600,85,'u',FIN)],
        plano='Cisterna 80kL vino — planos aprobados SENASA rev.1',
        lote='Cisterna 80kL — limpieza CIP 80°C validada. Apta para uso alimentario.',
        nota_ing='Conforme. Acero con certificado de origen y análisis de colada.',
        destino='Finca El Paraíso, Luján de Cuyo, Mendoza (CP 5507)',
        transp='Transportes Cuyo Vitivinícola SRL',
        nota_desp='Autorizado. Requiere escolta por dimensiones de carga.',
    ),
    dict(
        cliente='AZUCARERA DEL NORTE',
        desc='Evaporador de múltiple efecto — 3 cuerpos, 80 Tn vapor/h',
        monto=980_000, plazo='75 días hábiles',
        nota_ant='Anticipo confirmado. Proyecto ligado a zafra 2026.',
        emisor='Ing. Alderete, M.', equipo='Área concentración y evaporación', plazo_pm='45 días',
        pm_items=[(320,'Acero inoxidable 304','Tubos de calefacción','304L apto grado alimentario'),
                  (80,'Tubería HDPE Ø160mm','Drenajes y condensado',''),
                  (1,'Motor eléctrico 15kW','Agitador de fondo','')],
        mats=[('Acero inoxidable 304',320,600,'kg',MP),
              ('Tubería HDPE Ø160mm',80,480,'m',PL),
              ('Motor eléctrico 15kW',1,85_000,'u',EP)],
        plano='Evaporador 3C — planos proceso y conexionado rev.3',
        lote='Evaporador 3 cuerpos — prueba vacío realizada. Eficiencia térmica validada.',
        nota_ing='Conforme. Tuberías HDPE con certificado NSF-61 agua potable.',
        destino='Ingenio Ledesma, Libertador General San Martín, Jujuy (CP 4521)',
        transp='Transportes del Norte Andino S.A.',
        nota_desp='Autorizado con escolta provincial. Tramitar permiso de paso en Jujuy.',
    ),
]

# ESPERANDO AUTORIZACIÓN ADMIN
_ESPERANDO_AUTH = [
    dict(
        cliente='AGUAS CORDOBESAS',
        desc='Filtros de arena multicapa DN300 — 2 unidades',
        monto=380_000, plazo='30 días hábiles',
        nota_ant='Pago recibido. Orden iniciada.',
        emisor='Tec. López, F.', equipo='Área de filtración', plazo_pm='21 días',
        pm_items=[(120,'Tubería HDPE Ø160mm','Conexiones de entrada y salida',''),
                  (6,'Válvula de cierre DN100','Bypass y aislamiento',''),
                  (800,'Tornillo M12x50 galvanizado','Fijación de bridas','')],
        mats=[('Tubería HDPE Ø160mm',120,480,'m',PL),
              ('Válvula de cierre DN100',6,3_500,'u',FIN),
              ('Tornillo M12x50 galvanizado',800,85,'u',FIN)],
        plano='Filtro multicapa DN300 — diseño general y secciones',
        lote='Filtros DN300 — 2 unidades, prueba hidráulica OK',
        nota_ing='Conforme. Caños verificados sin daños.',
        destino='Planta Potabilizadora Suquía, Av. Costanera s/n, Córdoba Capital',
        transp='Mudanzas del Norte SRL',
    ),
    dict(
        cliente='PLÁSTICOS DEL LITORAL S.A.',
        desc='Extrusora monohueso diámetro 90mm — producción 180 kg/h',
        monto=550_000, plazo='50 días hábiles',
        nota_ant='Anticipo transferido. Sin observaciones.',
        emisor='Ing. Méndez, A.', equipo='Área maquinaria plástica', plazo_pm='30 días',
        pm_items=[(400,'Acero al carbono A36','Bancada y bastidor principal','Tratamiento térmico'),
                  (2,'Motor eléctrico 15kW','Accionamiento del tornillo','VFD incluido'),
                  (200,'Cable eléctrico 6mm²','Tablero principal y distribución','IRAM 2178')],
        mats=[('Acero al carbono A36',400,520,'kg',MP),
              ('Motor eléctrico 15kW',2,85_000,'u',EP),
              ('Cable eléctrico 6mm²',200,850,'m',EP)],
        plano='Extrusora 90mm — planos mecánicos y eléctricos rev.2',
        lote='Extrusora 90mm — calibrada y probada a velocidad nominal',
        nota_ing='Conforme. Motores con certificado de eficiencia IE3.',
        destino='Parque Industrial Gral. Lagos, Santa Fe (CP 2107)',
        transp='Logística Industrial del Litoral SRL',
    ),
    dict(
        cliente='FRIGORÍFICO PATAGÓNICO S.A.',
        desc='Túnel de congelado IQF — capacidad 500 kg/h',
        monto=840_000, plazo='65 días hábiles',
        nota_ant='Anticipo acreditado por banco. OK gerencia comercial.',
        emisor='Ing. Salas, R.', equipo='Taller instalaciones frías', plazo_pm='38 días',
        pm_items=[(300,'Chapa galvanizada 2mm','Paneles del túnel y estructura','Doble pared'),
                  (4,'Motor eléctrico 7.5kW','Ventiladores evaporadores','IP55'),
                  (1000,'Tornillo M12x50 galvanizado','Uniones de paneles y bridas','Acero inox A2')],
        mats=[('Chapa galvanizada 2mm',300,480,'kg',MP),
              ('Motor eléctrico 7.5kW',4,42_000,'u',EP),
              ('Tornillo M12x50 galvanizado',1000,85,'u',FIN)],
        plano='Túnel IQF 500kg/h — planos térmicos y distribución de flujo rev.1',
        lote='Túnel IQF — prueba de temperatura a -40°C. Uniformidad ±2°C.',
        nota_ing='Conforme. Chapas con certificado IRAM 2301.',
        destino='Puerto Madryn, Calle Industrial s/n, Chubut (CP 9120)',
        transp='Fletes Patagonia Express S.A.',
    ),
]

# DESPACHO RECHAZADO + NUEVO PENDIENTE
_RECHAZADO_REINTENTO = [
    dict(
        cliente='AGROINDUSTRIA DEL LITORAL',
        desc='Silo metálico galvanizado — capacidad 200 Tn',
        monto=540_000, plazo='55 días hábiles',
        nota_ant='Anticipo recibido. Plazo comprometido para cosecha.',
        emisor='Tec. Romero, G.', equipo='Taller estructuras agroindustriales', plazo_pm='30 días',
        pm_items=[(650,'Chapa galvanizada 2mm','Virolas y fondo del silo',''),
                  (500,'Perfil HEB 200','Estructura soporte exterior',''),
                  (1200,'Tornillo M12x50 galvanizado','Uniones virolas','Acero inox A2')],
        mats=[('Chapa galvanizada 2mm',650,480,'kg',MP),
              ('Perfil HEB 200',500,620,'kg',MP),
              ('Tornillo M12x50 galvanizado',1200,85,'u',FIN)],
        plano='Silo 200Tn — planos estructurales y detalle virolas rev.2',
        lote='Silo 200Tn — estructura completa armada y pintada',
        nota_ing='Conforme. Material galvanizado certificado.',
        destino='Ruta Nacional 11 km 812, Reconquista, Santa Fe (CP 3560)',
        transp1='Transporte Veloz SRL',
        motivo_rec='Transportista sin habilitación RENSPA para carga especial. Reasignar.',
        transp2='Carga Pesada del Litoral S.A.',
    ),
    dict(
        cliente='MINERA ALTO PARAGUAY S.A.',
        desc='Criba vibratoria inclinada — malla 2×1m, doble deck',
        monto=420_000, plazo='45 días hábiles',
        nota_ant='Anticipo acreditado. Sin observaciones.',
        emisor='Ing. Vidal, C.', equipo='Taller mineral processing', plazo_pm='28 días',
        pm_items=[(320,'Acero al carbono A36','Caja vibratoria y chasis','Reforzado HB400'),
                  (2,'Motor eléctrico 7.5kW','Vibradores desequilibrados','IP65 Apto polvo'),
                  (600,'Tornillo M12x50 galvanizado','Uniones estructura','Alta resistencia')],
        mats=[('Acero al carbono A36',320,520,'kg',MP),
              ('Motor eléctrico 7.5kW',2,42_000,'u',EP),
              ('Tornillo M12x50 galvanizado',600,85,'u',FIN)],
        plano='Criba vibr. 2×1m — planos mecánicos y balance dinámico rev.1',
        lote='Criba vibratoria — calibrada a 950 RPM. Sin resonancias en rango operativo.',
        nota_ing='Conforme. Acero certificado HB400 para alta abrasión.',
        destino='Mina Don Anselmo, Ruta 22 km 318, Formosa (CP 3600)',
        transp1='Transportes del Impenetrable SRL',
        motivo_rec='Vehículo con permiso de carga vencido. Multa de tránsito aplicada.',
        transp2='Norte Cargo Pesado S.A.',
    ),
    dict(
        cliente='MOLINO HARINERO PAMPA',
        desc='Transportador helicoidal Ø315mm — longitud 12 m',
        monto=285_000, plazo='30 días hábiles',
        nota_ant='Anticipo recibido. Urgente por parada programada.',
        emisor='Tec. Altamirano, B.', equipo='Área transporte de sólidos', plazo_pm='20 días',
        pm_items=[(180,'Acero inoxidable 304','Hélice y carcasa del transportador','Ra 1,6'),
                  (1,'Motor eléctrico 15kW','Accionamiento del eje','Reductor incorporado'),
                  (3,'Válvula de cierre DN100','Compuertas de descarga','Wafer inox')],
        mats=[('Acero inoxidable 304',180,600,'kg',MP),
              ('Motor eléctrico 15kW',1,85_000,'u',EP),
              ('Válvula de cierre DN100',3,3_500,'u',FIN)],
        plano='Helicoidal Ø315 L=12m — planos de fabricación rev.1',
        lote='Helicoidal Ø315 — probado a plena carga. Caudal garantizado.',
        nota_ing='Conforme. Acero inox con certificado de análisis de colada.',
        destino='Ruta Prov. 50, Villa María, Córdoba (CP 5900)',
        transp1='Fletes Rápidos del Centro S.R.L.',
        motivo_rec='Error en documentación: guía de transporte con destinatario incorrecto.',
        transp2='Transportes Córdoba Express S.A.',
    ),
]

# LOTE TERMINADO SIN DESPACHO
_LOTE_TERMINADO = [
    dict(
        cliente='REFINERÍA PATAGÓNICA S.A.',
        desc='Sistema de bombeo industrial 3 etapas — caudal 500 m³/h',
        monto=850_000, plazo='75 días hábiles',
        nota_ant='Anticipo aprobado por gerencia general. Prioridad A.',
        emisor='Ing. Rodríguez, M.', equipo='Área de proceso', plazo_pm='40 días',
        pm_items=[(3,'Bomba centrífuga 3HP','Etapas 1, 2 y 3','Marca WEG o equiv.'),
                  (6,'Válvula de cierre DN100','Aislamiento de bombas',''),
                  (300,'Cable eléctrico 6mm²','Alimentación tablero','IRAM 2178')],
        mats=[('Bomba centrífuga 3HP',3,48_000,'u',EP),
              ('Válvula de cierre DN100',6,3_500,'u',FIN),
              ('Cable eléctrico 6mm²',300,850,'m',EP)],
        plano='Bombeo 3 etapas 500m³/h — P&ID rev.2 aprobado',
        lote='Sistema bombeo 3 etapas — probado en banco. Curva hidráulica OK.',
        nota_ing='Conforme. Bombas con certificado de curva hidráulica WEG.',
    ),
    dict(
        cliente='LÁCTEOS CUYANA S.A.',
        desc='Pasteurizador HTST inox — 5.000 L/h',
        monto=470_000, plazo='40 días hábiles',
        nota_ant='Anticipo transferido. Arranque ligado a ampliación de planta.',
        emisor='Ing. Ponce, L.', equipo='Área proceso lácteo', plazo_pm='25 días',
        pm_items=[(220,'Acero inoxidable 304','Intercambiador de placas y caños','Grado alimentario'),
                  (2,'Bomba centrífuga 3HP','Bombeo producto / agua caliente','Inox sanitaria'),
                  (4,'Válvula de alivio 3/4"','Control de presión circuito caliente','')],
        mats=[('Acero inoxidable 304',220,600,'kg',MP),
              ('Bomba centrífuga 3HP',2,48_000,'u',EP),
              ('Válvula de alivio 3/4"',4,2_800,'u',FIN)],
        plano='Pasteurizador HTST 5kL/h — P&ID sanitario y esquema térmico rev.2',
        lote='Pasteurizador HTST — validación CIP 85°C aprobada. Listo para despacho.',
        nota_ing='Conforme. Materiales aptos grado alimentario SENASA.',
    ),
    dict(
        cliente='CERVECERÍA ARTESANAL BARILOCHE',
        desc='Hervidor de mosto (kettle) con serpentín whirlpool — 2.000 L',
        monto=320_000, plazo='35 días hábiles',
        nota_ant='Anticipo recibido. Arranque OK.',
        emisor='Tec. Castro, F.', equipo='Taller inox grado alimentario', plazo_pm='22 días',
        pm_items=[(160,'Acero inoxidable 304','Cuba y tapa del hervidor','Pulido EP'),
                  (1,'Motor eléctrico 7.5kW','Agitador de piel de naranja',''),
                  (2,'Válvula de cierre DN100','Salida fondo y drenaje CIP','Inox sanitario')],
        mats=[('Acero inoxidable 304',160,600,'kg',MP),
              ('Motor eléctrico 7.5kW',1,42_000,'u',EP),
              ('Válvula de cierre DN100',2,3_500,'u',FIN)],
        plano='Kettle whirlpool 2kL — planos generales y detalle CIP rev.1',
        lote='Kettle 2kL — probado a 1,5× presión. Serpentín sin pérdidas.',
        nota_ing='Conforme. Acero inox con certificado Ra interior.',
    ),
]

# INGRESO NO CONFORME
_NO_CONFORME = [
    dict(
        cliente='INDUSTRIAS HIDRÁULICAS CUYO',
        desc='Prensa hidráulica de estampado 200 Tn',
        monto=710_000, plazo='60 días hábiles',
        nota_ant='Anticipo transferido. Inicio confirmado.',
        emisor='Ing. Álvarez, S.', equipo='Taller hidráulico', plazo_pm='25 días',
        pm_items=[(4,'Motor eléctrico 7.5kW','Unidad hidráulica central','VFD requerido'),
                  (200,'Tubería acero s/costura Ø4"','Circuito hidráulico HP',''),
                  (10,'Válvula de alivio 3/4"','Seguridad del circuito','')],
        mats=[('Motor eléctrico 7.5kW',4,28_000,'u',EP),
              ('Tubería acero s/costura Ø4"',200,4_200,'m',HSC),
              ('Válvula de alivio 3/4"',10,2_800,'u',FIN)],
        plano='Prensa 200Tn — esquema hidráulico y layout general rev.1',
        nota_nc='Motores eléctricos llegaron con carcasa golpeada y bornes dañados. '
                'Tuberías y válvulas conformes. Se rechaza recepción de motores. '
                'Reclamo al proveedor ElectroPower S.A. — Ref. 2026-EP-041.',
        item_repo=(4, 'Motor eléctrico 7.5kW', 'REPOSICIÓN por entrega no conforme', 'Cambio de proveedor'),
    ),
    dict(
        cliente='SIDERÚRGICA DEL NOROESTE S.A.',
        desc='Horno de tratamiento térmico eléctrico — 800°C, cámara 1×1×2m',
        monto=630_000, plazo='55 días hábiles',
        nota_ant='Anticipo aprobado. Horno de reemplazo urgente.',
        emisor='Ing. Torres, H.', equipo='Área hornos y tratamiento', plazo_pm='32 días',
        pm_items=[(500,'Acero al carbono A36','Carcasa exterior del horno','S/plano rev.3'),
                  (400,'Cable eléctrico 6mm²','Distribución resistencias eléctricas','Alta temperatura'),
                  (200,'Perfil HEB 200','Estructura soporte del horno','')],
        mats=[('Acero al carbono A36',500,520,'kg',MP),
              ('Cable eléctrico 6mm²',400,850,'m',EP),
              ('Perfil HEB 200',200,620,'kg',MP)],
        plano='Horno TT 800°C — planos eléctricos y mecánicos rev.3',
        nota_nc='Perfiles HEB 200 recibidos en medida incorrecta: HEB 180 en lugar de HEB 200. '
                'Acero y cable conformes. Se rechaza la partida de perfiles. '
                'Reclamo a MetalPro S.A. — Ref. 2026-MP-089. Crédito pendiente.',
        item_repo=(200, 'Perfil HEB 200', 'REPOSICIÓN medida correcta HEB 200', 'Verificar certificado dimensional'),
    ),
    dict(
        cliente='PLANTA SOLAR JUJUY S.A.',
        desc='Estructura soporte para trackers solares bifaciales — 400 módulos',
        monto=460_000, plazo='40 días hábiles',
        nota_ant='Anticipo recibido. Obra en terreno habilitada.',
        emisor='Tec. Mamani, R.', equipo='Área montaje solar', plazo_pm='22 días',
        pm_items=[(800,'Perfil HEB 200','Pilotes y viga principal horizontal','Galvanizado en caliente'),
                  (2000,'Tornillo M12x50 galvanizado','Fijación estructura a pilotes','Inox A4 marine'),
                  (200,'Chapa galvanizada 2mm','Soportes intermedios fila','Galv. 275g/m²')],
        mats=[('Perfil HEB 200',800,620,'kg',MP),
              ('Tornillo M12x50 galvanizado',2000,85,'u',FIN),
              ('Chapa galvanizada 2mm',200,480,'kg',MP)],
        plano='Trackers 400 módulos — planos estructura y anclajes rev.2',
        nota_nc='Tornillos recibidos en dimensión incorrecta: M10×40 en lugar de M12×50. '
                'Perfiles y chapas conformes. Se rechaza partida de tornillos. '
                'Reclamo a Ferretería Industrial Norte — Ref. 2026-FIN-017.',
        item_repo=(2000, 'Tornillo M12x50 galvanizado', 'REPOSICIÓN dimensión M12×50 correcta', 'Exigir certificado dimensional'),
    ),
]

# INGRESO PENDIENTE EN PAÑOL
_PANOL_PENDIENTE = [
    dict(
        cliente='QUÍMICA DEL NORTE SRL',
        desc='Mezclador industrial de paletas — 5.000 L',
        monto=490_000, plazo='45 días hábiles',
        nota_ant='Anticipo recibido. Inicio autorizado por dirección.',
        emisor='Tec. Herrera, L.', equipo='Área mezclado y reacción', plazo_pm='28 días',
        pm_items=[(240,'Acero inoxidable 304','Cuba y tapa del mezclador',''),
                  (2,'Motor eléctrico 15kW','Accionamiento de paletas',''),
                  (45,'Pintura epoxi bicomponente','Recubrimiento exterior','2 manos')],
        mats=[('Acero inoxidable 304',240,600,'kg',MP),
              ('Motor eléctrico 15kW',2,85_000,'u',EP),
              ('Pintura epoxi bicomponente',45,3_800,'L',QIP)],
        plano='Mezclador 5kL paletas — planos fabricación y montaje rev.1',
        monto_fact=178_500,
    ),
    dict(
        cliente='LABORATORIO FARMACÉUTICO ANDES',
        desc='Reactor de síntesis GMP acero inox — 500 L',
        monto=580_000, plazo='50 días hábiles',
        nota_ant='Anticipo confirmado. Normas GMP aplicables.',
        emisor='Ing. Vega, C.', equipo='Área fabricación farmacéutica', plazo_pm='35 días',
        pm_items=[(180,'Acero inoxidable 304','Cuerpo, tapa y fondo del reactor','316L pulido EP'),
                  (8,'Válvula de cierre DN100','Entradas, salidas y purga','Sanitario inox 316L'),
                  (400,'Tornillo M12x50 galvanizado','Fijación tapa y accesorios','Inox A2-70')],
        mats=[('Acero inoxidable 304',180,600,'kg',MP),
              ('Válvula de cierre DN100',8,3_500,'u',FIN),
              ('Tornillo M12x50 galvanizado',400,85,'u',FIN)],
        plano='Reactor GMP 500L — planos con certificación 3.1 ASME BPE rev.2',
        monto_fact=145_800,
    ),
    dict(
        cliente='TABACALERA TUCUMANA S.A.',
        desc='Humidificador industrial de cámara — 200 m³ de almacenamiento',
        monto=340_000, plazo='35 días hábiles',
        nota_ant='Pago recibido. Temporada de tabaco comprometida.',
        emisor='Tec. Juárez, P.', equipo='Área acondicionamiento', plazo_pm='20 días',
        pm_items=[(300,'Acero al carbono A36','Estructura y carcasa de la cámara',''),
                  (60,'Tubería HDPE Ø160mm','Red de distribución de vapor frío',''),
                  (6,'Válvula de alivio 3/4"','Regulación de presión vapor','')],
        mats=[('Acero al carbono A36',300,520,'kg',MP),
              ('Tubería HDPE Ø160mm',60,480,'m',PL),
              ('Válvula de alivio 3/4"',6,2_800,'u',FIN)],
        plano='Humidificador 200m³ — circuito de distribución y detalle cámara rev.1',
        monto_fact=92_400,
    ),
]

# MULTI-PM: fase 1 completa (ingresada+movida), fase 2 en compras
_MULTI_PM = [
    dict(
        cliente='MUNICIPALIDAD DE ROSARIO',
        desc='Planta potabilizadora modular — 50.000 L/día',
        monto=1_200_000, plazo='90 días hábiles',
        nota_ant='Pago confirmado por tesorería municipal. Expediente 2026-MR-0342.',
        planos=['Planta modular 50kL/día — layout general y P&ID rev.1',
                'Planta modular — estructura soporte modular rev.2'],
        # Fase 1 — estructura (completa)
        pm1_emisor='Ing. Fernández, C.', pm1_equipo='Estructura y civil', pm1_plazo='35 días',
        pm1_items=[(480,'Perfil HEB 200','Estructura soporte módulos filtración',''),
                   (800,'Tornillo M12x50 galvanizado','Uniones estructurales',''),
                   (60,'Chapa galvanizada 2mm','Revestimiento exterior módulos','')],
        pm1_mats=[('Perfil HEB 200',480,620,'kg',MP),
                  ('Tornillo M12x50 galvanizado',800,85,'u',FIN),
                  ('Chapa galvanizada 2mm',60,480,'kg',MP)],
        pm1_nota_ing='Conforme. Perfiles con certificado de calidad SAE.',
        pm1_mov=[('Perfil HEB 200',480),('Tornillo M12x50 galvanizado',800),('Chapa galvanizada 2mm',60)],
        # Fase 2 — equipos (pendiente en compras)
        pm2_emisor='Ing. Fernández, C.', pm2_equipo='Equipos y proceso', pm2_plazo='40 días',
        pm2_items=[(350,'Tubería HDPE Ø160mm','Red de distribución interna','Presión PN10'),
                   (4,'Bomba centrífuga 3HP','Etapas de filtración y distribución','Sumergible admitido'),
                   (500,'Cable eléctrico 6mm²','Tablero de control y fuerza','IRAM 2178')],
    ),
    dict(
        cliente='PETROQUÍMICA NEUQUÉN S.A.',
        desc='Separador trifásico horizontal — 6" proceso gas/agua/aceite',
        monto=1_050_000, plazo='80 días hábiles',
        nota_ant='Anticipo aprobado por VP operaciones. Prioridad campo.',
        planos=['Separador trifásico 6" — planos proceso y recipiente a presión ASME VIII',
                'Separador trifásico — instrumentación y control (P&ID) rev.3'],
        pm1_emisor='Ing. Marchand, F.', pm1_equipo='Área recipientes a presión', pm1_plazo='45 días',
        pm1_items=[(400,'Acero inoxidable 304','Cuerpo y tapas del separador','ASME SA-240 TP304'),
                   (12,'Válvula de cierre DN100','Entradas, salidas y drenajes','API 600 clase 300')],
        pm1_mats=[('Acero inoxidable 304',400,600,'kg',MP),
                  ('Válvula de cierre DN100',12,3_500,'u',FIN)],
        pm1_nota_ing='Conforme. Acero con certificado MTR ASME. Válvulas con prueba de asiento.',
        pm1_mov=[('Acero inoxidable 304',400),('Válvula de cierre DN100',12)],
        pm2_emisor='Ing. Marchand, F.', pm2_equipo='Instrumentación', pm2_plazo='30 días',
        pm2_items=[(2,'Motor eléctrico 15kW','Bomba de extracción de líquido','ATEX Zona 1'),
                   (180,'Cable eléctrico 6mm²','Circuito ATEX','Apantallado certificado')],
    ),
    dict(
        cliente='CENTRAL ELÉCTRICA PAMPA S.A.',
        desc='Sistema de enfriamiento agua ciclo abierto — 1.200 m³/h',
        monto=890_000, plazo='70 días hábiles',
        nota_ant='Anticipo aprobado por directorio. Ligado a ampliación de central.',
        planos=['Sistema cooling 1.200m³/h — diagrama de flujo y P&ID rev.4',
                'Cooling system — layout tuberías y ubicación equipos rev.2'],
        pm1_emisor='Ing. Benavidez, O.', pm1_equipo='Área servicios agua', pm1_plazo='40 días',
        pm1_items=[(200,'Tubería HDPE Ø160mm','Colector principal entrada/salida','PN12,5'),
                   (8,'Válvula de alivio 3/4"','Protección circuitos secundarios',''),
                   (16,'Brida DN100 PN16 acero','Conexiones a manifold','Embrido c/tuer.')],
        pm1_mats=[('Tubería HDPE Ø160mm',200,480,'m',PL),
                  ('Válvula de alivio 3/4"',8,2_800,'u',FIN),
                  ('Brida DN100 PN16 acero',16,1_200,'u',HSC)],
        pm1_nota_ing='Conforme. Bridas con certificado ASTM A105.',
        pm1_mov=[('Tubería HDPE Ø160mm',200),('Válvula de alivio 3/4"',8),('Brida DN100 PN16 acero',16)],
        pm2_emisor='Ing. Benavidez, O.', pm2_equipo='Equipos rotativos', pm2_plazo='35 días',
        pm2_items=[(4,'Bomba centrífuga 3HP','Bombas de circulación secundario','In-line ANSI B73'),
                   (300,'Cable eléctrico 6mm²','Alimentación tablero bombas',''),
                   (600,'Tornillo M12x50 galvanizado','Soporte tuberías y equipos','')],
    ),
]

# ANTICIPO PENDIENTE
_ANT_PENDIENTE = [
    dict(
        cliente='YACIMIENTOS SUR S.A.',
        desc='Torre de destilación atmosférica — 12 platos, capacidad 8.000 L/h',
        monto=85_000, moneda='USD', plazo='120 días hábiles',
        obs='Anticipo en revisión por área legal. Se aguarda confirmación de transferencia internacional.',
    ),
    dict(
        cliente='AUTOMOTRIZ RÍO NEGRO S.A.',
        desc='Cabina de pintura electrostática — 2 pistolas, capacidad 6 carrocerias/h',
        monto=45_000, moneda='USD', plazo='60 días hábiles',
        obs='Anticipo sujeto a aprobación crediticia del cliente. Banco intermediario: BBVA.',
    ),
    dict(
        cliente='ACERÍA NACIONAL SRL',
        desc='Cuchara de colada de acero líquido — capacidad 15 Tn',
        monto=120_000, moneda='USD', plazo='90 días hábiles',
        obs='Transferencia internacional en proceso. Intermediario financiero HSBC. ETA 5-7 días hábiles.',
    ),
]

# ANTICIPO RECHAZADO
_ANT_RECHAZADO = [
    dict(
        cliente='CEMENTO DEL NORTE S.A.',
        desc='Extractor de polvo industrial — caudal 40.000 m³/h con filtros de mangas',
        monto=320_000, plazo='60 días hábiles',
        obs='Rechazado: no se presentó memoria de cálculo estructural ni plano de emplazamiento. '
            'Solicitar nueva documentación. Contacto: Ing. Peralta — (0381) 452-8801.',
    ),
    dict(
        cliente='CONSTRUCTORA MESOPOTAMIA S.A.',
        desc='Planta de hormigón por ciclos — 60 m³/h con silo 200 Tn',
        monto=890_000, plazo='75 días hábiles',
        obs='Rechazado: planos de obra civil no aprobados por la municipalidad de Posadas. '
            'Requiere visado municipal previo al inicio. Volver a presentar con documentación aprobada.',
    ),
    dict(
        cliente='AVÍCOLA PATAGÓNICA S.A.',
        desc='Planta de procesamiento y eviscerado — 6.000 aves/h',
        monto=450_000, plazo='65 días hábiles',
        obs='Rechazado: cliente modificó alcance del proyecto incorporando línea de subproductos. '
            'Requiere nueva ingeniería y presupuesto diferenciado. En renegociación.',
    ),
]


class Command(BaseCommand):
    help = 'Seed 30 OFs de demo (3 × 10 estados) para demostración del ERP SIBOTEC'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Eliminar datos existentes antes de sembrar')

    def handle(self, *args, **options):
        if options['reset']:
            self._clear()
        self._seed()

    # ─────────────────────────────────────────────────────────────────
    # Limpieza
    # ─────────────────────────────────────────────────────────────────

    def _clear(self):
        from logistica.models import Despacho
        from produccion.models import Lote
        from panol.models import Ingreso, Movimiento, MovimientoItem, Stock
        from compras.models import FacturaCompra, MaterialCompra, Insumo, Proveedor
        from desarrollo.models import PedidoMaterial, PedidoMaterialItem, OrdenCompra, Plano
        from comercial.models import OrdenFabricacion, Anticipo

        self.stdout.write('Limpiando datos existentes...')
        for model in [Despacho, Lote, Ingreso, MovimientoItem, Movimiento, Stock,
                      MaterialCompra, FacturaCompra, Insumo, Proveedor,
                      PedidoMaterialItem, OrdenCompra, Plano, PedidoMaterial,
                      Anticipo, OrdenFabricacion]:
            n = model.objects.count()
            model.objects.all().delete()
            if n:
                self.stdout.write(f'  ✗ {n} {model.__name__}')

    # ─────────────────────────────────────────────────────────────────
    # Orquestación
    # ─────────────────────────────────────────────────────────────────

    def _seed(self):
        import random
        self.stdout.write('\nCreando datos de demostración...\n')
        prov = self._seed_proveedores()
        ins = self._seed_insumos()
        self.stdout.write('')

        # Construir lista de callables y mezclar antes de insertar
        scenarios = []
        for s in _EJECUTADOS:
            scenarios.append(lambda s=s: self._seed_ejecutado(s, prov, ins))
        for s in _AUTORIZADOS:
            scenarios.append(lambda s=s: self._seed_autorizado(s, prov, ins))
        for s in _ESPERANDO_AUTH:
            scenarios.append(lambda s=s: self._seed_esperando_auth(s, prov, ins))
        for s in _RECHAZADO_REINTENTO:
            scenarios.append(lambda s=s: self._seed_rechazado_reintento(s, prov, ins))
        for s in _LOTE_TERMINADO:
            scenarios.append(lambda s=s: self._seed_lote_terminado(s, prov, ins))
        for s in _NO_CONFORME:
            scenarios.append(lambda s=s: self._seed_no_conforme(s, prov, ins))
        for s in _PANOL_PENDIENTE:
            scenarios.append(lambda s=s: self._seed_panol_pendiente(s, prov, ins))
        for s in _MULTI_PM:
            scenarios.append(lambda s=s: self._seed_multi_pm(s, prov, ins))
        for s in _ANT_PENDIENTE:
            scenarios.append(lambda s=s: self._seed_anticipo_pendiente(s))
        for s in _ANT_RECHAZADO:
            scenarios.append(lambda s=s: self._seed_anticipo_rechazado(s))

        random.shuffle(scenarios)
        for fn in scenarios:
            fn()

        self.stdout.write(self.style.SUCCESS('\n✓ 30 OFs creadas (mezcladas aleatoriamente)'))
        self._print_summary()

    def _print_summary(self):
        rows = [
            ('✅', 'EJECUTADO ×3',              'Tanque · Cámara fría · Digestor'),
            ('🚛', 'AUTORIZADO ×3',             'Caldera · Cisterna · Evaporador'),
            ('🔐', 'ESPERANDO AUTH ×3',         'Filtro · Extrusora · Túnel IQF'),
            ('🔁', 'DESP. RECHAZADO ×3',        'Silo · Criba · Helicoidal'),
            ('📦', 'LOTE TERMINADO ×3',         'Bombeo · Pasteurizador · Kettle'),
            ('⚠️ ', 'NO CONFORME ×3',            'Prensa · Horno TT · Estructura solar'),
            ('🏭', 'INGRESO PENDIENTE ×3',      'Mezclador · Reactor GMP · Humidificador'),
            ('🛒', 'MULTI-PM ×3',               'Potabilizadora · Separador · Cooling'),
            ('⏳', 'ANTICIPO PENDIENTE ×3',     'USD: Torre · Cabina · Cuchara colada'),
            ('❌', 'ANTICIPO RECHAZADO ×3',     'Extractor · Planta HGN · Eviscerado'),
        ]
        self.stdout.write('\n' + '─' * 65)
        self.stdout.write('  ESCENARIO DE DEMO — SIBOTEC SRL  (30 OFs, 10 estados)')
        self.stdout.write('─' * 65)
        for icon, estado, detalle in rows:
            self.stdout.write(f'  {icon}  {estado:<25} {detalle}')
        self.stdout.write('─' * 65)
        self.stdout.write('  7 proveedores · 20 insumos con stock')
        self.stdout.write('─' * 65 + '\n')

    # ─────────────────────────────────────────────────────────────────
    # Helpers de creación ORM
    # ─────────────────────────────────────────────────────────────────

    def _mk_of(self, cliente, desc, monto, plazo, estado='aprobada', moneda='ARS'):
        from comercial.models import OrdenFabricacion
        return OrdenFabricacion.objects.create(
            cliente=cliente, descripcion=desc, plazo_entrega=plazo,
            monto_anticipo=monto, moneda_anticipo=moneda, estado=estado,
        )

    def _mk_anticipo(self, of, monto, estado='validado', pagado=True, obs=''):
        from comercial.models import Anticipo
        return Anticipo.objects.create(
            of_id=of, monto_estimado=monto, estado=estado, pagado=pagado,
            observacion=obs,
            factura_archivo=(
                {'nombre': 'comprobante_anticipo.pdf', 'tipo': 'application/pdf', 'tamanio_bytes': 52480}
                if pagado else None
            ),
        )

    def _mk_pm(self, of, emisor, equipo, plazo, estado='generado'):
        from desarrollo.models import PedidoMaterial
        return PedidoMaterial.objects.create(
            of_id=of, emisor=emisor, fecha=date.today() - timedelta(days=18),
            plazo_entrega=plazo, equipo=equipo, estado=estado,
        )

    def _mk_items(self, pm, items):
        from desarrollo.models import PedidoMaterialItem
        for cant, desc, uso, *rest in items:
            PedidoMaterialItem.objects.create(
                pedido_id=pm, cantidad=cant, descripcion=desc,
                uso_en=uso, observaciones=rest[0] if rest else '',
            )

    def _mk_plano(self, of, desc):
        from desarrollo.models import Plano
        return Plano.objects.create(
            of_id=of, descripcion=desc,
            archivo_nombre=desc[:60].lower().replace(' ', '_').replace('—', '').strip('_') + '.pdf',
            archivo_tipo='application/pdf', archivo_tamanio=280 * 1024, estado='enviado',
        )

    def _mk_factura(self, pm, matas, prov_map, ins_map, estado='ingresada'):
        from compras.models import FacturaCompra, MaterialCompra
        monto = sum(c * p for _, c, p, *_ in matas)
        f = FacturaCompra.objects.create(pedido_material_id=pm, monto_total=monto, estado=estado)
        for nombre, cant, precio, unidad, prov_nombre in matas:
            MaterialCompra.objects.create(
                factura_id=f, insumo=ins_map[nombre],
                cantidad=cant, precio_unitario=precio,
                unidad_medida=unidad, proveedor=prov_map[prov_nombre],
            )
        return f

    def _mk_ingreso(self, factura, matas, verificacion='conforme', notas=''):
        from panol.models import Ingreso
        snapshot = [{'nombre': n, 'cantidad': c, 'precio_unitario': p} for n, c, p, *_ in matas]
        return Ingreso.objects.create(
            factura_id=factura, estado='ingresado', snapshot=snapshot,
            verificacion_estado=verificacion,
            verificacion_notas=notas or ('Sin observaciones.' if verificacion == 'conforme' else ''),
        )

    def _mk_movimiento(self, of, items, ins_map):
        from panol.models import Movimiento, MovimientoItem
        mov = Movimiento.objects.create(of_id=of, estado='despachado')
        for nombre, cantidad in items:
            MovimientoItem.objects.create(movimiento_id=mov, insumo=ins_map[nombre], cantidad=cantidad)
        return mov

    def _mk_lote(self, of, desc, ins_map):
        from desarrollo.models import Plano
        from panol.models import Movimiento
        from produccion.models import Lote
        planos = list(Plano.objects.filter(of_id=of))
        movimientos = list(Movimiento.objects.filter(of_id=of))
        lote = Lote.objects.create(of_id=of, descripcion=desc, estado='terminado')
        lote.planos.set(planos)
        lote.movimientos.set(movimientos)
        return lote

    def _mk_despacho(self, lote, destino, transp, estado, obs=''):
        from logistica.models import Despacho
        d = Despacho.objects.create(
            lote_id=lote, destino=destino, transportista=transp,
            estado=estado, observacion_admin=obs,
        )
        lote.estado = 'en_despacho'
        lote.save()
        return d

    def _flujo_base(self, s, prov, ins):
        """Crea OF→Anticipo→PM→Plano→Factura→Ingreso→Movimiento. Retorna (of, lote_desc)."""
        of = self._mk_of(s['cliente'], s['desc'], s['monto'], s['plazo'])
        self._mk_anticipo(of, s['monto'], obs=s['nota_ant'])
        pm = self._mk_pm(of, s['emisor'], s['equipo'], s['plazo_pm'], 'facturado')
        self._mk_items(pm, s['pm_items'])
        self._mk_plano(of, s['plano'])
        factura = self._mk_factura(pm, s['mats'], prov, ins)
        self._mk_ingreso(factura, s['mats'], notas=s['nota_ing'])
        mov_items = [(n, c) for n, c, *_ in s['mats']]
        self._mk_movimiento(of, mov_items, ins)
        return of

    # ─────────────────────────────────────────────────────────────────
    # Handlers por tipo de escenario
    # ─────────────────────────────────────────────────────────────────

    def _seed_ejecutado(self, s, prov, ins):
        of = self._flujo_base(s, prov, ins)
        lote = self._mk_lote(of, s['lote'], ins)
        self._mk_despacho(lote, s['destino'], s['transp'], 'ejecutado', s['nota_desp'])
        self.stdout.write(f'    ✅ {s["cliente"]}')

    def _seed_autorizado(self, s, prov, ins):
        of = self._flujo_base(s, prov, ins)
        lote = self._mk_lote(of, s['lote'], ins)
        self._mk_despacho(lote, s['destino'], s['transp'], 'autorizado', s['nota_desp'])
        self.stdout.write(f'    🚛 {s["cliente"]}')

    def _seed_esperando_auth(self, s, prov, ins):
        of = self._flujo_base(s, prov, ins)
        lote = self._mk_lote(of, s['lote'], ins)
        self._mk_despacho(lote, s['destino'], s['transp'], 'esperando_autorizacion')
        self.stdout.write(f'    🔐 {s["cliente"]}')

    def _seed_rechazado_reintento(self, s, prov, ins):
        from logistica.models import Despacho
        of = self._flujo_base(s, prov, ins)
        lote = self._mk_lote(of, s['lote'], ins)
        # Despacho rechazado
        Despacho.objects.create(
            lote_id=lote, destino=s['destino'], transportista=s['transp1'],
            estado='rechazado', observacion_admin=s['motivo_rec'],
        )
        lote.estado = 'en_despacho'
        lote.save()
        # Nuevo intento pendiente
        Despacho.objects.create(
            lote_id=lote, destino=s['destino'], transportista=s['transp2'],
            estado='pendiente', observacion_admin='',
        )
        self.stdout.write(f'    🔁 {s["cliente"]}')

    def _seed_lote_terminado(self, s, prov, ins):
        of = self._flujo_base(s, prov, ins)
        self._mk_lote(of, s['lote'], ins)
        self.stdout.write(f'    📦 {s["cliente"]}')

    def _seed_no_conforme(self, s, prov, ins):
        of = self._mk_of(s['cliente'], s['desc'], s['monto'], s['plazo'])
        self._mk_anticipo(of, s['monto'], obs=s['nota_ant'])
        pm1 = self._mk_pm(of, s['emisor'], s['equipo'], s['plazo_pm'], 'facturado')
        self._mk_items(pm1, s['pm_items'])
        self._mk_plano(of, s['plano'])
        factura = self._mk_factura(pm1, s['mats'], prov, ins)
        self._mk_ingreso(factura, s['mats'], 'no_conforme', s['nota_nc'])
        # Nuevo PM de reposición en estado generado
        pm2 = self._mk_pm(of, s['emisor'], s['equipo'] + ' — reposición', '15 días', 'generado')
        cant, desc_r, uso_r, obs_r = s['item_repo']
        from desarrollo.models import PedidoMaterialItem
        PedidoMaterialItem.objects.create(
            pedido_id=pm2, cantidad=cant, descripcion=desc_r, uso_en=uso_r, observaciones=obs_r,
        )
        self.stdout.write(f'    ⚠️  {s["cliente"]}')

    def _seed_panol_pendiente(self, s, prov, ins):
        of = self._mk_of(s['cliente'], s['desc'], s['monto'], s['plazo'])
        self._mk_anticipo(of, s['monto'], obs=s['nota_ant'])
        pm = self._mk_pm(of, s['emisor'], s['equipo'], s['plazo_pm'], 'facturado')
        self._mk_items(pm, s['pm_items'])
        self._mk_plano(of, s['plano'])
        # Factura registrada pero NO ingresada aún
        self._mk_factura(pm, s['mats'], prov, ins, estado='registrada')
        self.stdout.write(f'    🏭 {s["cliente"]}')

    def _seed_multi_pm(self, s, prov, ins):
        of = self._mk_of(s['cliente'], s['desc'], s['monto'], s['plazo'])
        self._mk_anticipo(of, s['monto'], obs=s['nota_ant'])
        for p in s['planos']:
            self._mk_plano(of, p)
        # PM1: completo (facturado, ingresado, movido a producción)
        pm1 = self._mk_pm(of, s['pm1_emisor'], s['pm1_equipo'], s['pm1_plazo'], 'facturado')
        self._mk_items(pm1, s['pm1_items'])
        f1 = self._mk_factura(pm1, s['pm1_mats'], prov, ins)
        self._mk_ingreso(f1, s['pm1_mats'], notas=s['pm1_nota_ing'])
        self._mk_movimiento(of, s['pm1_mov'], ins)
        # PM2: pendiente en compras
        pm2 = self._mk_pm(of, s['pm2_emisor'], s['pm2_equipo'], s['pm2_plazo'], 'generado')
        self._mk_items(pm2, s['pm2_items'])
        self.stdout.write(f'    🛒 {s["cliente"]}')

    def _seed_anticipo_pendiente(self, s):
        of = self._mk_of(s['cliente'], s['desc'], s['monto'], s['plazo'],
                         estado='pendiente_anticipo', moneda=s['moneda'])
        self._mk_anticipo(of, s['monto'], estado='pendiente', pagado=False, obs=s['obs'])
        self.stdout.write(f'    ⏳ {s["cliente"]} ({s["moneda"]} {s["monto"]:,})')

    def _seed_anticipo_rechazado(self, s):
        of = self._mk_of(s['cliente'], s['desc'], s['monto'], s['plazo'],
                         estado='rechazada_anticipo')
        self._mk_anticipo(of, s['monto'], estado='rechazado', pagado=False, obs=s['obs'])
        self.stdout.write(f'    ❌ {s["cliente"]}')

    # ─────────────────────────────────────────────────────────────────
    # Catálogo base
    # ─────────────────────────────────────────────────────────────────

    def _seed_proveedores(self):
        from compras.models import Proveedor
        result = {}
        for nombre in PROVEEDORES:
            p, _ = Proveedor.objects.get_or_create(nombre=nombre)
            result[nombre] = p
        self.stdout.write(f'  ✓ {len(result)} proveedores')
        return result

    def _seed_insumos(self):
        from compras.models import Insumo
        from panol.models import Stock
        ins = {}
        for nombre, cat, subcat, unidad, stock_qty in INSUMOS:
            insumo, _ = Insumo.objects.get_or_create(
                nombre=nombre, defaults={'categoria': cat, 'subcategoria': subcat, 'unidad': unidad},
            )
            ins[nombre] = insumo
            Stock.objects.update_or_create(insumo=insumo, defaults={'cantidad': stock_qty, 'unidad': unidad})
        self.stdout.write(f'  ✓ {len(ins)} insumos con stock')
        return ins
