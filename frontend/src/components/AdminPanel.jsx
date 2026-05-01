import { useState, useEffect, useCallback } from 'react'
import { 
  CheckCircle2, 
  XCircle, 
  FileText, 
  AlertCircle, 
  Loader2, 
  Search, 
  Filter, 
  ArrowRight,
  ShieldCheck,
  History,
  Info,
  ExternalLink,
  ChevronRight,
  Upload
} from 'lucide-react'

const API_BASE = '/api/v1'

const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
  validado: { label: 'Validado', color: 'text-secondary', bg: 'bg-secondary/10 border-secondary/20' },
  rechazado: { label: 'Rechazado', color: 'text-error', bg: 'bg-error/10 border-error/20' },
}

export default function AdminPanel() {
  const [ordenes, setOrdenes] = useState([])
  const [selected, setSelected] = useState(null)
  const [pagado, setPagado] = useState(false)
  const [observacion, setObservacion] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchOrdenes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/administracion/ordenes`)
      const json = await res.json()
      setOrdenes(json.data || [])
    } catch {
      setOrdenes([])
    }
  }, [])

  useEffect(() => {
    fetchOrdenes()
  }, [fetchOrdenes])

  const handleSelect = (orden) => {
    setSelected(orden)
    setPagado(orden.anticipo?.pagado || false)
    setObservacion(orden.anticipo?.observacion || '')
    setArchivo(null)
    setResultado(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selected?.anticipo) return

    setSubmitting(true)
    setResultado(null)

    const formData = new FormData()
    formData.append('pagado', pagado)
    formData.append('observacion', observacion)
    if (archivo) formData.append('factura', archivo)

    try {
      const res = await fetch(
        `${API_BASE}/administracion/anticipos/${selected.anticipo.id}/validar`,
        { method: 'PUT', body: formData }
      )
      const json = await res.json()
      setResultado({ status: res.status, data: json })
      if (res.ok) await fetchOrdenes()
    } catch (err) {
      setResultado({ status: 'error', data: { error: err.message } })
    } finally {
      setSubmitting(false)
    }
  }

  const filteredOrdenes = ordenes.filter(o => 
    o.cliente.toLowerCase().includes(searchTerm.toLowerCase()) || 
    `OF-${o.id}`.includes(searchTerm)
  )

  const pendientes = filteredOrdenes.filter((o) => o.anticipo?.estado === 'pendiente')
  const procesadas = filteredOrdenes.filter((o) => o.anticipo?.estado !== 'pendiente')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full animate-in fade-in duration-500">
      {/* Sidebar List */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por cliente o OF..." 
            className="w-full bg-surface-container border border-outline-variant rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-primary transition-all text-on-surface"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar max-h-[calc(100vh-250px)]">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-outline uppercase tracking-[0.2em] flex items-center gap-2 px-2">
              <AlertCircle size={12} className="text-primary" />
              Pendientes de Validación ({pendientes.length})
            </h3>
            
            {pendientes.length === 0 && (
              <div className="bg-surface-container/30 border border-dashed border-outline-variant rounded-2xl p-8 text-center text-outline italic text-xs">
                Sin órdenes pendientes
              </div>
            )}
            
            <div className="space-y-3">
              {pendientes.map((o) => (
                <AdminOFCard 
                  key={o.id} 
                  orden={o} 
                  selected={selected?.id === o.id} 
                  onClick={() => handleSelect(o)} 
                />
              ))}
            </div>
          </div>

          {procesadas.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-outline uppercase tracking-[0.2em] flex items-center gap-2 px-2">
                <ShieldCheck size={12} className="text-secondary" />
                Historial de Procesadas
              </h3>
              <div className="space-y-3 opacity-60 hover:opacity-100 transition-opacity">
                {procesadas.map((o) => (
                  <AdminOFCard 
                    key={o.id} 
                    orden={o} 
                    selected={selected?.id === o.id} 
                    onClick={() => handleSelect(o)} 
                    processed 
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Detail View */}
      <div className="lg:col-span-8 bg-surface-container border border-outline-variant rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <ShieldCheck size={120} className="text-primary" />
        </div>

        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-outline gap-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="p-5 bg-surface-variant rounded-2xl border border-outline-variant shadow-inner">
              <FileText size={40} className="opacity-20 text-primary" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest">Seleccioná una OF para validar</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-outline-variant relative z-10">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-black text-white tracking-tight">OF-{selected.id}</h2>
                  <span className={`px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${STATUS_CONFIG[selected.anticipo?.estado]?.bg || 'bg-surface-variant border-outline-variant text-outline'}`}>
                    {STATUS_CONFIG[selected.anticipo?.estado]?.label || selected.estado.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-outline text-xs font-medium uppercase tracking-wider">{selected.cliente}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-outline uppercase font-black tracking-widest mb-1">Total Anticipo</p>
                <p className="text-2xl font-black text-primary">${Number(selected.anticipo?.monto_estimado || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative z-10">
              <AdminDetailItem label="Descripción del Trabajo" value={selected.descripcion} icon={<Info size={14} />} />
              <AdminDetailItem label="Plazo de Entrega Pactado" value={selected.plazo_entrega} icon={<History size={14} />} />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {selected.anticipo?.estado === 'pendiente' ? (
                <form onSubmit={handleSubmit} className="bg-background/40 border border-outline-variant rounded-2xl p-6 shadow-inner relative z-10 space-y-6">
                  <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <Filter size={14} className="text-primary" />
                    Validación Administrativa
                  </h4>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-surface-container rounded-xl border border-outline-variant hover:border-outline/30 transition-all group">
                      <div>
                        <p className="text-sm font-bold text-on-surface">Confirmación de Pago</p>
                        <p className="text-[10px] text-outline font-medium">¿Se recibió el anticipo correctamente?</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPagado(!pagado)}
                        className={`relative w-12 h-6 rounded-full transition-all duration-300 ${pagado ? 'bg-secondary shadow-[0_0_10px_rgba(108,216,204,0.3)]' : 'bg-surface-variant border border-outline-variant'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${pagado ? 'left-7' : 'left-1 shadow-sm'}`} />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-2">
                        <Upload size={12} className="text-primary" />
                        Comprobante de Transferencia / Factura
                      </label>
                      <div className="relative group">
                        <input
                          type="file"
                          id="file-upload"
                          className="hidden"
                          onChange={(e) => setArchivo(e.target.files[0] || null)}
                        />
                        <label 
                          htmlFor="file-upload"
                          className="flex items-center gap-4 w-full bg-surface-container border-2 border-dashed border-outline-variant rounded-xl p-5 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
                        >
                          <div className="p-3 bg-background rounded-xl group-hover:text-primary transition-colors">
                            <FileText size={20} />
                          </div>
                          <div className="flex-1">
                            <span className="block text-xs font-bold text-on-surface group-hover:text-primary transition-colors">
                              {archivo ? archivo.name : 'Haz clic para subir un archivo'}
                            </span>
                            <span className="text-[10px] text-outline">PDF, JPG o PNG (Max 5MB)</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-2">
                        <FileText size={12} className="text-primary" />
                        Observaciones Internas
                      </label>
                      <textarea
                        rows={3}
                        className="w-full bg-surface-container border border-outline-variant rounded-xl p-4 text-xs focus:outline-none focus:border-primary transition-all text-on-surface resize-none shadow-inner"
                        placeholder="Notas para el equipo comercial sobre esta validación..."
                        value={observacion}
                        onChange={(e) => setObservacion(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg transition-all active:scale-[0.98] ${
                        pagado 
                          ? 'bg-secondary hover:bg-secondary-fixed text-on-secondary shadow-secondary/10' 
                          : 'bg-error hover:bg-error-container text-white shadow-error/10'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {submitting ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : pagado ? (
                        <>
                          <CheckCircle2 size={18} />
                          Aprobar y Liberar para Desarrollo
                        </>
                      ) : (
                        <>
                          <XCircle size={18} />
                          Rechazar y Notificar a Comercial
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-surface-container-high/40 border border-outline-variant rounded-2xl p-8 text-center relative z-10">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${selected.anticipo?.estado === 'validado' ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'}`}>
                    {selected.anticipo?.estado === 'validado' ? <ShieldCheck size={32} /> : <XCircle size={32} />}
                  </div>
                  <h4 className={`text-lg font-black uppercase tracking-tight mb-2 ${selected.anticipo?.estado === 'validado' ? 'text-secondary' : 'text-error'}`}>
                    OF {selected.anticipo?.estado === 'validado' ? 'Aprobada' : 'Rechazada'}
                  </h4>
                  <p className="text-xs text-outline mb-8">Esta orden ya ha sido procesada administrativamente.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    {selected.anticipo?.factura_archivo && (
                      <div className="bg-background/40 p-4 rounded-xl border border-outline-variant">
                        <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-1">Comprobante</p>
                        <div className="flex items-center gap-2 text-xs text-primary font-bold hover:underline cursor-pointer">
                          <FileText size={14} /> {selected.anticipo.factura_archivo.nombre}
                        </div>
                      </div>
                    )}
                    <div className="bg-background/40 p-4 rounded-xl border border-outline-variant col-span-full">
                      <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-1">Observación del Administrador</p>
                      <p className="text-xs text-on-surface leading-relaxed italic">"{selected.anticipo?.observacion || 'Sin observaciones.'}"</p>
                    </div>
                  </div>
                </div>
              )}

              {resultado && (
                <div className="mt-8 bg-black/60 border border-outline-variant rounded-xl p-4 animate-in slide-in-from-top-2">
                  <p className={`text-[10px] font-black mb-2 flex items-center gap-2 ${resultado.status < 300 ? 'text-secondary' : 'text-error'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                    LOG DE RESPUESTA [HTTP {resultado.status}]
                  </p>
                  <pre className="text-[10px] text-primary/80 overflow-x-auto whitespace-pre-wrap font-mono">
                    {JSON.stringify(resultado.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AdminOFCard({ orden, selected, onClick, processed }) {
  const status = STATUS_CONFIG[orden.anticipo?.estado] || { color: 'text-outline', bg: 'bg-surface-variant border-outline-variant' };

  return (
    <div
      onClick={onClick}
      className={`group p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
        selected 
          ? 'bg-primary/10 border-primary shadow-lg shadow-primary/5 translate-x-1' 
          : 'bg-surface-container border-outline-variant hover:border-primary/50 hover:bg-surface-variant'
      } ${processed ? 'opacity-50 hover:opacity-80' : ''}`}
    >
      <div className="flex justify-between items-start mb-3">
        <span className={`text-sm font-black tracking-tight ${selected ? 'text-primary' : 'text-white'}`}>
          OF-{orden.id}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${status.bg} ${status.color}`}>
          {status.label}
        </span>
      </div>
      <p className={`text-xs font-bold mb-4 truncate ${selected ? 'text-on-surface' : 'text-outline'}`}>
        {orden.cliente}
      </p>
      <div className="flex justify-between items-center mt-auto pt-3 border-t border-outline-variant/30">
        <div className="flex flex-col">
          <span className="text-[9px] text-outline uppercase font-black tracking-tighter">Monto Anticipo</span>
          <span className={`text-sm font-black ${selected ? 'text-primary' : 'text-on-surface'}`}>
            ${Number(orden.anticipo?.monto_estimado || 0).toLocaleString()}
          </span>
        </div>
        {!processed && <ChevronRight size={14} className={`transition-all duration-300 ${selected ? 'translate-x-0 text-primary' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 text-outline'}`} />}
      </div>
    </div>
  )
}

function AdminDetailItem({ label, value, icon }) {
  return (
    <div className="bg-background/20 p-4 rounded-xl border border-outline-variant group hover:border-outline/30 transition-colors">
      <p className="text-[10px] text-outline uppercase font-black tracking-widest mb-2 flex items-center gap-2">
        {icon}
        {label}
      </p>
      <p className="text-xs text-on-surface leading-relaxed font-medium">{value || '-'}</p>
    </div>
  )
}
