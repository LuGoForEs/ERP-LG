import { useState, useEffect, useCallback } from 'react'

const API_BASE = '/api/v1'

const ESTADO_COLORS = {
  aprobada: '#22c55e',
  generado: '#3b82f6',
  facturado: '#8b5cf6',
  enviado: '#06b6d4',
}

const EMPTY_ITEM = { cantidad: '', descripcion: '', uso_en: '', observaciones: '', oc_numero: '', oc_fecha: '' }

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
        cantidad: parseInt(item.cantidad, 10),
        descripcion: item.descripcion,
        uso_en: item.uso_en,
        observaciones: item.observaciones,
        oc_numero: item.oc_numero,
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
    <div className="dev-layout">
      {/* Sidebar */}
      <div className="admin-list">
        <h3>OFs Aprobadas ({ordenes.length})</h3>
        {ordenes.length === 0 && (
          <p className="admin-empty">
            No hay OFs aprobadas. Administracion debe validar un anticipo primero.
          </p>
        )}
        {ordenes.map((o) => (
          <div
            key={o.id}
            className={`admin-of-card ${selected?.id === o.id ? 'selected' : ''}`}
            onClick={() => handleSelect(o)}
          >
            <div className="admin-of-header">
              <span className="admin-of-id">OF-{o.id}</span>
              <span className="admin-estado" style={{ color: ESTADO_COLORS.aprobada }}>
                aprobada
              </span>
            </div>
            <div className="admin-of-cliente">{o.cliente}</div>
            <div className="admin-of-desc">{o.descripcion}</div>
            <div className="admin-of-monto">{o.plazo_entrega}</div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="dev-main">
        {!selected ? (
          <div className="admin-placeholder">
            <p>Selecciona una OF aprobada para generar PM o PP</p>
          </div>
        ) : (
          <>
            {/* OF Header */}
            <div className="admin-detail-header">
              <h3>OF-{selected.id}</h3>
              <span className="admin-estado-badge" style={{ backgroundColor: ESTADO_COLORS.aprobada }}>
                aprobada
              </span>
            </div>
            <div className="admin-detail-grid">
              <div className="admin-field-ro">
                <label>Cliente</label>
                <span>{selected.cliente}</span>
              </div>
              <div className="admin-field-ro">
                <label>Descripcion</label>
                <span>{selected.descripcion}</span>
              </div>
              <div className="admin-field-ro">
                <label>Plazo</label>
                <span>{selected.plazo_entrega}</span>
              </div>
            </div>

            {/* PM Form */}
            <form className="pm-form" onSubmit={handleCrearPedido}>
              <h4>Pedido de Material (PM)</h4>

              <div className="pm-header-fields">
                <div className="pm-field">
                  <label>Emisor</label>
                  <input
                    type="text"
                    placeholder="Nombre del emisor"
                    value={pmForm.emisor}
                    onChange={(e) => setPmForm({ ...pmForm, emisor: e.target.value })}
                  />
                </div>
                <div className="pm-field">
                  <label>Fecha</label>
                  <input
                    type="date"
                    value={pmForm.fecha}
                    onChange={(e) => setPmForm({ ...pmForm, fecha: e.target.value })}
                  />
                </div>
                <div className="pm-field">
                  <label>Plazo / Fecha entrega</label>
                  <input
                    type="text"
                    placeholder="Ej: 15 dias, 2026-05-01"
                    value={pmForm.plazo_entrega}
                    onChange={(e) => setPmForm({ ...pmForm, plazo_entrega: e.target.value })}
                  />
                </div>
                <div className="pm-field">
                  <label>Equipo</label>
                  <input
                    type="text"
                    placeholder="Ej: Tanque 5000L"
                    value={pmForm.equipo}
                    onChange={(e) => setPmForm({ ...pmForm, equipo: e.target.value })}
                  />
                </div>
              </div>

              {/* Items table */}
              <div className="pm-table-wrapper">
                <table className="pm-table">
                  <thead>
                    <tr>
                      <th className="pm-th-num">#</th>
                      <th className="pm-th-cant">Cant.</th>
                      <th className="pm-th-desc">Descripcion</th>
                      <th className="pm-th-uso">Uso en</th>
                      <th className="pm-th-obs">Observaciones</th>
                      <th className="pm-th-oc">OC Nro</th>
                      <th className="pm-th-ocf">OC Fecha</th>
                      <th className="pm-th-del"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pmItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="pm-cell-num">{idx + 1}</td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            placeholder="0"
                            value={item.cantidad}
                            onChange={(e) => updateItem(idx, 'cantidad', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="Material o insumo"
                            value={item.descripcion}
                            onChange={(e) => updateItem(idx, 'descripcion', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="Destino"
                            value={item.uso_en}
                            onChange={(e) => updateItem(idx, 'uso_en', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="Notas"
                            value={item.observaciones}
                            onChange={(e) => updateItem(idx, 'observaciones', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="OC-001"
                            value={item.oc_numero}
                            onChange={(e) => updateItem(idx, 'oc_numero', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            value={item.oc_fecha}
                            onChange={(e) => updateItem(idx, 'oc_fecha', e.target.value)}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="pm-row-del"
                            onClick={() => removeRow(idx)}
                            disabled={pmItems.length <= 1}
                            title="Eliminar fila"
                          >
                            x
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pm-table-actions">
                <button type="button" className="pm-add-row" onClick={addRow}>
                  + Agregar fila
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={submitting === 'pedido' || !hasValidItems || !pmForm.emisor.trim()}
                >
                  {submitting === 'pedido' ? 'Creando...' : 'Crear Pedido de Material'}
                </button>
              </div>
            </form>

            {/* PP Form */}
            <form className="pm-form pp-form" onSubmit={handleCrearPlano}>
              <h4>Plano de Produccion (PP)</h4>
              <div className="pp-fields">
                <div className="pm-field pp-desc-field">
                  <label>Descripcion</label>
                  <input
                    type="text"
                    placeholder="Ej: Plano tanque 5000L rev.2 - vista general"
                    value={planoForm.descripcion}
                    onChange={(e) => setPlanoForm({ descripcion: e.target.value })}
                  />
                </div>
                <div className="pm-field pp-file-field">
                  <label>Archivo PDF</label>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="admin-file-input"
                    onChange={(e) => setPlanoArchivo(e.target.files[0] || null)}
                  />
                  {planoArchivo && (
                    <span className="pp-file-info">
                      {planoArchivo.name} ({(planoArchivo.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>
              </div>
              <button
                type="submit"
                className="submit-btn"
                disabled={submitting === 'plano' || !planoForm.descripcion.trim() || !planoArchivo}
              >
                {submitting === 'plano' ? 'Enviando...' : 'Enviar Plano a Produccion'}
              </button>
            </form>

            {/* Existing PMs */}
            {pedidosOf.length > 0 && (
              <div className="desarrollo-list-section">
                <h4>Pedidos de Material de esta OF ({pedidosOf.length})</h4>
                {pedidosOf.map((p) => (
                  <div key={p.id} className="pm-card">
                    <div
                      className="pm-card-header"
                      onClick={() => setExpandedPm(expandedPm === p.id ? null : p.id)}
                    >
                      <div className="pm-card-left">
                        <span className="admin-of-id">PM-{p.id}</span>
                        <span className="pm-card-meta">
                          {p.emisor} &middot; {p.fecha} &middot; {p.equipo}
                        </span>
                      </div>
                      <div className="pm-card-right">
                        <span className="pm-card-count">{p.items?.length || 0} items</span>
                        <span
                          className="admin-estado"
                          style={{ color: ESTADO_COLORS[p.estado] || '#94a3b8' }}
                        >
                          {p.estado}
                        </span>
                        <span className="pm-expand-icon">{expandedPm === p.id ? '▲' : '▼'}</span>
                      </div>
                    </div>
                    {expandedPm === p.id && p.items && (
                      <div className="pm-card-detail">
                        <table className="pm-table pm-table-readonly">
                          <thead>
                            <tr>
                              <th className="pm-th-num">#</th>
                              <th className="pm-th-cant">Cant.</th>
                              <th className="pm-th-desc">Descripcion</th>
                              <th className="pm-th-uso">Uso en</th>
                              <th className="pm-th-obs">Observaciones</th>
                              <th className="pm-th-oc">OC Nro</th>
                              <th className="pm-th-ocf">OC Fecha</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.items.map((item, idx) => (
                              <tr key={idx}>
                                <td className="pm-cell-num">{idx + 1}</td>
                                <td>{item.cantidad}</td>
                                <td>{item.descripcion}</td>
                                <td>{item.uso_en || '-'}</td>
                                <td>{item.observaciones || '-'}</td>
                                <td>{item.oc_numero || '-'}</td>
                                <td>{item.oc_fecha || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Existing PPs */}
            {planosOf.length > 0 && (
              <div className="desarrollo-list-section">
                <h4>Planos de Produccion de esta OF ({planosOf.length})</h4>
                {planosOf.map((p) => (
                  <div key={p.id} className="desarrollo-item">
                    <div className="desarrollo-item-header">
                      <span className="admin-of-id">PP-{p.id}</span>
                      <span
                        className="admin-estado"
                        style={{ color: ESTADO_COLORS[p.estado] || '#94a3b8' }}
                      >
                        {p.estado}
                      </span>
                    </div>
                    <div className="desarrollo-item-detail">{p.descripcion}</div>
                    {p.archivo && (
                      <div className="pp-archivo-info">
                        <span className="pp-archivo-icon">PDF</span>
                        <span>{p.archivo.nombre}</span>
                        <span className="pp-archivo-size">
                          {(p.archivo.tamanio_bytes / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* API Response */}
            {resultado && (
              <div className="response-panel">
                <div className="response-header">
                  <span className={`status-code ${resultado.status < 300 ? 'success' : 'error'}`}>
                    Status: {resultado.status}
                  </span>
                </div>
                <pre>{JSON.stringify(resultado.data, null, 2)}</pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
