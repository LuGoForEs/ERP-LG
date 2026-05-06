import { useState, useEffect } from 'react'
import { 
  PlusCircle, 
  History, 
  User, 
  Calendar, 
  DollarSign, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Clock, 
  FileText,
  ChevronRight,
  TrendingUp,
  Briefcase,
  Users,
  Target,
  Loader2
} from 'lucide-react'

const API_BASE = '/api/v1'

export default function ComercialPanel() {
  const [formData, setFormData] = useState({
    cliente: '',
    descripcion: '',
    plazo_valor: '',
    plazo_unidad: 'dias',
    anticipo_valor: '',
    anticipo_moneda: 'ARS',
    anticipo_descripcion: ''
  })

  const [ordenes, setOrdenes] = useState([])
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [message, setMessage] = useState(null)

  const fetchOrdenes = async () => {
    try {
      const res = await fetch(`${API_BASE}/comercial/ordenes-fabricacion`)
      const data = await res.json()
      setOrdenes(data.data || [])
    } catch (err) {
      console.error('Error fetching ordenes:', err)
    }
  }

  useEffect(() => {
    fetchOrdenes()
  }, [])

  const isFormValid = 
    formData.cliente.trim() !== '' &&
    formData.descripcion.trim() !== '' &&
    formData.plazo_valor !== '' &&
    formData.anticipo_valor !== '' &&
    (formData.anticipo_moneda !== 'definir' || formData.anticipo_descripcion.trim() !== '')

  const handleCreate = async () => {
    setLoading(true)
    setMessage(null)
    
    const payload = {
      cliente: formData.cliente,
      descripcion: formData.descripcion,
      plazo_entrega: `${formData.plazo_valor} ${formData.plazo_unidad}`,
      monto_anticipo: parseFloat(formData.anticipo_valor),
      moneda_anticipo: formData.anticipo_moneda,
      anticipo_descripcion: formData.anticipo_moneda === 'definir' ? formData.anticipo_descripcion : null
    }

    try {
      const res = await fetch(`${API_BASE}/comercial/ordenes-fabricacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const result = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: '¡Orden de Fabricación creada con éxito!' })
        setFormData({
          cliente: '',
          descripcion: '',
          plazo_valor: '',
          plazo_unidad: 'dias',
          anticipo_valor: '',
          anticipo_moneda: 'ARS',
          anticipo_descripcion: ''
        })
        fetchOrdenes()
      } else {
        setMessage({ type: 'error', text: result.detail || 'Error al crear la OF' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de red al conectar con el servidor' })
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-end mb-2">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Dashboard Comercial</h2>
          <p className="font-body-md text-body-md text-outline mt-1">Resumen de rendimiento de ventas y pipeline actual.</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat title="Facturación YTD" value="$4.2M" trend="+12%" icon="payments" color="text-primary" />
        <MiniStat title="Pipeline Activo" value={`${ordenes.length} OFs`} trend="Live" icon="group" color="text-secondary" />
        <MiniStat title="Margen Promedio" value="22%" trend="-1.2%" icon="percent" color="text-error" />
        <MiniStat title="Crecimiento" value="+8%" trend="Saludable" icon="trending_up" color="text-primary" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter">
        {/* Main Column: Funnel & Table */}
        <div className="xl:col-span-8 space-y-gutter">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
            

            {/* Recent Orders Table */}
            <div className="lg:col-span-2 bg-surface-container border border-outline-variant rounded-xl flex flex-col overflow-hidden shadow-lg">
              <div className="p-6 pb-4 border-b border-outline-variant flex justify-between items-center">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Órdenes de Fabricación</h3>
                <button className="text-primary hover:underline font-label-md text-label-md flex items-center gap-1">
                  Ver todas <ChevronRight size={14} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-background/50 border-b border-outline-variant">
                      <th className="p-4 font-label-md text-label-md text-outline font-semibold tracking-wider">Cliente / OF</th>
                      <th className="p-4 font-label-md text-label-md text-outline font-semibold tracking-wider text-right">Anticipo</th>
                      <th className="p-4 font-label-md text-label-md text-outline font-semibold tracking-wider text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-md text-body-md">
                    {ordenes.slice(0, 5).map(o => (
                      <tr key={o.id} className="border-b border-outline-variant hover:bg-surface-variant transition-colors group cursor-pointer">
                        <td className="p-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-lg bg-surface-variant border border-outline-variant flex items-center justify-center mr-3 text-outline font-bold text-[10px]">
                              {o.cliente.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-on-surface font-medium group-hover:text-primary transition-colors text-sm">{o.cliente}</div>
                              <div className="text-outline font-label-sm text-[10px] mt-0.5 uppercase tracking-tighter font-bold">OF-{o.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right text-on-surface font-bold text-sm">
                          {o.moneda_anticipo === 'definir' ? 'A definir' : `$${Number(o.monto_anticipo).toLocaleString()}`}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-[9px] font-black uppercase tracking-widest border ${
                            o.estado === 'aprobada' ? 'bg-secondary/10 text-secondary border-secondary/20' : 
                            o.estado === 'pendiente_anticipo' ? 'bg-primary/10 text-primary border-primary/20' : 
                            'bg-surface-bright text-outline border-outline-variant'
                          }`}>
                            {o.estado.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {ordenes.length === 0 && (
                      <tr>
                        <td colSpan="3" className="p-8 text-center text-outline italic text-sm">No hay órdenes registradas</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: New OF Form */}
        <div className="xl:col-span-4 space-y-gutter">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <PlusCircle size={80} className="text-primary" />
            </div>
            
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-6 flex items-center gap-2">
              <PlusCircle size={20} className="text-primary" />
              Nueva Orden (OF)
            </h3>

            <div className="space-y-5 relative z-10">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em] flex items-center gap-2">
                  <User size={12} className="text-primary" />
                  Cliente
                </label>
                <input 
                  type="text" 
                  placeholder="Nombre del cliente..."
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-primary transition-all text-on-surface"
                  value={formData.cliente}
                  onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em] flex items-center gap-2">
                  <Calendar size={12} className="text-primary" />
                  Plazo de Entrega
                </label>
                <div className="flex">
                  <input 
                    type="number" 
                    placeholder="Cant."
                    className="w-20 bg-surface-container-low border border-outline-variant rounded-l-lg py-2.5 px-3 text-xs focus:outline-none focus:border-primary transition-all text-on-surface border-r-0"
                    value={formData.plazo_valor}
                    onChange={(e) => setFormData({...formData, plazo_valor: e.target.value})}
                  />
                  <select 
                    className="flex-1 bg-surface-container-low border border-outline-variant rounded-r-lg py-2.5 px-2 text-xs focus:outline-none focus:border-primary transition-all text-outline font-bold"
                    value={formData.plazo_unidad}
                    onChange={(e) => setFormData({...formData, plazo_unidad: e.target.value})}
                  >
                    <option value="dias">Días</option>
                    <option value="meses">Meses</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em] flex items-center gap-2">
                  <FileText size={12} className="text-primary" />
                  Descripción Técnica
                </label>
                <textarea 
                  rows={3}
                  placeholder="Detalle de fabricación..."
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-primary transition-all text-on-surface resize-none"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em] flex items-center gap-2">
                  <DollarSign size={12} className="text-primary" />
                  Anticipo
                </label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    placeholder="Monto..."
                    className="flex-1 bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-primary transition-all text-on-surface"
                    value={formData.anticipo_valor}
                    onChange={(e) => setFormData({...formData, anticipo_valor: e.target.value})}
                  />
                  <select 
                    className="w-24 bg-surface-container-low border border-outline-variant rounded-lg py-2.5 px-2 text-[10px] focus:outline-none focus:border-primary transition-all text-outline font-bold"
                    value={formData.anticipo_moneda}
                    onChange={(e) => setFormData({...formData, anticipo_moneda: e.target.value})}
                  >
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                    <option value="definir">OTRA</option>
                  </select>
                </div>
              </div>

              {formData.anticipo_moneda === 'definir' && (
                <input 
                  type="text" 
                  placeholder="Especifique moneda/forma..."
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 px-3 text-[10px] focus:outline-none focus:border-primary transition-all text-on-surface animate-in slide-in-from-top-1"
                  value={formData.anticipo_descripcion}
                  onChange={(e) => setFormData({...formData, anticipo_descripcion: e.target.value})}
                />
              )}

              <button 
                className="w-full mt-4 py-3.5 bg-primary hover:bg-primary-fixed-dim text-on-primary font-bold text-xs rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:grayscale"
                disabled={!isFormValid || loading}
                onClick={() => setShowConfirm(true)}
              >
                {loading ? <Loader2 size={16} className="animate-spin inline mr-2" /> : <Send size={16} className="inline mr-2" />}
                EMITIR ORDEN DE FABRICACIÓN
              </button>
            </div>
          </div>

          {/* Insights Panel */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 shadow-lg">
            <h3 className="text-[10px] font-black text-outline uppercase tracking-[0.2em] mb-4">Insights Comerciales</h3>
            <div className="space-y-4">
              <InsightItem icon="lightbulb" text="3 cotizaciones expiran pronto." type="secondary" />
              <InsightItem icon="warning" text="Ciclo de venta aumentó 5 días." type="error" />
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-high border border-outline-variant rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-secondary/10 rounded-2xl border border-secondary/20 text-secondary">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Validar Datos</h3>
                <p className="text-xs text-outline">Confirmar emisión de OF comercial</p>
              </div>
            </div>
            
            <div className="bg-background/50 border border-outline-variant rounded-2xl p-4 mb-8 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-outline">Cliente:</span>
                <span className="text-on-surface font-bold">{formData.cliente}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-outline">Anticipo:</span>
                <span className="text-primary font-bold">
                  {formData.anticipo_moneda === 'definir' ? formData.anticipo_descripcion : `${formData.anticipo_moneda} ${Number(formData.anticipo_valor).toLocaleString()}`}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                className="flex-1 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-outline hover:bg-surface-variant transition-all"
                onClick={() => setShowConfirm(false)}
              >
                Volver
              </button>
              <button 
                className="flex-1 py-3 bg-secondary hover:bg-secondary-fixed text-on-secondary rounded-xl text-xs font-bold shadow-lg shadow-secondary/20 transition-all"
                onClick={handleCreate}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {message && (
        <div className={`fixed bottom-8 right-8 z-[100] flex items-center gap-4 p-5 rounded-2xl border shadow-2xl animate-in slide-in-from-right-8 duration-300 ${
          message.type === 'success' ? 'bg-secondary/20 border-secondary text-secondary-fixed' : 'bg-error/20 border-error text-error'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <p className="text-xs font-bold">{message.text}</p>
          <button onClick={() => setMessage(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

function MiniStat({ title, value, trend, icon, color }) {
  return (
    <div className="bg-surface-container-high border border-outline-variant rounded-xl p-5 hover:bg-surface-variant transition-all group shadow-md">
      <div className="flex justify-between items-start mb-4">
        <span className={`material-symbols-outlined ${color} group-hover:scale-110 transition-transform`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        <span className={`font-label-sm text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${
          trend.includes('+') ? 'bg-secondary/10 text-secondary' : 
          trend.includes('-') ? 'bg-error/10 text-error' : 
          'bg-primary/10 text-primary'
        }`}>
          {trend}
        </span>
      </div>
      <h3 className="font-label-md text-[10px] text-outline mb-1 uppercase tracking-widest">{title}</h3>
      <p className="font-headline-md text-headline-md text-on-surface">{value}</p>
    </div>
  )
}

function FunnelStep({ label, value, width, opacity, textColor, isBottom }) {
  return (
    <div className={`w-full flex justify-center items-center group cursor-pointer relative`}>
      <div className={`${width} h-14 ${opacity} border border-outline/20 flex flex-col items-center justify-center transition-all group-hover:bg-opacity-80 backdrop-blur-sm z-10 ${isBottom ? 'rounded-b-lg' : 'rounded-t-none'} ${label === 'Leads' ? 'rounded-t-lg' : ''}`}>
        <span className={`font-label-md text-[10px] font-black uppercase tracking-widest ${textColor}`}>{label} ({value})</span>
      </div>
    </div>
  )
}

function InsightItem({ icon, text, type }) {
  const color = type === 'secondary' ? 'text-secondary' : 'text-error';
  return (
    <div className="flex gap-3">
      <span className={`material-symbols-outlined ${color} text-[18px]`}>{icon}</span>
      <p className="font-body-md text-xs text-on-surface leading-snug">{text}</p>
    </div>
  )
}
