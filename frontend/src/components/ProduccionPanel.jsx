import { useState, useEffect } from 'react'
import {
  Factory,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Package,
  RefreshCw,
  X,
  ClipboardList
} from 'lucide-react'

const API_BASE = '/api/v1'

const ESTADO_BADGE = {
  terminado: 'bg-secondary/10 text-secondary border-secondary/20',
  en_despacho: 'bg-tertiary/10 text-tertiary border-tertiary/20',
}

export default function ProduccionPanel() {
  const [lotes, setLotes] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [formData, setFormData] = useState({ of_id: '', descripcion: '' })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  const fetchLotes = async () => {
    setLoadingList(true)
    try {
      const res = await fetch(`${API_BASE}/produccion/lotes-terminados`)
      const json = await res.json()
      setLotes(json.data || [])
    } catch {
      setLotes([])
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    fetchLotes()
  }, [])

  const isFormValid = formData.of_id !== '' && formData.descripcion.trim() !== ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isFormValid) return
    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch(`${API_BASE}/produccion/lotes-terminados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          of_id: Number(formData.of_id),
          descripcion: formData.descripcion,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: json.message || 'Lote finalizado con éxito.' })
        setFormData({ of_id: '', descripcion: '' })
        fetchLotes()
      } else {
        setMessage({ type: 'error', text: json.detail || 'Error al finalizar el lote.' })
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
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Panel de Producción</h2>
          <p className="font-body-md text-body-md text-outline mt-1">Gestión de lotes terminados y cierre de órdenes de fabricación.</p>
        </div>
        <button
          onClick={fetchLotes}
          className="flex items-center gap-2 text-[10px] font-black text-outline uppercase tracking-widest bg-surface-container border border-outline-variant px-4 py-2 rounded-lg hover:border-primary hover:text-primary transition-all"
        >
          <RefreshCw size={13} className={loadingList ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-lg">
          <div className="p-6 pb-4 border-b border-outline-variant flex items-center gap-3">
            <ClipboardList size={18} className="text-primary" />
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Lotes Terminados</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background/50 border-b border-outline-variant">
                  <th className="p-4 text-[10px] font-black text-outline uppercase tracking-wider">ID</th>
                  <th className="p-4 text-[10px] font-black text-outline uppercase tracking-wider">OF</th>
                  <th className="p-4 text-[10px] font-black text-outline uppercase tracking-wider">Descripción</th>
                  <th className="p-4 text-[10px] font-black text-outline uppercase tracking-wider text-center">Estado</th>
                  <th className="p-4 text-[10px] font-black text-outline uppercase tracking-wider text-center">Planos</th>
                  <th className="p-4 text-[10px] font-black text-outline uppercase tracking-wider text-center">Movimientos</th>
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
                {!loadingList && lotes.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-outline italic">No hay lotes registrados.</td>
                  </tr>
                )}
                {!loadingList && lotes.map((lote) => (
                  <tr key={lote.id} className="border-b border-outline-variant hover:bg-surface-variant transition-colors">
                    <td className="p-4 font-black text-outline text-[10px]">#{lote.id}</td>
                    <td className="p-4 font-bold text-on-surface">OF-{lote.of_id}</td>
                    <td className="p-4 text-on-surface">{lote.descripcion}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${ESTADO_BADGE[lote.estado] || 'bg-surface-variant text-outline border-outline-variant'}`}>
                        {lote.estado?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 text-primary font-bold">
                        <Package size={12} />
                        {lote.planos_asociados?.length ?? 0}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 text-secondary font-bold">
                        <CheckCircle size={12} />
                        {lote.movimientos_asociados?.length ?? 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-4">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Factory size={80} className="text-primary" />
            </div>

            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-6 flex items-center gap-2 relative z-10">
              <Factory size={20} className="text-primary" />
              Finalizar Lote
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">
                  OF ID
                </label>
                <input
                  type="number"
                  placeholder="Número de OF..."
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-primary transition-all text-on-surface"
                  value={formData.of_id}
                  onChange={(e) => setFormData({ ...formData, of_id: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  placeholder="Descripción del lote terminado..."
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-primary transition-all text-on-surface resize-none"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={!isFormValid || submitting}
                className="w-full py-3.5 bg-primary hover:bg-primary-fixed-dim text-on-primary font-bold text-xs rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
              >
                {submitting
                  ? <Loader2 size={16} className="animate-spin" />
                  : <CheckCircle size={16} />
                }
                FINALIZAR LOTE
              </button>
            </form>
          </div>

          {message && (
            <div className={`mt-4 flex items-start gap-3 p-4 rounded-xl border animate-in slide-in-from-top-2 duration-200 ${
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
