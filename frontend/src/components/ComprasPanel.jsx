import React, { useState, useEffect } from 'react';
import {
  Package,
  ShoppingCart,
  Truck,
  DollarSign,
  Search,
  Plus,
  Trash2,
  History,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  X,
  CreditCard,
  User,
  Info,
  Layers,
  Star,
  TrendingUp,
  ArrowRight,
  Upload,
  FileText,
  Download,
  Tag,
  LayoutGrid,
  CheckCheck,
} from 'lucide-react';

const API_BASE = '/api/v1';

export default function ComprasPanel() {
  const [pedidosPendientes, setPedidosPendientes] = useState([]);
  const [facturas, setFacturas] = useState([]);
  
  const [selectedPedidoId, setSelectedPedidoId] = useState('');
  
  // The list of items to buy
  const [materiales, setMateriales] = useState([{ 
    nombre: '', 
    proveedor: '', 
    unidad_medida: 'unidades', 
    cantidad: 1, 
    precio_unitario: 0 
  }]);

  // Autocomplete states keyed by material index
  const [insumosSugeridos, setInsumosSugeridos] = useState({});
  const [mostrarSugerenciasInsumo, setMostrarSugerenciasInsumo] = useState({});
  const [proveedoresSugeridos, setProveedoresSugeridos] = useState({});
  const [mostrarSugerenciasProv, setMostrarSugerenciasProv] = useState({});

  const [pdfFile, setPdfFile] = useState(null);

  // Gestión de artículos
  const [articulos, setArticulos] = useState([]);
  const [articuloForm, setArticuloForm] = useState({ nombre: '', categoria: '', subcategoria: '', unidad: 'u', cantidad: 0 });
  const [modalAbierto, setModalAbierto] = useState(false);
  const [articuloLoading, setArticuloLoading] = useState(false);
  const [articuloMsg, setArticuloMsg] = useState(null);
  const [excelFile, setExcelFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [articuloSearch, setArticuloSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchPedidosPendientes = async () => {
    try {
      const res = await fetch(`${API_BASE}/compras/pedidos-material`);
      const data = await res.json();
      setPedidosPendientes(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFacturas = async () => {
    try {
      const res = await fetch(`${API_BASE}/compras/facturas`);
      const data = await res.json();
      setFacturas(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchArticulos = async () => {
    try {
      const res = await fetch(`${API_BASE}/compras/insumos`);
      const data = await res.json();
      setArticulos(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPedidosPendientes();
    fetchFacturas();
    fetchArticulos();
  }, []);

  const handleCloseModal = () => {
    setModalAbierto(false);
    setArticuloMsg(null);
    setArticuloForm({ nombre: '', categoria: '', subcategoria: '', unidad: 'u', cantidad: 0 });
  };

  const handleCrearArticulo = async (e) => {
    e.preventDefault();
    if (!articuloForm.nombre.trim()) return;
    setArticuloLoading(true);
    setArticuloMsg(null);
    try {
      const res = await fetch(`${API_BASE}/compras/insumos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(articuloForm),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || 'Error al guardar artículo');
      setArticuloMsg({ tipo: 'ok', texto: result.message });
      fetchArticulos();
      setTimeout(() => {
        handleCloseModal();
      }, 1200);
    } catch (err) {
      setArticuloMsg({ tipo: 'error', texto: err.message });
    } finally {
      setArticuloLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    const res = await fetch(`${API_BASE}/compras/insumos/template`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_articulos.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async () => {
    if (!excelFile) return;
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const formData = new FormData();
      formData.append('archivo', excelFile);
      const res = await fetch(`${API_BASE}/compras/insumos/bulk`, { method: 'POST', body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || 'Error en la carga masiva');
      setBulkResult({ tipo: 'ok', ...result.data, mensaje: result.message });
      setExcelFile(null);
      fetchArticulos();
    } catch (err) {
      setBulkResult({ tipo: 'error', mensaje: err.message });
    } finally {
      setBulkLoading(false);
    }
  };

  const articulosFiltrados = articulos.filter(a =>
    a.nombre.toLowerCase().includes(articuloSearch.toLowerCase()) ||
    a.categoria.toLowerCase().includes(articuloSearch.toLowerCase()) ||
    a.subcategoria.toLowerCase().includes(articuloSearch.toLowerCase())
  );

  const handleInsumoQueryChange = async (index, query) => {
    const newMateriales = [...materiales];
    newMateriales[index].nombre = query;
    setMateriales(newMateriales);

    if (!query || query.length < 2) {
      setInsumosSugeridos(prev => ({ ...prev, [index]: [] }));
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/compras/insumos?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setInsumosSugeridos(prev => ({ ...prev, [index]: data.data || [] }));
      setMostrarSugerenciasInsumo(prev => ({ ...prev, [index]: true }));
    } catch (err) {
      console.error(err);
    }
  };

  const selectInsumo = (index, insumoName) => {
    const newMateriales = [...materiales];
    newMateriales[index].nombre = insumoName;
    setMateriales(newMateriales);
    setMostrarSugerenciasInsumo(prev => ({ ...prev, [index]: false }));
  };

  const handleProvQueryChange = async (index, query) => {
    const newMateriales = [...materiales];
    newMateriales[index].proveedor = query;
    setMateriales(newMateriales);

    if (!query || query.length < 2) {
      setProveedoresSugeridos(prev => ({ ...prev, [index]: [] }));
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/compras/proveedores?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setProveedoresSugeridos(prev => ({ ...prev, [index]: data.data || [] }));
      setMostrarSugerenciasProv(prev => ({ ...prev, [index]: true }));
    } catch (err) {
      console.error(err);
    }
  };

  const selectProveedor = (index, provName) => {
    const newMateriales = [...materiales];
    newMateriales[index].proveedor = provName;
    setMateriales(newMateriales);
    setMostrarSugerenciasProv(prev => ({ ...prev, [index]: false }));
  };

  const addMaterial = () => {
    setMateriales([...materiales, { nombre: '', proveedor: '', unidad_medida: 'unidades', cantidad: 1, precio_unitario: 0 }]);
  };

  const removeMaterial = (index) => {
    if (materiales.length === 1) return;
    const newMateriales = materiales.filter((_, i) => i !== index);
    setMateriales(newMateriales);
  };

  const handleMaterialChange = (index, field, value) => {
    const newMateriales = [...materiales];
    newMateriales[index][field] = value;
    setMateriales(newMateriales);
  };

  const handleProcesarCompra = (pedido) => {
    setSelectedPedidoId(pedido.id);
    const preloaded = pedido.items.map(item => ({
      nombre: item.descripcion,
      proveedor: '',
      unidad_medida: 'unidades', 
      cantidad: item.cantidad,
      precio_unitario: 0
    }));
    
    setMateriales(preloaded.length > 0 ? preloaded : [{ nombre: '', proveedor: '', unidad_medida: 'unidades', cantidad: 1, precio_unitario: 0 }]);
    const element = document.getElementById('compras-form');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSubmitFactura = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append('pedido_material_id', parseInt(selectedPedidoId));
      formData.append('materiales', JSON.stringify(
        materiales.map(m => ({
          nombre: m.nombre,
          cantidad: parseFloat(m.cantidad),
          unidad_medida: m.unidad_medida,
          precio_unitario: parseFloat(m.precio_unitario),
          proveedor: m.proveedor || 'S/D',
        }))
      ));
      if (pdfFile) formData.append('pdf', pdfFile);

      const res = await fetch(`${API_BASE}/compras/facturas`, {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || 'Error al registrar factura');

      setSuccessMsg('Pedido de Material (PM) registrado correctamente');
      setSelectedPedidoId('');
      setMateriales([{ nombre: '', proveedor: '', unidad_medida: 'unidades', cantidad: 1, precio_unitario: 0 }]);
      setPdfFile(null);

      fetchPedidosPendientes();
      fetchFacturas();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalOC = materiales.reduce((acc, m) => acc + (parseFloat(m.cantidad || 0) * parseFloat(m.precio_unitario || 0)), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-white">Módulo de Compras</h2>
          <p className="font-body-md text-body-md text-outline mt-1">Gestión de abastecimiento y procesamiento de requisiciones.</p>
        </div>
        <button 
          onClick={() => {
            setSelectedPedidoId('');
            setMateriales([{ nombre: '', proveedor: '', unidad_medida: 'unidades', cantidad: 1, precio_unitario: 0 }]);
            document.getElementById('compras-form')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-primary hover:bg-primary-fixed-dim text-on-primary font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-lg transition-all shadow-lg shadow-primary/10 flex items-center gap-2 active:scale-95"
        >
          <Plus size={16} />
          Nueva Requisición Directa
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Total Compras (Mes)" value={`$${(totalOC + 1240000).toLocaleString()}`} icon="shopping_cart" color="text-primary" trend="+4.2% vs Q3" />
        <KPICard title="PMs Pendientes" value={pedidosPendientes.length.toString()} icon="pending_actions" color="text-error" trend="Requiere atención" />
        <KPICard title="Proveedores" value="156" icon="domain" color="text-tertiary" trend="3 nuevos hoy" />
        <KPICard title="Facturas" value={facturas.length.toString()} icon="receipt_long" color="text-secondary" trend="Sincronizado" />
      </div>

      {/* ── SECCIÓN GESTIÓN DE ARTÍCULOS ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-headline-sm text-headline-sm text-white flex items-center gap-2">
            <Tag size={18} className="text-tertiary" />
            Gestión de Artículos
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-outline uppercase tracking-widest">{articulos.length} artículos registrados</span>
            <button
              onClick={() => setModalAbierto(true)}
              className="flex items-center gap-2 px-4 py-2 bg-tertiary/20 hover:bg-tertiary/30 border border-tertiary/30 text-tertiary font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95"
            >
              <Plus size={14} />
              Agregar Artículo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Carga masiva */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Upload size={80} className="text-primary" />
            </div>
            <h4 className="text-[10px] font-black text-outline uppercase tracking-[0.2em] mb-4 flex items-center gap-2 relative z-10">
              <Upload size={12} className="text-primary" />
              Carga Masiva (Excel)
            </h4>

            <div className="space-y-4 relative z-10">
              <button
                onClick={handleDownloadTemplate}
                className="w-full flex items-center justify-center gap-2 py-3 bg-background/40 hover:bg-primary/10 border border-dashed border-outline-variant hover:border-primary/40 rounded-xl text-[10px] font-black text-outline hover:text-primary uppercase tracking-widest transition-all"
              >
                <Download size={14} />
                Descargar Plantilla .xlsx
              </button>

              <div className="space-y-2">
                <label className={`flex flex-col items-center justify-center gap-2 w-full cursor-pointer border-2 border-dashed rounded-xl py-8 px-4 transition-all ${
                  excelFile
                    ? 'border-secondary/50 bg-secondary/5'
                    : 'border-outline-variant hover:border-primary/40 hover:bg-primary/5'
                }`}>
                  <FileText size={24} className={excelFile ? 'text-secondary' : 'text-outline'} />
                  <span className={`text-[10px] font-bold text-center ${excelFile ? 'text-secondary' : 'text-outline'}`}>
                    {excelFile ? excelFile.name : 'Seleccioná el archivo .xlsx'}
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={e => { setExcelFile(e.target.files?.[0] || null); setBulkResult(null); }}
                  />
                </label>

                {bulkResult && (
                  <div className={`p-3 rounded-xl border text-[10px] space-y-1 ${
                    bulkResult.tipo === 'ok'
                      ? 'bg-secondary/10 border-secondary/30 text-secondary'
                      : 'bg-error/10 border-error/30 text-error'
                  }`}>
                    <p className="font-black">{bulkResult.mensaje}</p>
                    {bulkResult.tipo === 'ok' && (
                      <div className="flex gap-4">
                        <span>✓ Creados: <b>{bulkResult.creados}</b></span>
                        <span>↻ Actualizados: <b>{bulkResult.actualizados}</b></span>
                        {bulkResult.errores?.length > 0 && (
                          <span className="text-error">✗ Errores: <b>{bulkResult.errores.length}</b></span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleBulkUpload}
                  disabled={!excelFile || bulkLoading}
                  className="w-full py-3 bg-primary hover:bg-primary/90 text-on-primary font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  Cargar Artículos
                </button>
              </div>
            </div>
          </div>

          {/* Lista de artículos */}
          <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-lg flex flex-col">
            <div className="p-4 border-b border-outline-variant flex items-center gap-2 bg-background/30">
              <Search size={14} className="text-outline shrink-0" />
              <input
                type="text"
                value={articuloSearch}
                onChange={e => setArticuloSearch(e.target.value)}
                placeholder="Buscar por nombre, categoría..."
                className="flex-1 bg-transparent text-xs text-on-surface placeholder:text-outline focus:outline-none"
              />
            </div>
            <div className="overflow-y-auto max-h-80 divide-y divide-outline-variant/30">
              {articulosFiltrados.length === 0 ? (
                <p className="p-6 text-center text-outline italic text-xs">
                  {articuloSearch ? 'Sin resultados' : 'No hay artículos registrados'}
                </p>
              ) : (
                articulosFiltrados.map(art => (
                  <div key={art.id} className="px-4 py-3 hover:bg-surface-variant transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-medium text-on-surface leading-tight">{art.nombre}</span>
                      <span className="text-[9px] font-black text-outline bg-background/50 border border-outline-variant px-1.5 py-0.5 rounded shrink-0">{art.unidad}</span>
                    </div>
                    {(art.categoria || art.subcategoria) && (
                      <div className="flex gap-1 mt-1">
                        {art.categoria && (
                          <span className="text-[8px] font-bold text-tertiary bg-tertiary/10 border border-tertiary/20 px-1.5 py-0.5 rounded-full">
                            {art.categoria}
                          </span>
                        )}
                        {art.subcategoria && (
                          <span className="text-[8px] font-bold text-outline bg-background/50 border border-outline-variant px-1.5 py-0.5 rounded-full">
                            {art.subcategoria}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── MODAL AGREGAR ARTÍCULO ── */}
      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={e => { if (e.target === e.currentTarget) handleCloseModal(); }}
        >
          <div className="bg-surface-container border border-outline-variant rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <Plus size={120} className="text-tertiary" />
            </div>

            <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-tertiary/10 rounded-xl border border-tertiary/20 text-tertiary">
                  <Tag size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight leading-none">Agregar Artículo</h3>
                  <p className="text-[10px] text-outline font-bold uppercase tracking-widest mt-0.5">Stock inicial opcional</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 text-outline hover:text-on-surface hover:bg-surface-variant rounded-lg transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCrearArticulo} className="p-6 space-y-4 relative z-10">
              {articuloMsg && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-[10px] font-bold ${
                  articuloMsg.tipo === 'ok'
                    ? 'bg-secondary/10 border border-secondary/30 text-secondary'
                    : 'bg-error/10 border border-error/30 text-error'
                }`}>
                  {articuloMsg.tipo === 'ok' ? <CheckCheck size={14} /> : <X size={14} />}
                  {articuloMsg.texto}
                </div>
              )}

              {[
                { label: 'Nombre (*)', key: 'nombre', required: true, placeholder: 'Ej: Tornillo M6 x 25mm' },
                { label: 'Categoría', key: 'categoria', placeholder: 'Ej: Ferretería' },
                { label: 'Subcategoría', key: 'subcategoria', placeholder: 'Ej: Tornillería' },
              ].map(({ label, key, required, placeholder }) => (
                <div key={key} className="space-y-1">
                  <label className="text-[9px] font-black text-outline uppercase tracking-widest">{label}</label>
                  <input
                    type="text"
                    required={required}
                    value={articuloForm[key]}
                    onChange={e => setArticuloForm(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3 text-xs text-on-surface focus:border-tertiary focus:outline-none transition-all"
                    placeholder={placeholder}
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-outline uppercase tracking-widest">Unidad</label>
                  <select
                    value={articuloForm.unidad}
                    onChange={e => setArticuloForm(prev => ({ ...prev, unidad: e.target.value }))}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3 text-xs text-on-surface focus:border-tertiary focus:outline-none transition-all"
                  >
                    <option value="u">Unidad (u)</option>
                    <option value="kg">Kilogramo (kg)</option>
                    <option value="m">Metro (m)</option>
                    <option value="m2">Metro² (m²)</option>
                    <option value="l">Litro (l)</option>
                    <option value="ml">Mililitro (ml)</option>
                    <option value="cm">Centímetro (cm)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-outline uppercase tracking-widest">Cant. Inicial</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={articuloForm.cantidad}
                    onChange={e => setArticuloForm(prev => ({ ...prev, cantidad: e.target.value }))}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3 text-xs text-on-surface focus:border-tertiary focus:outline-none transition-all"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-3 bg-surface-variant hover:bg-background border border-outline-variant text-outline font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={articuloLoading}
                  className="flex-1 py-3 bg-tertiary/20 hover:bg-tertiary/30 border border-tertiary/30 text-tertiary font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {articuloLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Pendientes & Historial */}
        <div className="lg:col-span-2 space-y-8">
          {/* Pedidos Pendientes */}
          <section className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-lg">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-background/30">
              <h3 className="font-headline-sm text-headline-sm text-white flex items-center gap-2">
                <AlertCircle size={18} className="text-primary" />
                Requisiciones Pendientes (PM)
              </h3>
              <span className="text-[10px] font-black text-outline uppercase tracking-widest">Cola de Procesamiento</span>
            </div>
            
            <div className="p-6">
              {pedidosPendientes.length === 0 ? (
                <div className="bg-background/20 border border-dashed border-outline-variant rounded-xl p-12 text-center text-outline italic text-sm">
                  No hay pedidos de material pendientes.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pedidosPendientes.map(pedido => (
                    <div key={pedido.id} className="bg-surface-container-high border border-outline-variant rounded-xl p-5 hover:border-primary/50 transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-20 transition-opacity">
                        <Layers size={48} className="text-primary" />
                      </div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-xs font-black text-primary uppercase tracking-tighter">PM-{pedido.id}</span>
                          <p className="text-[10px] text-outline font-bold mt-0.5">ORIGEN: OF-{pedido.of_id}</p>
                        </div>
                        <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase bg-primary/10 text-primary border border-primary/20">
                          {pedido.estado}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-[10px] text-outline font-medium">
                          <User size={12} className="opacity-50" />
                          <span className="truncate">Emisor: <b className="text-on-surface">{pedido.emisor}</b></span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-outline font-medium">
                          <Package size={12} className="opacity-50" />
                          <span className="truncate">Equipo: <b className="text-on-surface">{pedido.equipo}</b></span>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleProcesarCompra(pedido)}
                        className="w-full py-3 bg-surface-variant hover:bg-primary hover:text-on-primary border border-outline-variant text-on-surface rounded-lg font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 group-hover:shadow-lg group-hover:shadow-primary/20"
                      >
                        Procesar Compra
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Historial de Facturas */}
          <section className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-lg">
            <div className="px-6 py-4 border-b border-outline-variant bg-background/30 flex justify-between items-center">
              <h3 className="font-headline-sm text-headline-sm text-white flex items-center gap-2">
                <History size={18} className="text-secondary" />
                Historial de Órdenes (POs)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background/50 border-b border-outline-variant font-label-sm text-[10px] text-outline uppercase tracking-widest">
                    <th className="px-6 py-4 font-black">ID Doc</th>
                    <th className="px-6 py-4 font-black">PM Origen</th>
                    <th className="px-6 py-4 font-black">Proveedor</th>
                    <th className="px-6 py-4 font-black">Total</th>
                    <th className="px-6 py-4 font-black text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-xs divide-y divide-outline-variant/30">
                  {facturas.map(fac => (
                    <tr key={fac.id} className="hover:bg-surface-variant transition-colors group">
                      <td className="px-6 py-4 font-black text-on-surface">#{fac.id}</td>
                      <td className="px-6 py-4">
                        <span className="bg-background px-2 py-0.5 rounded-lg border border-outline-variant text-[9px] font-black text-primary">PM-{fac.pedido_material_id}</span>
                      </td>
                      <td className="px-6 py-4 text-outline font-medium">{fac.proveedor}</td>
                      <td className="px-6 py-4 font-black text-secondary text-sm">${parseFloat(fac.monto_total).toLocaleString()}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest">
                          {fac.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {facturas.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-12 text-center text-outline italic">No hay facturas registradas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Column: Processing Form */}
        <div className="space-y-6">
          <div id="compras-form" className="bg-surface-container border border-outline-variant rounded-xl p-6 shadow-2xl relative overflow-hidden flex flex-col h-full sticky top-24">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <CreditCard size={80} className="text-primary" />
            </div>

            <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-6 relative z-10">
              <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 text-primary">
                <ShoppingCart size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight leading-none">Procesar Orden</h3>
                <p className="text-[10px] text-outline font-bold uppercase tracking-widest mt-1">Checkout Administrativo</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 flex items-center gap-3 p-4 bg-error/10 border border-error/30 rounded-xl text-error text-xs animate-in slide-in-from-top-2">
                <X size={16} />
                {error}
              </div>
            )}
            {successMsg && (
              <div className="mb-6 flex items-center gap-3 p-4 bg-secondary/10 border border-secondary/30 rounded-xl text-secondary text-xs animate-in slide-in-from-top-2">
                <CheckCircle2 size={16} />
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmitFactura} className="flex-1 flex flex-col relative z-10">
              <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2 mb-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-2">
                    <Layers size={12} className="text-primary" />
                    ID PM Origen
                  </label>
                  <input 
                    type="number" 
                    value={selectedPedidoId}
                    onChange={e => setSelectedPedidoId(e.target.value)}
                    required
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3 text-xs text-on-surface focus:border-primary focus:outline-none transition-all"
                    placeholder="Ej: 1"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">Desglose de Ítems</label>
                    <button 
                      type="button" 
                      onClick={addMaterial}
                      className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors border border-primary/20"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {materiales.map((mat, index) => (
                      <div key={index} className="bg-background/40 border border-outline-variant rounded-xl p-4 space-y-3 relative group/item">
                        <button
                          type="button"
                          onClick={() => removeMaterial(index)}
                          className="absolute top-2 right-2 p-1 text-outline hover:text-error opacity-0 group-hover/item:opacity-100 transition-all"
                          disabled={materiales.length <= 1}
                        >
                          <X size={14} />
                        </button>

                        <div className="space-y-1.5">
                          <p className="text-[8px] font-black text-outline uppercase tracking-widest">Insumo / Material</p>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={mat.nombre}
                              onChange={e => handleInsumoQueryChange(index, e.target.value)}
                              onFocus={() => setMostrarSugerenciasInsumo(prev => ({ ...prev, [index]: true }))}
                              onBlur={() => setTimeout(() => setMostrarSugerenciasInsumo(prev => ({ ...prev, [index]: false })), 200)}
                              required
                              autoComplete="off"
                              placeholder="Nombre del insumo..."
                              className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 px-3 text-[10px] text-on-surface focus:border-primary focus:outline-none transition-all"
                            />
                            {mostrarSugerenciasInsumo[index] && insumosSugeridos[index]?.length > 0 && (
                              <div className="absolute left-0 right-0 top-full z-50 mt-1 bg-surface-container-high border border-primary/30 rounded-xl shadow-2xl max-h-32 overflow-y-auto custom-scrollbar">
                                {insumosSugeridos[index].map(ins => (
                                  <div 
                                    key={ins.id}
                                    className="px-3 py-2 text-[10px] text-outline hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors border-b border-outline-variant last:border-0"
                                    onMouseDown={(e) => { e.preventDefault(); selectInsumo(index, ins.nombre); }}
                                  >
                                    {ins.nombre}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-[8px] font-black text-outline uppercase tracking-widest">Proveedor</p>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={mat.proveedor}
                              onChange={e => handleProvQueryChange(index, e.target.value)}
                              onFocus={() => setMostrarSugerenciasProv(prev => ({ ...prev, [index]: true }))}
                              onBlur={() => setTimeout(() => setMostrarSugerenciasProv(prev => ({ ...prev, [index]: false })), 200)}
                              required
                              autoComplete="off"
                              placeholder="Proveedor..."
                              className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 px-3 text-[10px] text-on-surface focus:border-primary focus:outline-none transition-all"
                            />
                            {mostrarSugerenciasProv[index] && proveedoresSugeridos[index]?.length > 0 && (
                              <div className="absolute left-0 right-0 top-full z-50 mt-1 bg-surface-container-high border border-primary/30 rounded-xl shadow-2xl max-h-32 overflow-y-auto custom-scrollbar">
                                {proveedoresSugeridos[index].map(prov => (
                                  <div 
                                    key={prov.id}
                                    className="px-3 py-2 text-[10px] text-outline hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors border-b border-outline-variant last:border-0"
                                    onMouseDown={(e) => { e.preventDefault(); selectProveedor(index, prov.nombre); }}
                                  >
                                    {prov.nombre}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <p className="text-[8px] font-black text-outline uppercase tracking-widest text-center">Cant.</p>
                            <input 
                              type="number" 
                              step="any"
                              value={mat.cantidad}
                              onChange={e => handleMaterialChange(index, 'cantidad', e.target.value)}
                              required min="0.01"
                              className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 px-1 text-[10px] text-on-surface text-center focus:border-primary focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[8px] font-black text-outline uppercase tracking-widest text-center">Unidad</p>
                            <select
                              value={mat.unidad_medida}
                              onChange={e => handleMaterialChange(index, 'unidad_medida', e.target.value)}
                              className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 px-1 text-[9px] text-outline font-bold focus:border-primary focus:outline-none"
                            >
                              <option value="unidades">U.</option>
                              <option value="kilogramos">Kg</option>
                              <option value="metros">M.</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[8px] font-black text-outline uppercase tracking-widest text-center">P. Unit ($)</p>
                            <input 
                              type="number" 
                              step="any"
                              value={mat.precio_unitario}
                              onChange={e => handleMaterialChange(index, 'precio_unitario', e.target.value)}
                              required min="0"
                              className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 px-1 text-[10px] text-secondary font-bold text-center focus:border-primary focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

                {/* PDF de Factura */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-2">
                    <FileText size={12} className="text-primary" />
                    PDF de Factura
                  </label>
                  <label className={`flex items-center gap-3 w-full cursor-pointer border rounded-lg py-2.5 px-3 transition-all ${
                    pdfFile
                      ? 'border-secondary/40 bg-secondary/5 text-secondary'
                      : 'border-outline-variant bg-surface-container-low hover:border-primary/40 text-outline'
                  }`}>
                    <Upload size={14} className="shrink-0" />
                    <span className="text-[10px] font-medium truncate">
                      {pdfFile ? pdfFile.name : 'Seleccionar archivo PDF...'}
                    </span>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={e => setPdfFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

              <div className="pt-6 border-t border-outline-variant space-y-4">
                <div className="flex justify-between items-center px-2">
                  <span className="text-[10px] font-black text-outline uppercase tracking-widest">Total Orden de Compra</span>
                  <span className="text-xl font-black text-secondary tracking-tight">${totalOC.toLocaleString()}</span>
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-4 bg-primary hover:bg-primary-fixed-dim text-on-primary rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  Confirmar y Procesar
                </button>
              </div>
            </form>
          </div>

          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 shadow-lg">
            <h3 className="text-[10px] font-black text-outline uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Star size={12} className="text-secondary" />
              Proveedores Top
            </h3>
            <div className="space-y-4">
              <SupplierMini rating={9.8} name="Nexus Corp Logistics" color="bg-secondary" />
              <SupplierMini rating={9.4} name="Acme Industrials S.A." color="bg-primary" />
              <SupplierMini rating={8.9} name="Global Tech Supplies" color="bg-outline" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, color, trend }) {
  return (
    <div className="bg-surface-container-high border border-outline-variant rounded-xl p-5 flex flex-col justify-between hover:bg-surface-variant transition-all relative overflow-hidden group shadow-lg">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <span className={`material-symbols-outlined text-6xl ${color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      <div>
        <p className="text-outline font-black text-[9px] uppercase tracking-[0.2em] mb-2">{title}</p>
        <h3 className="font-headline-md text-headline-md text-white tracking-tight">{value}</h3>
      </div>
      <div className={`mt-4 flex items-center gap-1 font-black text-[9px] uppercase tracking-widest ${trend.includes('+') ? 'text-secondary' : 'text-outline'}`}>
        {trend.includes('+') && <TrendingUp size={12} />}
        {trend}
      </div>
    </div>
  )
}

function SupplierMini({ rating, name, color }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold text-on-surface truncate pr-2">{name}</span>
        <span className="text-[10px] font-black text-secondary flex items-center gap-1">
          <Star size={10} fill="currentColor" /> {rating}
        </span>
      </div>
      <div className="w-full bg-background/50 rounded-full h-1 border border-outline-variant overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all duration-1000`} style={{ width: `${rating * 10}%` }} />
      </div>
    </div>
  )
}
