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
  ArrowRight
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

  useEffect(() => {
    fetchPedidosPendientes();
    fetchFacturas();
  }, []);

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
      const payload = {
        pedido_material_id: parseInt(selectedPedidoId),
        materiales: materiales.map(m => ({
          nombre: m.nombre,
          cantidad: parseFloat(m.cantidad),
          unidad_medida: m.unidad_medida,
          precio_unitario: parseFloat(m.precio_unitario),
          proveedor: m.proveedor || 'S/D' // fallback if empty
        }))
      };

      const res = await fetch(`${API_BASE}/compras/facturas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.detail || 'Error al registrar factura');

      setSuccessMsg('Pedido de Material (PM) registrado correctamente');
      
      setSelectedPedidoId('');
      setMateriales([{ nombre: '', proveedor: '', unidad_medida: 'unidades', cantidad: 1, precio_unitario: 0 }]);
      
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
