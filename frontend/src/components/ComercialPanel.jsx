import { useState, useEffect } from 'react'

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
    <div className="comercial-panel-container">
      <div className="admin-panel" style={{ 
        display: 'flex', 
        gap: '1.5rem', 
        alignItems: 'flex-start', // Permite que el sticky funcione
        justifyContent: 'stretch'
      }}>
        
        {/* BLOQUE IZQUIERDO: ÓRDENES RECIENTES */}
        <div className="admin-list" style={{ 
          flex: '0 0 350px',
          height: '490px', // Ajustado para que entren exactamente 3 órdenes
          display: 'flex',
          flexDirection: 'column',
          background: '#0f172a',
          borderRadius: '0.75rem',
          border: '1px solid #1e293b',
          overflow: 'hidden',
          padding: 0
        }}>
          <div style={{ 
            padding: '1.25rem', 
            borderBottom: '1px solid #1e293b', 
            background: '#1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ 
              fontSize: '0.8rem', 
              color: '#94a3b8', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em', 
              margin: 0 
            }}>Órdenes Recientes</h3>
          </div>
          
          <div className="scrollable-list" style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '1rem',
            scrollbarWidth: 'thin',
            scrollbarColor: '#334155 #0f172a'
          }}>
            {ordenes.length === 0 && (
              <p className="admin-empty">Sin órdenes de fabricación</p>
            )}
            {ordenes.slice(0).reverse().map(o => (
              <div key={o.id} className="admin-of-card" style={{ marginBottom: '0.75rem', border: '1px solid #1e293b' }}>
                <div className="admin-of-header">
                  <span className="admin-of-id">OF-{o.id}</span>
                  <span className="admin-estado" style={{ color: '#3b82f6' }}>{o.estado}</span>
                </div>
                <div className="admin-of-cliente">{o.cliente}</div>
                <div className="admin-of-desc">{o.descripcion}</div>
                <div className="admin-of-monto" style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  Plazo: {o.plazo_entrega}
                </div>
                <div className="admin-of-monto">
                  Anticipo: {o.moneda_anticipo === 'definir' ? o.anticipo_descripcion : `${o.moneda_anticipo} ${Number(o.monto_anticipo).toLocaleString()}`}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BLOQUE DERECHO: NUEVA ORDEN (STATIC/STICKY) */}
        <div className="admin-detail" style={{ 
          flex: 1, 
          position: 'sticky', 
          top: '20px', 
          height: '490px', // Misma altura que el de la izquierda
          display: 'flex',
          flexDirection: 'column',
          background: '#0f172a',
          borderRadius: '0.75rem',
          border: '1px solid #1e293b',
          overflow: 'hidden',
          padding: 0
        }}>
          <div className="admin-detail-header" style={{ 
            padding: '1.25rem', 
            borderBottom: '1px solid #1e293b', 
            margin: 0,
            background: '#1e293b'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Nueva Orden de Fabricación</h3>
          </div>

          <div className="admin-form" style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '1.5rem',
            scrollbarWidth: 'thin'
          }}>
            <div className="field">
              <label>Cliente *</label>
              <input 
                type="text" 
                placeholder="Nombre del cliente..."
                value={formData.cliente}
                onChange={(e) => setFormData({...formData, cliente: e.target.value})}
              />
            </div>

            <div className="field">
              <label>Descripción del Trabajo *</label>
              <textarea 
                className="admin-textarea"
                rows={3}
                placeholder="Detalle de lo que se va a fabricar..."
                value={formData.descripcion}
                onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              />
            </div>

            <div className="admin-detail-grid">
              <div className="field">
                <label>Plazo de Entrega *</label>
                <div style={{ display: 'flex' }}>
                  <input 
                    type="number" 
                    placeholder="Valor"
                    style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                    value={formData.plazo_valor}
                    onChange={(e) => setFormData({...formData, plazo_valor: e.target.value})}
                  />
                  <select 
                    className="admin-textarea"
                    style={{ width: '100px', padding: '0.45rem', borderTopLeftRadius: 0, borderBottomLeftRadius: 0, fontSize: '0.8rem', height: '37px' }}
                    value={formData.plazo_unidad}
                    onChange={(e) => setFormData({...formData, plazo_unidad: e.target.value})}
                  >
                    <option value="dias">Días</option>
                    <option value="meses">Meses</option>
                    <option value="años">Años</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Anticipo Requerido *</label>
                <div style={{ display: 'flex' }}>
                  <input 
                    type="number" 
                    placeholder="Monto"
                    style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                    value={formData.anticipo_valor}
                    onChange={(e) => setFormData({...formData, anticipo_valor: e.target.value})}
                  />
                  <select 
                    className="admin-textarea"
                    style={{ width: '100px', padding: '0.45rem', borderTopLeftRadius: 0, borderBottomLeftRadius: 0, fontSize: '0.8rem', height: '37px' }}
                    value={formData.anticipo_moneda}
                    onChange={(e) => setFormData({...formData, anticipo_moneda: e.target.value})}
                  >
                    <option value="ARS">ARS ($)</option>
                    <option value="USD">USD (U$S)</option>
                    <option value="EUR">Euros (€)</option>
                    <option value="definir">Otras...</option>
                  </select>
                </div>
              </div>
            </div>

            {formData.anticipo_moneda === 'definir' && (
              <div className="field">
                <label>Moneda a Definir *</label>
                <input 
                  type="text" 
                  placeholder="Descripción de la moneda o forma de pago..."
                  value={formData.anticipo_descripcion}
                  onChange={(e) => setFormData({...formData, anticipo_descripcion: e.target.value})}
                />
              </div>
            )}

            <button 
              className="submit-btn" 
              style={{ width: '100%', marginTop: '0.5rem', backgroundColor: '#3b82f6', padding: '0.75rem' }}
              disabled={!isFormValid || loading}
              onClick={() => setShowConfirm(true)}
            >
              {loading ? 'Procesando...' : 'CREAR ORDEN DE FABRICACIÓN'}
            </button>
            
            {!isFormValid && (
              <p style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.75rem', textAlign: 'center' }}>
                * Todos los campos son requeridos.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmación Estilo Dark */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="endpoint-card" style={{ maxWidth: '400px', border: '1px solid #334155', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
            <h3 style={{ color: '#e2e8f0', marginBottom: '1rem' }}>Confirmar Operación</h3>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
              ¿Estás seguro que deseas crear la Orden de Fabricación para <strong>{formData.cliente}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                className="refresh-btn" 
                style={{ flex: 1 }}
                onClick={() => setShowConfirm(false)}
              >
                Cancelar
              </button>
              <button 
                className="submit-btn" 
                style={{ flex: 1, backgroundColor: '#16a34a' }}
                onClick={handleCreate}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts de mensaje */}
      {message && (
        <div className={`message-toast ${message.type}`} style={{
          position: 'fixed', bottom: '20px', right: '20px', padding: '1rem 1.5rem', borderRadius: '0.5rem',
          backgroundColor: message.type === 'success' ? '#065f46' : '#7f1d1d',
          color: message.type === 'success' ? '#a7f3d0' : '#fecaca',
          border: `1px solid ${message.type === 'success' ? '#059669' : '#b91c1c'}`,
          zIndex: 1100, display: 'flex', alignItems: 'center', gap: '1rem'
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{message.text}</span>
          <button 
            onClick={() => setMessage(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            &times;
          </button>
        </div>
      )}

      <style jsx="true">{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
        }
      `}</style>
    </div>
  )
}
