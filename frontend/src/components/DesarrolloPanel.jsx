import { useState, useEffect, useCallback } from 'react'
import { 
  FileStack, 
  ClipboardList, 
  Wrench, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Upload, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Calendar,
  User,
  Package,
  ArrowRight,
  Loader2,
  Layers,
  Settings,
  Cpu,
  Send
} from 'lucide-react'

const API_BASE = '/api/v1'

const ESTADO_COLORS = {
  aprobada: 'text-secondary bg-secondary/10 border-secondary/20',
  generado: 'text-primary bg-primary/10 border-primary/20',
  facturado: 'text-tertiary bg-tertiary/10 border-tertiary/20',
  enviado: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
}

const EMPTY_ITEM = { cantidad: '', unidad: 'u', descripcion: '', uso_en: '', observaciones: '', oc_fecha: '' }

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function DesarrolloPanel() {
  const [ordenes, setOrdenes] = useState([])
  const [selected, setSelected] = useState(null)
  const [pedidos, setPedidos] = useState([])
  const [planos, setPlanos] = useState([])

  // PM form
  const [pmForm, setPmForm] = useState({ emisor: '', fecha: today(), plazo_entrega: '', equipo: '' })
  const [pmItems, setPmItems] = useState([{ ...EMPTY_ITEM }])

  // PP form
  const [planoForm, setPlanoForm] = useState({ descripcion: '' })
  const [planoArchivo, setPlanoArchivo] = useState(null)

  const [submitting, setSubmitting] = useState(null)
  const [resultado, setResultado] = useState(null)

  // Expanded PM detail
  const [expandedPm, setExpandedPm] = useState(null)

  const fetchOrdenes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/desarrollo/ordenes-disponibles`)
      const json = await res.json()
      setOrdenes(json.data || [])
    } catch {
      setOrdenes([])
    }
  }, [])

  const fetchPedidos = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/desarrollo/pedidos-material`)
      const json = await res.json()
      setPedidos(json.data || [])
    } catch {
      setPedidos([])
    }
  }, [])

  const fetchPlanos = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/desarrollo/planos`)
      const json = await res.json()
      setPlanos(json.data || [])
    } catch {
      setPlanos([])
    }
  }, [])

  useEffect(() => {
    fetchOrdenes()
    fetchPedidos()
    fetchPlanos()
  }, [fetchOrdenes, fetchPedidos, fetchPlanos])

  const handleSelect = (orden) => {
    setSelected(orden)
    setPmForm({ emisor: '', fecha: today(), plazo_entrega: '', equipo: '' })
    setPmItems([{ ...EMPTY_ITEM }])
    setPlanoForm({ descripcion: '' })
    setPlanoArchivo(null)
    setResultado(null)
    setExpandedPm(null)
  }

  // PM items table handlers
  const updateItem = (idx, field, value) => {
    setPmItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)))
  }

  const addRow = () => {
    setPmItems((prev) => [...prev, { ...EMPTY_ITEM }])
  }

  const removeRow = (idx) => {
    setPmItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))
  }

  const hasValidItems = pmItems.some((item) => item.cantidad && item.descripcion.trim())

  const handleCrearPedido = async (e) => {
    e.preventDefault()
    if (!selected || !hasValidItems) return
    setSubmitting('pedido')
    setResultado(null)

    const items = pmItems
      .filter((item) => item.cantidad && item.descripcion.trim())
      .map((item) => ({
        cantidad: parseFloat(item.cantidad),
        unidad: item.unidad,
        descripcion: item.descripcion,
        uso_en: item.uso_en,
        observaciones: item.observaciones,
        oc_fecha: item.oc_fecha,
      }))

    try {
      const res = await fetch(`${API_BASE}/desarrollo/pedidos-material`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          of_id: selected.id,
          emisor: pmForm.emisor,
          fecha: pmForm.fecha,
          plazo_entrega: pmForm.plazo_entrega,
          equipo: pmForm.equipo,
          items,
        }),
      })
      const json = await res.json()
      setResultado({ status: res.status, data: json })
      if (res.ok) {
        setPmForm({ emisor: '', fecha: today(), plazo_entrega: '', equipo: '' })
        setPmItems([{ ...EMPTY_ITEM }])
        await fetchPedidos()
      }
    } catch (err) {
      setResultado({ status: 'error', data: { error: err.message } })
    } finally {
      setSubmitting(null)
    }
  }

  const handleCrearPlano = async (e) => {
    e.preventDefault()
    if (!selected || !planoArchivo) return
    setSubmitting('plano')
    setResultado(null)

    const formData = new FormData()
    formData.append('of_id', selected.id)
    formData.append('descripcion', planoForm.descripcion)
    formData.append('archivo', planoArchivo)

    try {
      const res = await fetch(`${API_BASE}/desarrollo/planos`, {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      setResultado({ status: res.status, data: json })
      if (res.ok) {
        setPlanoForm({ descripcion: '' })
        setPlanoArchivo(null)
        await fetchPlanos()
      }
    } catch (err) {
      setResultado({ status: 'error', data: { error: err.message } })
    } finally {
      setSubmitting(null)
    }
  }

  const pedidosOf = selected ? pedidos.filter((p) => p.of_id === selected.id) : []
  const planosOf = selected ? planos.filter((p) => p.of_id === selected.id) : []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full animate-in fade-in duration-500">
      {/* Sidebar List */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        <h3 className="text-[10px] font-black text-outline uppercase tracking-[0.2em] flex items-center gap-2 px-2">
          <CheckCircle2 size={12} className="text-secondary" />
          OFs Aprobadas ({ordenes.length})
        </h3>
        
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar max-h-[calc(100vh-200px)]">
          {ordenes.length === 0 && (
            <div className="bg-surface-container/30 border border-dashed border-outline-variant rounded-2xl p-6 text-center text-outline text-[10px] leading-relaxed font-bold uppercase tracking-widest">
              No hay OFs aprobadas.
            </div>
          )}
          {ordenes.map((o) => (
            <div
              key={o.id}
              onClick={() => handleSelect(o)}
              className={`group p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                selected?.id === o.id 
                  ? 'bg-primary/10 border-primary shadow-lg shadow-primary/5 translate-x-1' 
                  : 'bg-surface-container border-outline-variant hover:border-primary/50 hover:bg-surface-variant'
              }`}
            >
              <div className="flex justify-between items-start mb-2 relative z-10">
                <span className={`text-xs font-black tracking-tight ${selected?.id === o.id ? 'text-primary' : 'text-white'}`}>
                  OF-{o.id}
                </span>
                <ArrowRight size={12} className={`transition-all duration-300 ${selected?.id === o.id ? 'translate-x-0 text-primary' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 text-outline'}`} />
              </div>
              <p className={`text-[10px] font-black mb-2 truncate uppercase ${selected?.id === o.id ? 'text-on-surface' : 'text-outline'}`}>
                {o.cliente}
              </p>
              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${selected?.id === o.id ? 'bg-white/10 text-white' : 'bg-background text-outline'}`}>
                ENTREGA: {o.plazo_entrega}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="lg:col-span-9 space-y-8">
        {!selected ? (
          <div className="bg-surface-container border border-outline-variant rounded-3xl p-12 h-full flex flex-col items-center justify-center text-outline gap-4 animate-in fade-in zoom-in-95 duration-300 min-h-[400px]">
            <div className="p-5 bg-background rounded-2xl border border-outline-variant shadow-inner">
              <Cpu size={40} className="opacity-20 text-primary" />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.2em]">Seleccioná una OF para ingeniería</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-8 pb-12">
            {/* OF Header Section */}
            <div className="bg-surface-container border border-outline-variant rounded-2xl p-6 flex items-center justify-between shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Settings size={100} className="text-primary animate-spin-slow" />
              </div>
              <div className="flex items-center gap-6 relative z-10">
                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center shadow-lg text-primary">
                  <Wrench size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                    INGENIERÍA OF-{selected.id}
                    <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest bg-secondary/10 text-secondary border border-secondary/20">Procesable</span>
                  </h2>
                  <p className="text-outline text-[10px] font-bold uppercase tracking-widest mt-1">{selected.cliente} &middot; {selected.descripcion}</p>
                </div>
              </div>
            </div>

            {/* PM Form */}
            <div className="bg-surface-container border border-outline-variant rounded-2xl p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-8 border-b border-outline-variant pb-6">
                <ClipboardList className="text-primary" size={18} />
                <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">Generar Pedido de Material (PM)</h4>
              </div>

              <form onSubmit={handleCrearPedido} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormInput label="Emisor" icon={<User size={12} />} value={pmForm.emisor} onChange={(v) => setPmForm({...pmForm, emisor: v})} placeholder="Nombre" />
                  <FormInput label="Emisión" icon={<Calendar size={12} />} type="date" value={pmForm.fecha} onChange={(v) => setPmForm({...pmForm, fecha: v})} />
                  <FormInput label="Entrega" icon={<Calendar size={12} />} type="date" value={pmForm.plazo_entrega} onChange={(v) => setPmForm({...pmForm, plazo_entrega: v})} />
                  <FormInput label="Equipo" icon={<Package size={12} />} value={pmForm.equipo} onChange={(v) => setPmForm({...pmForm, equipo: v})} placeholder="Ej: Tanque 5K" />
                </div>

                {/* Items Table */}
                <div className="overflow-hidden border border-outline-variant rounded-xl bg-background/20">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-background/50 text-outline uppercase tracking-widest font-black">
                      <tr>
                        <th className="px-4 py-3 w-10 text-center">#</th>
                        <th className="px-4 py-3 w-20 text-center">Cant.</th>
                        <th className="px-4 py-3 w-20 text-center">Unidad</th>
                        <th className="px-4 py-3 min-w-[200px]">Descripción Técnica</th>
                        <th className="px-4 py-3">Uso en</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {pmItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-surface-variant transition-colors group">
                          <td className="px-4 py-2 text-center font-black text-outline">{idx + 1}</td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              className="w-full bg-surface-container border border-outline-variant rounded py-1.5 px-2 text-on-surface focus:border-primary focus:outline-none text-center"
                              value={item.cantidad}
                              onChange={(e) => updateItem(idx, 'cantidad', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <select 
                              className="w-full bg-surface-container border border-outline-variant rounded py-1.5 px-2 text-outline font-black focus:border-primary focus:outline-none"
                              value={item.unidad}
                              onChange={(e) => updateItem(idx, 'unidad', e.target.value)}
                            >
                              <option value="u">U</option>
                              <option value="m">M</option>
                              <option value="kg">KG</option>
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              className="w-full bg-surface-container border border-outline-variant rounded py-1.5 px-3 text-on-surface focus:border-primary focus:outline-none"
                              value={item.descripcion}
                              onChange={(e) => updateItem(idx, 'descripcion', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              className="w-full bg-surface-container border border-outline-variant rounded py-1.5 px-3 text-on-surface focus:border-primary focus:outline-none"
                              value={item.uso_en}
                              onChange={(e) => updateItem(idx, 'uso_en', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => removeRow(idx)}
                              className="p-1.5 text-outline hover:text-error hover:bg-error/10 rounded transition-all opacity-0 group-hover:opacity-100"
                              disabled={pmItems.length <= 1}
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button 
                    type="button" 
                    onClick={addRow}
                    className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:text-white transition-colors bg-primary/10 px-4 py-2 rounded-lg border border-primary/20"
                  >
                    <Plus size={14} />
                    Agregar Ítem
                  </button>
                  <button
                    type="submit"
                    disabled={submitting === 'pedido' || !hasValidItems || !pmForm.emisor.trim()}
                    className="flex items-center gap-3 py-3.5 px-10 bg-primary hover:bg-primary-fixed-dim text-on-primary rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {submitting === 'pedido' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Finalizar Requisición PM
                  </button>
                </div>
              </form>
            </div>

            {/* PP Form Section */}
            <div className="bg-surface-container border border-outline-variant rounded-2xl p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-8 border-b border-outline-variant pb-6">
                <FileStack className="text-secondary" size={18} />
                <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">Cargar Plano de Producción (PP)</h4>
              </div>

              <form onSubmit={handleCrearPlano} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                <div className="md:col-span-6">
                  <FormInput label="Descripción del Plano" value={planoForm.descripcion} onChange={(v) => setPlanoForm({ descripcion: v })} placeholder="Ej: Plano de corte A-A" />
                </div>
                <div className="md:col-span-4 space-y-2">
                  <label className="text-[9px] font-black text-outline uppercase tracking-widest px-1">Documento PDF</label>
                  <label className="flex items-center gap-3 w-full bg-background/50 border-2 border-dashed border-outline-variant rounded-xl py-2.5 px-4 cursor-pointer hover:border-secondary hover:bg-secondary/5 transition-all">
                    <Upload size={14} className="text-outline" />
                    <span className="text-[10px] font-bold text-outline truncate">{planoArchivo ? planoArchivo.name : 'Vincular PDF'}</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => setPlanoArchivo(e.target.files[0] || null)}
                    />
                  </label>
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-secondary hover:bg-secondary-fixed text-on-secondary rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-secondary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                    disabled={submitting === 'plano' || !planoForm.descripcion.trim() || !planoArchivo}
                  >
                    {submitting === 'plano' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    ENVIAR
                  </button>
                </div>
              </form>
            </div>

            {/* List Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Existing PMs */}
              <section className="space-y-4">
                <h4 className="text-[10px] font-black text-outline uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                  <Layers size={12} className="text-primary" />
                  Archivo de Requisiciones ({pedidosOf.length})
                </h4>
                <div className="space-y-3">
                  {pedidosOf.map((p) => (
                    <div key={p.id} className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-md">
                      <div
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-surface-variant transition-colors"
                        onClick={() => setExpandedPm(expandedPm === p.id ? null : p.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-background rounded-lg flex items-center justify-center text-primary border border-outline-variant text-[10px] font-black">
                            PM
                          </div>
                          <div>
                            <p className="text-xs font-black text-on-surface">PM-{p.id}</p>
                            <p className="text-[8px] text-outline font-bold uppercase">{p.fecha} &middot; {p.emisor}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter border ${ESTADO_COLORS[p.estado] || 'text-outline border-outline-variant'}`}>
                            {p.estado}
                          </span>
                          {expandedPm === p.id ? <ChevronUp size={14} className="text-outline" /> : <ChevronDown size={14} className="text-outline" />}
                        </div>
                      </div>
                      {expandedPm === p.id && (
                        <div className="bg-background/40 border-t border-outline-variant p-4 animate-in slide-in-from-top-1">
                          <div className="space-y-2">
                            {p.items?.map((item, i) => (
                              <div key={i} className="flex items-center justify-between text-[10px] py-1 border-b border-outline-variant/20 last:border-0">
                                <span className="text-outline font-bold uppercase">{item.description || item.descripcion}</span>
                                <span className="text-primary font-black">{item.quantity || item.cantidad} {item.unit || item.unidad}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Existing PPs */}
              <section className="space-y-4">
                <h4 className="text-[10px] font-black text-outline uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                  <FileStack size={12} className="text-secondary" />
                  Archivo de Planos PP ({planosOf.length})
                </h4>
                <div className="space-y-3">
                  {planosOf.map((p) => (
                    <div key={p.id} className="bg-surface-container border border-outline-variant rounded-xl p-4 flex items-center justify-between group hover:border-secondary/50 transition-all shadow-md">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-error/10 rounded-lg flex items-center justify-center text-error border border-error/20 text-[8px] font-black uppercase">
                          PDF
                        </div>
                        <div>
                          <p className="text-xs font-black text-on-surface leading-none mb-1">PP-{p.id}</p>
                          <p className="text-[8px] text-outline font-bold uppercase truncate max-w-[150px]">{p.descripcion}</p>
                        </div>
                      </div>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter border ${ESTADO_COLORS[p.estado] || 'text-outline border-outline-variant'}`}>
                        {p.estado}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* API Result Log */}
            {resultado && (
              <div className="mt-8 bg-black/60 border border-outline-variant rounded-xl p-4 animate-in slide-in-from-top-2">
                <p className={`text-[10px] font-black mb-2 flex items-center gap-2 ${resultado.status < 300 ? 'text-secondary' : 'text-error'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                  SYSLOG: [HTTP {resultado.status}]
                </p>
                <pre className="text-[9px] text-primary/80 overflow-x-auto whitespace-pre-wrap font-mono">
                  {JSON.stringify(resultado.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function FormInput({ label, icon, value, onChange, type = "text", placeholder }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-outline uppercase tracking-widest px-1 flex items-center gap-2">
        {icon}
        {label}
      </label>
      <input
        type={type}
        className="w-full bg-background/50 border border-outline-variant rounded-lg py-2.5 px-3 text-xs text-on-surface focus:border-primary focus:outline-none transition-all shadow-inner"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}
