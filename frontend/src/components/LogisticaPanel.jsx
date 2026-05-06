import { useState, useEffect } from 'react'
import {
  Truck,
  CheckCircle,
  Loader2,
  AlertTriangle,
  X,
  RefreshCw,
  Clock,
  Play,
  ShieldCheck,
  Package
} from 'lucide-react'

const API_BASE = '/api/v1'

const ESTADO_CONFIG = {
  pendiente: { label: 'Pendiente', color: 'text-outline', badge: 'bg-surface-variant text-outline border-outline-variant' },
  esperando_autorizacion: { label: 'Esperando Autorización', color: 'text-primary', badge: 'bg-primary/10 text-primary border-primary/20' },
  autorizado: { label: 'Autorizado', color: 'text-secondary', badge: 'bg-secondary/10 text-secondary border-secondary/20' },
  rechazado: { label: 'Rechazado', color: 'text-error', badge: 'bg-error/10 text-error border-error/20' },
  ejecutado: { label: 'Ejecutado', color: 'text-tertiary', badge: 'bg-tertiary/10 text-tertiary border-tertiary/20' },
}

export default function LogisticaPanel() {
  const [despachos, setDespachos] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [formData, setFormData] = useState({ lote_id: '', destino: '', transportista: '' })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  const fetchDespachos = async () => {
    setLoadingList(true)
    try {
      const res = await fetch(`${API_BASE}/logistica/despachos`)
      const json = await res.json()
      setDespachos(json.data || [])
    } catch {
      setDespachos([])
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    fetchDespachos()
  }, [])

  const handleAction = async (id, action) => {
    setActionLoading(`${action}-${id}`)
    setMessage(null)
    try {
      const res = await fetch(`${API_BASE}/logistica/despachos/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: json.message || 'Acción realizada con éxito.' })
        fetchDespachos()
      } else {
        setMessage({ type: 'error', text: json.detail || 'No se pudo realizar la acción.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red al conectar con el servidor.' })
    } finally {
      setActionLoading(null)
    }
  }

  const isFormValid =
    formData.lote_id !== '' &&
    formData.destino.trim() !== '' &&
    formData.transportista.trim() !== ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isFormValid) return
    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch(`${API_BASE}/logistica/despachos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lote_id: Number(formData.lote_id),
          destino: formData.destino,
          transportista: formData.transportista,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: json.message || 'Despacho creado con éxito.' })
        setFormData({ lote_id: '', destino: '', transportista: '' })
        fetchDespachos()
      } else {
        setMessage({ type: 'error', text: json.detail || 'Error al crear el despacho.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de red al conectar con el servidor.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-end justify-between mb-2">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Panel de Logística</h2>
          <p className="font-body-md text-body-md text-outline mt-1">Gestión de despachos y coordinación de envíos.</p>
        </div>
        <button
          onClick={fetchDespachos}
          className="flex items-center gap-2 text-[10px] font-black text-outline uppercase tracking-widest bg-surface-container border border-outline-variant px-4 py-2 rounded-lg hover:border-primary hover:text-primary transition-all"
        >
          <RefreshCw size={13} className={loadingList ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-lg">
          <div className="p-6 pb-4 border-b border-outline-variant flex items-center gap-3">
            <Truck size={18} className="text-primary" />
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Despachos</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background/50 border-b border-outline-variant">
                  <th className="p-4 text-[10px] font-black text-outline uppercase tracking-wider">ID</th>
                  <th className="p-4 text-[10px] font-black text-outline uppercase tracking-wider">OF</th>
                  <th className="p-4 text-[10px] font-black text-outline uppercase tracking-wider">Destino</th>
                  <th className="p-4 text-[10px] font-black text-outline uppercase tracking-wider">Transportista</th>
                  <th className="p-4 text-[10px] font-black text-outline uppercase tracking-wider text-center">Estado</th>
                  <th className="p-4 text-[10px] font-black text-outline uppercase tracking-wider text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {loadingList && (
                  <tr>
                    <td colSpan="6" className="p-10 text-center">
                      <Loader2 size={20} className="animate-spin text-primary mx-auto" />
                    </td>
                  </tr>
                )}
                {!loadingList && despachos.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-outline italic">No hay despachos registrados.</td>
                  </tr>
                )}
                {!loadingList && despachos.map((d) => {
                  const cfg = ESTADO_CONFIG[d.estado] || ESTADO_CONFIG.pendiente
                  const isSolicitando = actionLoading === `solicitar-autorizacion-${d.id}`
                  const isEjecutando = actionLoading === `ejecutar-${d.id}`

                  return (
                    <tr key={d.id} className="border-b border-outline-variant hover:bg-surface-variant transition-colors">
                      <td className="p-4 font-black text-outline text-[10px]">#{d.id}</td>
                      <td className="p-4 font-bold text-on-surface">OF-{d.of_id}</td>
                      <td className="p-4 text-on-surface">{d.destino}</td>
                      <td className="p-4 text-on-surface">{d.transportista}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {d.estado === 'ejecutado' && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black text-tertiary uppercase tracking-widest">
                            <CheckCircle size={12} />
                            Completado
                          </span>
                        )}
                        {d.estado === 'pendiente' && (
                          <button
                            onClick={() => handleAction(d.id, 'solicitar-autorizacion')}
                            disabled={isSolicitando}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                          >
                            {isSolicitando ? <Loader2 size={11} className="animate-spin" /> : <Clock size={11} />}
                            Solicitar Auth.
                          </button>
                        )}
                        {d.estado === 'autorizado' && (
                          <button
                            onClick={() => handleAction(d.id, 'ejecutar')}
                            disabled={isEjecutando}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/20 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                          >
                            {isEjecutando ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                            Ejecutar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-4">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Truck size={80} className="text-primary" />
            </div>

            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-6 flex items-center gap-2 relative z-10">
              <Package size={20} className="text-primary" />
              Nuevo Despacho
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">Lote ID</label>
                <input
                  type="number"
                  placeholder="ID del lote terminado..."
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-primary transition-all text-on-surface"
                  value={formData.lote_id}
                  onChange={(e) => setFormData({ ...formData, lote_id: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">Destino</label>
                <input
                  type="text"
                  placeholder="Dirección o descripción del destino..."
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-primary transition-all text-on-surface"
                  value={formData.destino}
                  onChange={(e) => setFormData({ ...formData, destino: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">Transportista</label>
                <input
                  type="text"
                  placeholder="Nombre del transportista..."
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-primary transition-all text-on-surface"
                  value={formData.transportista}
                  onChange={(e) => setFormData({ ...formData, transportista: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={!isFormValid || submitting}
                className="w-full py-3.5 bg-primary hover:bg-primary-fixed-dim text-on-primary font-bold text-xs rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
              >
                {submitting
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Truck size={16} />
                }
                CREAR DESPACHO
              </button>
            </form>
          </div>

          <div className="flex items-start gap-3 p-4 bg-surface-container-high border border-outline-variant rounded-xl">
            <ShieldCheck size={16} className="text-primary mt-0.5 shrink-0" />
            <p className="text-[10px] text-outline leading-relaxed">
              <span className="text-on-surface font-bold">Nota:</span> La autorización es aprobada por Administración. El despacho solo puede ejecutarse una vez autorizado.
            </p>
          </div>

          {message && (
            <div className={`flex items-start gap-3 p-4 rounded-xl border animate-in slide-in-from-top-2 duration-200 ${
              message.type === 'success'
                ? 'bg-secondary/10 border-secondary/30 text-secondary'
                : 'bg-error/10 border-error/30 text-error'
            }`}>
              {message.type === 'success'
                ? <CheckCircle size={16} className="mt-0.5 shrink-0" />
                : <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              }
              <p className="text-xs font-bold leading-snug flex-1">{message.text}</p>
              <button onClick={() => setMessage(null)} className="p-0.5 hover:bg-white/10 rounded transition-colors shrink-0">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
