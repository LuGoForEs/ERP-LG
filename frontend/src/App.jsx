import { useState, useEffect } from 'react'
import AdminPanel from './components/AdminPanel.jsx'
import DesarrolloPanel from './components/DesarrolloPanel.jsx'
import ComercialPanel from './components/ComercialPanel.jsx'
import LetterGlitch from './components/LetterGlitch.jsx'

const API_BASE = '/api/v1'

const MODULES = [
  {
    id: 'comercial',
    name: 'Comercial',
    color: '#3b82f6',
    endpoints: [
      {
        method: 'POST',
        path: '/comercial/ordenes-fabricacion',
        label: 'Crear Orden de Fabricacion',
        fields: [
          { key: 'cliente', label: 'Cliente', placeholder: 'Ej: Aceros del Sur SA' },
          { key: 'descripcion', label: 'Descripcion', placeholder: 'Ej: Tanque acero inoxidable 5000L' },
          { key: 'plazo_entrega', label: 'Plazo de entrega', placeholder: 'Ej: 30 dias' },
          { key: 'monto_anticipo', label: 'Monto Anticipo', placeholder: 'Ej: 500000' },
        ],
      },
      {
        method: 'GET',
        path: '/comercial/ordenes-fabricacion',
        label: 'Listar Ordenes de Fabricacion',
        fields: [],
      },
      {
        method: 'GET',
        path: '/comercial/anticipos',
        label: 'Listar Anticipos',
        fields: [],
      },
    ],
  },
  {
    id: 'administracion',
    name: 'Administracion',
    color: '#8b5cf6',
    endpoints: [
      {
        method: 'GET',
        path: '/administracion/anticipos/pendientes',
        label: 'Ver Anticipos Pendientes',
        fields: [],
      },
      {
        method: 'PUT',
        path: '/administracion/anticipos/{anticipo_id}/validar',
        label: 'Validar Anticipo',
        pathParams: [{ key: 'anticipo_id', label: 'ID Anticipo', placeholder: 'Ej: 1' }],
        fields: [
          { key: 'factura_pago', label: 'Nro Factura de Pago', placeholder: 'Ej: FC-2024-001' },
          { key: 'pagado', label: 'Anticipo Pagado', type: 'toggle' },
        ],
      },
    ],
  },
  {
    id: 'desarrollo',
    name: 'Desarrollo',
    color: '#06b6d4',
    endpoints: [
      {
        method: 'POST',
        path: '/desarrollo/pedidos-material',
        label: 'Crear Pedido de Material',
        fields: [
          { key: 'of_id', label: 'ID de OF', placeholder: 'Ej: 1' },
          { key: 'materiales', label: 'Materiales', placeholder: 'Ej: Chapa AISI 304, Soldadura MIG' },
        ],
      },
      {
        method: 'GET',
        path: '/desarrollo/pedidos-material',
        label: 'Listar Pedidos de Material',
        fields: [],
      },
      {
        method: 'POST',
        path: '/desarrollo/planos',
        label: 'Enviar Plano a Produccion',
        fields: [
          { key: 'of_id', label: 'ID de OF', placeholder: 'Ej: 1' },
          { key: 'descripcion', label: 'Descripcion', placeholder: 'Ej: Plano tanque 5000L rev.2' },
        ],
      },
      {
        method: 'GET',
        path: '/desarrollo/planos',
        label: 'Listar Planos',
        fields: [],
      },
    ],
  },
  {
    id: 'compras',
    name: 'Compras',
    color: '#f59e0b',
    endpoints: [
      {
        method: 'POST',
        path: '/compras/facturas',
        label: 'Registrar Factura',
        fields: [
          { key: 'proveedor', label: 'Proveedor', placeholder: 'Ej: Metalurgica Norte SRL' },
          { key: 'monto', label: 'Monto', placeholder: 'Ej: 150000' },
          { key: 'descripcion', label: 'Descripcion', placeholder: 'Ej: Compra de chapa' },
        ],
      },
      {
        method: 'GET',
        path: '/compras/facturas',
        label: 'Listar Facturas',
        fields: [],
      },
    ],
  },
  {
    id: 'panol',
    name: 'Panol',
    color: '#10b981',
    endpoints: [
      {
        method: 'POST',
        path: '/panol/ingresos',
        label: 'Registrar Ingreso',
        fields: [
          { key: 'material', label: 'Material', placeholder: 'Ej: Chapa AISI 304' },
          { key: 'cantidad', label: 'Cantidad', placeholder: 'Ej: 50' },
          { key: 'factura_id', label: 'ID Factura', placeholder: 'Ej: 1' },
        ],
      },
      {
        method: 'GET',
        path: '/panol/ingresos',
        label: 'Listar Ingresos',
        fields: [],
      },
      {
        method: 'POST',
        path: '/panol/movimientos/produccion',
        label: 'Despachar Material a Produccion',
        fields: [
          { key: 'material', label: 'Material', placeholder: 'Ej: Chapa AISI 304' },
          { key: 'cantidad', label: 'Cantidad', placeholder: 'Ej: 20' },
          { key: 'destino', label: 'Destino', placeholder: 'Ej: Linea 1' },
        ],
      },
      {
        method: 'GET',
        path: '/panol/movimientos',
        label: 'Listar Movimientos',
        fields: [],
      },
    ],
  },
  {
    id: 'produccion',
    name: 'Produccion',
    color: '#ef4444',
    endpoints: [
      {
        method: 'POST',
        path: '/produccion/lotes-terminados',
        label: 'Finalizar Lote',
        fields: [
          { key: 'of_id', label: 'ID de OF', placeholder: 'Ej: 1' },
          { key: 'producto', label: 'Producto', placeholder: 'Ej: Tanque 5000L' },
          { key: 'cantidad', label: 'Cantidad', placeholder: 'Ej: 1' },
        ],
      },
      {
        method: 'GET',
        path: '/produccion/lotes-terminados',
        label: 'Listar Lotes',
        fields: [],
      },
    ],
  },
  {
    id: 'logistica',
    name: 'Logistica',
    color: '#f97316',
    endpoints: [
      {
        method: 'POST',
        path: '/logistica/despachos',
        label: 'Crear Despacho',
        fields: [
          { key: 'lote_id', label: 'ID Lote', placeholder: 'Ej: 1' },
          { key: 'destino', label: 'Destino', placeholder: 'Ej: Ruta 34 Km 200' },
          { key: 'transportista', label: 'Transportista', placeholder: 'Ej: Transportes Sur SRL' },
        ],
      },
      {
        method: 'GET',
        path: '/logistica/despachos',
        label: 'Listar Despachos',
        fields: [],
      },
      {
        method: 'POST',
        path: '/logistica/despachos/{despacho_id}/solicitar-autorizacion',
        label: 'Solicitar Autorizacion',
        pathParams: [{ key: 'despacho_id', label: 'ID Despacho', placeholder: 'Ej: 1' }],
        fields: [],
      },
      {
        method: 'POST',
        path: '/logistica/despachos/{despacho_id}/ejecutar',
        label: 'Ejecutar Despacho',
        pathParams: [{ key: 'despacho_id', label: 'ID Despacho', placeholder: 'Ej: 1' }],
        fields: [],
      },
    ],
  },
]

function App() {
  const [statuses, setStatuses] = useState({})
  const [activeModule, setActiveModule] = useState(null)
  const [formData, setFormData] = useState({})
  const [responses, setResponses] = useState({})
  const [loading, setLoading] = useState({})

  const fetchStatuses = () => {
    setStatuses({})
    MODULES.forEach(async (mod) => {
      try {
        const res = await fetch(`${API_BASE}/${mod.id}/`)
        const data = await res.json()
        setStatuses((prev) => ({ ...prev, [mod.id]: { online: true, data } }))
      } catch {
        setStatuses((prev) => ({ ...prev, [mod.id]: { online: false } }))
      }
    })
  }

  useEffect(() => {
    fetchStatuses()
  }, [])

  const handleFieldChange = (moduleId, endpointIdx, fieldKey, value) => {
    const key = `${moduleId}-${endpointIdx}`
    setFormData((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [fieldKey]: value },
    }))
  }

  const handleSubmit = async (moduleId, endpointIdx, endpoint) => {
    const key = `${moduleId}-${endpointIdx}`
    const data = formData[key] || {}
    setLoading((prev) => ({ ...prev, [key]: true }))

    try {
      let url = `${API_BASE}/${endpoint.path}`

      if (endpoint.pathParams) {
        endpoint.pathParams.forEach((param) => {
          url = url.replace(`{${param.key}}`, data[param.key] || '')
        })
      }

      const body = {}
      if (endpoint.fields) {
        endpoint.fields.forEach((f) => {
          if (f.type === 'toggle') {
            body[f.key] = !!data[f.key]
          } else {
            body[f.key] = data[f.key] || ''
          }
        })
      }

      const options = {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
      }

      if (endpoint.method !== 'GET' && endpoint.fields && endpoint.fields.length > 0) {
        options.body = JSON.stringify(body)
      }

      const res = await fetch(url, options)
      const result = await res.json()
      setResponses((prev) => ({ ...prev, [key]: { status: res.status, data: result } }))
    } catch (err) {
      setResponses((prev) => ({
        ...prev,
        [key]: { status: 'error', data: { error: err.message } },
      }))
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }))
    }
  }

  return (
    <div className="app">
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1, opacity: 0.4, pointerEvents: 'none' }}>
        <LetterGlitch
          glitchSpeed={50}
          centerVignette={true}
          outerVignette={false}
          smooth={true}
        />
      </div>
      <header className="header">
        <div>
          <h1>ERP Industrial</h1>
          <p className="subtitle">API Tester Dashboard</p>
        </div>
        <button className="refresh-btn" onClick={fetchStatuses}>
          Refresh Status
        </button>
      </header>

      <section className="status-grid">
        {MODULES.map((mod) => (
          <div
            key={mod.id}
            className={`status-card ${activeModule === mod.id ? 'active' : ''}`}
            style={{ '--module-color': mod.color }}
            onClick={() => setActiveModule(activeModule === mod.id ? null : mod.id)}
          >
            <div
              className="status-indicator"
              style={{
                backgroundColor: statuses[mod.id]?.online
                  ? '#22c55e'
                  : statuses[mod.id]?.online === false
                    ? '#ef4444'
                    : '#6b7280',
              }}
            />
            <span className="status-name">{mod.name}</span>
            <span className="status-badge" style={{ color: mod.color }}>
              {statuses[mod.id]?.online
                ? 'ONLINE'
                : statuses[mod.id]?.online === false
                  ? 'OFFLINE'
                  : '...'}
            </span>
          </div>
        ))}
      </section>

      {activeModule === 'comercial' && (
        <section className="tester-panel">
          <ComercialPanel />
        </section>
      )}

      {activeModule === 'administracion' && (
        <section className="tester-panel">
          <AdminPanel />
        </section>
      )}

      {activeModule === 'desarrollo' && (
        <section className="tester-panel">
          <DesarrolloPanel />
        </section>
      )}

      {activeModule && activeModule !== 'administracion' && activeModule !== 'desarrollo' && (
        <section className="tester-panel">
          {MODULES.filter((m) => m.id === activeModule).map((mod) => (
            <div key={mod.id}>
              <h2 style={{ color: mod.color }}>{mod.name}</h2>
              {mod.endpoints.map((ep, idx) => {
                const key = `${mod.id}-${idx}`
                return (
                  <div key={idx} className="endpoint-card">
                    <div className="endpoint-header">
                      <span className={`method-badge method-${ep.method.toLowerCase()}`}>
                        {ep.method}
                      </span>
                      <code>
                        {API_BASE}/{ep.path}
                      </code>
                    </div>
                    <h3>{ep.label}</h3>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleSubmit(mod.id, idx, ep)
                      }}
                    >
                      {ep.pathParams?.map((param) => (
                        <div key={param.key} className="field">
                          <label>{param.label}</label>
                          <input
                            type="text"
                            placeholder={param.placeholder}
                            value={(formData[key] || {})[param.key] || ''}
                            onChange={(e) =>
                              handleFieldChange(mod.id, idx, param.key, e.target.value)
                            }
                          />
                        </div>
                      ))}
                      {ep.fields?.map((field) => (
                        <div key={field.key} className={`field ${field.type === 'toggle' ? 'field-toggle' : ''}`}>
                          <label>{field.label}</label>
                          {field.type === 'toggle' ? (
                            <div
                              className={`toggle ${(formData[key] || {})[field.key] ? 'toggle-on' : ''}`}
                              onClick={() =>
                                handleFieldChange(mod.id, idx, field.key, !(formData[key] || {})[field.key])
                              }
                            >
                              <div className="toggle-knob" />
                              <span className="toggle-label">
                                {(formData[key] || {})[field.key] ? 'SI' : 'NO'}
                              </span>
                            </div>
                          ) : (
                          <input
                            type="text"
                            placeholder={field.placeholder}
                            value={(formData[key] || {})[field.key] || ''}
                            onChange={(e) =>
                              handleFieldChange(mod.id, idx, field.key, e.target.value)
                            }
                          />
                          )}
                        </div>
                      ))}
                      <button type="submit" className="submit-btn" disabled={loading[key]}>
                        {loading[key] ? 'Enviando...' : 'Enviar Request'}
                      </button>
                    </form>

                    {responses[key] && (
                      <div className="response-panel">
                        <div className="response-header">
                          <span
                            className={`status-code ${responses[key].status < 300 ? 'success' : 'error'}`}
                          >
                            Status: {responses[key].status}
                          </span>
                        </div>
                        <pre>{JSON.stringify(responses[key].data, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

export default App
