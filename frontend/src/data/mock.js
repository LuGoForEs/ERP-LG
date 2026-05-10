export const V2_MOCK = {
  ofs: [
    { id: 1, cliente: 'Aceros del Sur SA', descripcion: 'Tanque AISI 304 — 5.000 L', plazo_entrega: '45 días', estado: 'pendiente_anticipo', monto_anticipo: 850000, moneda: 'ARS' },
    { id: 2, cliente: 'Petroquímica Andina', descripcion: 'Intercambiador de calor — carcasa y tubos', plazo_entrega: '60 días', estado: 'aprobada', monto_anticipo: 1200000, moneda: 'ARS' },
    { id: 3, cliente: 'LabChem SRL', descripcion: 'Reactor agitado acero inox — 2.000 L', plazo_entrega: '90 días', estado: 'aprobada', monto_anticipo: 28000, moneda: 'USD' },
    { id: 4, cliente: 'Frigorífico del Norte', descripcion: 'Cuba de lavado AISI 316 — 800 L', plazo_entrega: '30 días', estado: 'pendiente_anticipo', monto_anticipo: 350000, moneda: 'ARS' },
    { id: 5, cliente: 'Cervecería Patagonia', descripcion: 'Fermentador cónico 3.000 L', plazo_entrega: '75 días', estado: 'aprobada', monto_anticipo: 480000, moneda: 'ARS' },
    { id: 6, cliente: 'Lácteos San Vicente', descripcion: 'Tanque pulmón 1.500 L sanitario', plazo_entrega: '40 días', estado: 'pendiente_anticipo', monto_anticipo: 520000, moneda: 'ARS' },
  ],
  pms: [
    { id: 1, of_id: 2, emisor: 'Ing. Díaz', fecha: '2026-04-15', plazo_entrega: '2026-05-10', equipo: 'Intercambiador carcasa', estado: 'pendiente',
      items: [
        { id: 1, cantidad: 50, unidad: 'kg', descripcion: 'Chapa AISI 316L e=3mm', uso_en: 'Carcasa', observaciones: '' },
        { id: 2, cantidad: 12, unidad: 'm', descripcion: 'Caño sin costura 2" SCH40', uso_en: 'Tubería', observaciones: 'Cert. requerido' },
        { id: 3, cantidad: 8, unidad: 'u', descripcion: 'Brida slip-on DN50 150# SS304', uso_en: 'Conexiones', observaciones: '' },
      ]},
    { id: 2, of_id: 3, emisor: 'Téc. Romero', fecha: '2026-04-18', plazo_entrega: '2026-05-20', equipo: 'Reactor cuerpo', estado: 'generado',
      items: [
        { id: 4, cantidad: 120, unidad: 'kg', descripcion: 'Chapa AISI 304 e=4mm', uso_en: 'Cuerpo reactor', observaciones: '' },
        { id: 5, cantidad: 3, unidad: 'u', descripcion: 'Motor agitador 2HP 1450 RPM', uso_en: 'Agitación', observaciones: 'Siemens o equiv.' },
      ]},
    { id: 3, of_id: 5, emisor: 'Ing. Pérez', fecha: '2026-04-22', plazo_entrega: '2026-05-30', equipo: 'Fermentador casco', estado: 'pendiente',
      items: [
        { id: 6, cantidad: 80, unidad: 'kg', descripcion: 'Chapa AISI 304 e=3mm', uso_en: 'Casco', observaciones: '' },
        { id: 7, cantidad: 1, unidad: 'u', descripcion: 'Válvula sanitaria 2" tri-clamp', uso_en: 'Salida fondo', observaciones: '' },
      ]},
  ],
  planos: [
    { id: 1, of_id: 2, descripcion: 'Plano general intercambiador — rev.3', estado: 'enviado', archivo: { nombre: 'IC-rev3-general.pdf', tamanio_bytes: 842000 } },
    { id: 2, of_id: 3, descripcion: 'Plano reactor — vista explosionada', estado: 'generado', archivo: { nombre: 'RX-exploded.pdf', tamanio_bytes: 1240000 } },
    { id: 3, of_id: 5, descripcion: 'Fermentador cónico — corte longitudinal', estado: 'enviado', archivo: { nombre: 'FC-cut-rev2.pdf', tamanio_bytes: 956000 } },
  ],
  stock: [
    { id: 1, material: 'Chapa AISI 304 e=3mm', stock_actual: 85, unidad: 'kg', umbral: 50 },
    { id: 2, material: 'Soldadura MIG ER308L', stock_actual: 12, unidad: 'rollos', umbral: 5 },
    { id: 3, material: 'Perfil HEB 200', stock_actual: 18, unidad: 'm', umbral: 10 },
    { id: 4, material: 'Caño SCH40 2"', stock_actual: 32, unidad: 'm', umbral: 20 },
    { id: 5, material: 'Brida DN50 SS304', stock_actual: 7, unidad: 'u', umbral: 10 },
    { id: 6, material: 'Chapa AISI 316L e=3mm', stock_actual: 4, unidad: 'kg', umbral: 30 },
    { id: 7, material: 'Tornillo M12 SS304', stock_actual: 240, unidad: 'u', umbral: 100 },
    { id: 8, material: 'Junta NBR DN50', stock_actual: 28, unidad: 'u', umbral: 15 },
  ],
  movimientos: [
    { id: 1, tipo: 'ingreso', material: 'Chapa AISI 304 e=3mm', cantidad: 50, unidad: 'kg', referencia: 'Factura FC-042', fecha: '2026-04-20' },
    { id: 2, tipo: 'egreso',  material: 'Soldadura MIG ER308L', cantidad: 3, unidad: 'rollos', referencia: 'OF-2 / Línea 1', fecha: '2026-04-22' },
    { id: 3, tipo: 'egreso',  material: 'Perfil HEB 200', cantidad: 6, unidad: 'm', referencia: 'OF-3 / Montaje', fecha: '2026-04-24' },
    { id: 4, tipo: 'ingreso', material: 'Brida DN50 SS304', cantidad: 12, unidad: 'u', referencia: 'Factura FC-043', fecha: '2026-04-26' },
    { id: 5, tipo: 'ingreso', material: 'Tornillo M12 SS304', cantidad: 100, unidad: 'u', referencia: 'Factura FC-044', fecha: '2026-04-28' },
  ],
  lotes: [
    { id: 1, of_id: 2, cliente: 'Petroquímica Andina', producto: 'Intercambiador carcasa y tubos', cantidad: 1, estado: 'en_proceso', fecha_inicio: '2026-04-20' },
    { id: 2, of_id: 5, cliente: 'Cervecería Patagonia', producto: 'Fermentador cónico 3.000 L', cantidad: 1, estado: 'en_proceso', fecha_inicio: '2026-04-25' },
  ],
  despachos: [
    { id: 1, lote_id: 1, cliente: 'Petroquímica Andina', destino: 'Ruta Nacional 7 — Km 88, Luján', transportista: 'Transportes Norte SRL', estado: 'pendiente_autorizacion', remito: 'R-0042' },
  ],
  categorias: [
    { id: 'mat-prima',    nombre: 'Materia prima',     subcategorias: ['Chapas', 'Caños', 'Perfiles', 'Barras'] },
    { id: 'consumibles',  nombre: 'Consumibles',       subcategorias: ['Soldadura', 'Discos de corte', 'Lijas', 'Gases'] },
    { id: 'fijaciones',   nombre: 'Fijaciones',        subcategorias: ['Tornillos', 'Tuercas', 'Arandelas', 'Bulones'] },
    { id: 'accesorios',   nombre: 'Accesorios',        subcategorias: ['Bridas', 'Juntas', 'Válvulas', 'Codos'] },
    { id: 'herramientas', nombre: 'Herramientas',      subcategorias: ['Manuales', 'Eléctricas', 'Mediciones', 'EPP'] },
  ],
  articulos: [
    { id: 1, nombre: 'Chapa AISI 304 e=3mm',   categoria: 'mat-prima',   subcategoria: 'Chapas',     unidad: 'kg', cantidad: 85, fecha_alta: '2026-03-10' },
    { id: 2, nombre: 'Soldadura MIG ER308L',   categoria: 'consumibles', subcategoria: 'Soldadura',  unidad: 'rollos', cantidad: 12, fecha_alta: '2026-03-12' },
    { id: 3, nombre: 'Perfil HEB 200',         categoria: 'mat-prima',   subcategoria: 'Perfiles',   unidad: 'm', cantidad: 18, fecha_alta: '2026-03-15' },
    { id: 4, nombre: 'Brida DN50 SS304',       categoria: 'accesorios',  subcategoria: 'Bridas',     unidad: 'u', cantidad: 7,  fecha_alta: '2026-03-20' },
    { id: 5, nombre: 'Tornillo M12 SS304',     categoria: 'fijaciones',  subcategoria: 'Tornillos',  unidad: 'u', cantidad: 240, fecha_alta: '2026-03-22' },
  ],
};

export const V2_MODULES = [
  { id: 'comercial',      name: 'Comercial',      shortcut: 'c', accent: 'blue'    },
  { id: 'administracion', name: 'Administración', shortcut: 'a', accent: 'violet'  },
  { id: 'desarrollo',     name: 'Desarrollo',     shortcut: 'd', accent: 'cyan'    },
  { id: 'compras',        name: 'Compras',        shortcut: 'p', accent: 'amber'   },
  { id: 'panol',          name: 'Pañol',          shortcut: 'n', accent: 'emerald' },
  { id: 'produccion',     name: 'Producción',     shortcut: 'r', accent: 'rose'    },
  { id: 'logistica',      name: 'Logística',      shortcut: 'l', accent: 'orange'  },
];

export const V2_MODULE_ICONS = {
  comercial: 'briefcase', administracion: 'wallet', desarrollo: 'compass',
  compras: 'shopping', panol: 'package', produccion: 'factory', logistica: 'truck',
};

export const V2_ESTADO = {
  pendiente_anticipo:      { label: 'Pend. anticipo',  accent: 'amber' },
  aprobada:                { label: 'Aprobada',         accent: 'emerald' },
  rechazada_anticipo:      { label: 'Rechazada',        accent: 'rose' },
  pendiente:               { label: 'Pendiente',        accent: 'amber' },
  generado:                { label: 'Generado',         accent: 'blue' },
  facturado:               { label: 'Facturado',        accent: 'violet' },
  registrada:              { label: 'Registrada',       accent: 'blue' },
  ingresada:               { label: 'Ingresada',        accent: 'emerald' },
  enviado:                 { label: 'Enviado',          accent: 'cyan' },
  validado:                { label: 'Validado',         accent: 'emerald' },
  rechazado:               { label: 'Rechazado',        accent: 'rose' },
  en_proceso:              { label: 'En proceso',       accent: 'cyan' },
  terminado:               { label: 'Terminado',        accent: 'emerald' },
  en_despacho:             { label: 'En despacho',      accent: 'orange' },
  pendiente_autorizacion:  { label: 'Pend. autoriz.',   accent: 'amber' },
  esperando_autorizacion:  { label: 'En revisión',      accent: 'violet' },
  autorizado:              { label: 'Autorizado',        accent: 'emerald' },
  ejecutado:               { label: 'Ejecutado',         accent: 'slate' },
  procesado:               { label: 'Procesado',         accent: 'emerald' },
  ingresado:               { label: 'Ingresado',         accent: 'emerald' },
  despachado:              { label: 'Despachado',        accent: 'blue' },
  emitida:                 { label: 'Emitida',           accent: 'cyan' },
};
