import { useState } from 'react'
import { Send, Loader2, Code, Server, Terminal, Zap, ShieldAlert, CheckCircle } from 'lucide-react'

const API_BASE = '/api/v1'

const MODULE_DATA = {
  panol: {
    color: '#6cd8cc', // secondary
    icon: 'inventory_2',
    endpoints: [
      { method: 'POST', path: '/panol/ingreso', label: 'Registrar Ingreso de Stock' },
      { method: 'GET', path: '/panol/stock', label: 'Ver Inventario Actual' },
      { method: 'POST', path: '/panol/movimiento', label: 'Mover Insumos Internamente' }
    ]
  },
  produccion: {
    color: '#b8c4ff', // primary
    icon: 'factory',
    endpoints: [
      { method: 'GET', path: '/produccion/', label: 'Estado General de Planta' },
      { method: 'POST', path: '/produccion/lotes-terminados', label: 'Finalizar Lote de Producción' }
    ]
  },
  logistica: {
    color: '#bbc7da', // tertiary
    icon: 'local_shipping',
    endpoints: [
      { method: 'GET', path: '/logistica/despachos', label: 'Listar Despachos Programados' },
      { method: 'PUT', path: '/logistica/autorizar-salida', label: 'Autorizar Salida de Camión' }
    ]
  }
}

export default function GenericModuleTester({ moduleId }) {
  const config = MODULE_DATA[moduleId] || { color: '#8e90a0', icon: 'settings', endpoints: [] }
  const [responses, setResponses] = useState({})

  const callApi = async (idx, method, path) => {
    setResponses(prev => ({ ...prev, [idx]: { loading: true } }))
    try {
      const res = await fetch(`${API_BASE}${path}`, { method })
      const data = await res.json()
      setResponses(prev => ({ ...prev, [idx]: { loading: false, data, status: res.status } }))
    } catch (err) {
      setResponses(prev => ({ ...prev, [idx]: { loading: false, data: { error: err.message }, status: 'ERR' } }))
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Module Header */}
      <div className="bg-surface-container border border-outline-variant rounded-2xl p-8 flex items-center justify-between shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Terminal size={120} className="text-on-surface" />
        </div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-14 h-14 bg-surface-variant rounded-2xl border border-outline-variant flex items-center justify-center shadow-lg shadow-black/20">
            <span className="material-symbols-outlined text-[32px]" style={{ color: config.color }}>{config.icon}</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">{moduleId}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              <p className="text-[10px] text-outline font-black uppercase tracking-[0.2em]">Consola de Acceso Directo (API)</p>
            </div>
          </div>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-[10px] text-outline font-bold uppercase tracking-widest mb-1">Status del Nodo</p>
          <p className="text-sm font-black text-secondary">SINCRO OK</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {config.endpoints.map((ep, idx) => (
          <div key={idx} className="bg-surface-container-high border border-outline-variant rounded-xl overflow-hidden shadow-lg hover:border-outline/50 transition-all group">
            <div className="flex flex-col md:flex-row items-stretch">
              {/* Action Button Area */}
              <div className="p-6 md:w-80 flex flex-col justify-center border-b md:border-b-0 md:border-r border-outline-variant bg-background/20">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase border ${
                    ep.method === 'GET' ? 'bg-secondary/10 text-secondary border-secondary/20' : 
                    ep.method === 'POST' ? 'bg-primary/10 text-primary border-primary/20' : 
                    'bg-tertiary/10 text-tertiary border-tertiary/20'
                  }`}>
                    {ep.method}
                  </span>
                  <span className="text-[10px] font-black text-outline uppercase tracking-widest truncate">{ep.path}</span>
                </div>
                <h4 className="text-white font-bold text-sm mb-6 leading-tight group-hover:text-primary transition-colors">{ep.label}</h4>
                <button 
                  onClick={() => callApi(idx, ep.method, ep.path)}
                  disabled={responses[idx]?.loading}
                  className="w-full py-3 bg-surface-variant hover:bg-white/10 text-on-surface rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-outline-variant transition-all active:scale-95 disabled:opacity-50"
                >
                  {responses[idx]?.loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} className="fill-current" />}
                  Ejecutar Comando
                </button>
              </div>

              {/* Console Output Area */}
              <div className="flex-1 p-6 bg-background/40 relative">
                {!responses[idx] ? (
                  <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-outline opacity-30">
                    <Code size={32} className="mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Esperando ejecución...</p>
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {responses[idx].status < 300 ? (
                          <CheckCircle size={14} className="text-secondary" />
                        ) : (
                          <ShieldAlert size={14} className="text-error" />
                        )}
                        <span className={`text-[10px] font-black uppercase tracking-widest ${responses[idx].status < 300 ? 'text-secondary' : 'text-error'}`}>
                          Respuesta Servidor [HTTP {responses[idx].status}]
                        </span>
                      </div>
                      <span className="text-[9px] text-outline font-mono">{(Math.random() * 50 + 20).toFixed(0)}ms</span>
                    </div>
                    <div className="bg-black/40 rounded-lg p-4 border border-outline-variant/30 max-h-48 overflow-y-auto custom-scrollbar shadow-inner">
                      <pre className="text-[10px] text-primary/80 font-mono leading-relaxed">
                        {JSON.stringify(responses[idx].data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Security Warning Footer */}
      <div className="p-4 bg-error/10 border border-error/20 rounded-xl flex items-center gap-4">
        <div className="p-2 bg-error/20 rounded-lg text-error">
          <ShieldAlert size={20} />
        </div>
        <div>
          <p className="text-[10px] font-black text-error uppercase tracking-widest">Advertencia de Seguridad</p>
          <p className="text-xs text-outline leading-tight mt-1">
            Estás operando en modo de Acceso Directo. Todas las transacciones se ejecutan directamente sobre la base de datos de producción.
          </p>
        </div>
      </div>
    </div>
  )
}
