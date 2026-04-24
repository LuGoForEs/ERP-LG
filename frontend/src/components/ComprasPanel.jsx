import React, { useState, useEffect } from 'react';

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
    window.scrollTo({ top: document.getElementById('compras-form').offsetTop, behavior: 'smooth' });
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

  const inputStyle = {
    width: '100%',
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#e2e8f0',
    padding: '0.55rem 0.75rem',
    borderRadius: '0.375rem',
    fontSize: '0.85rem',
    outline: 'none'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.78rem',
    color: '#94a3b8',
    marginBottom: '0.3rem',
    fontWeight: '500'
  };

  const dropdownStyle = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#1e293b',
    border: '1px solid #3b82f6',
    borderRadius: '0.375rem',
    maxHeight: '150px',
    overflowY: 'auto',
    listStyle: 'none',
    padding: 0,
    margin: 0,
    zIndex: 20,
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
  };

  const dropdownItemStyle = {
    padding: '8px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid #334155',
    color: '#e2e8f0',
    fontSize: '0.85rem'
  };

  return (
    <div style={{ color: '#e2e8f0' }}>
      <h2 style={{ color: '#f59e0b', marginBottom: '1.5rem' }}>Panel de Compras</h2>

      {/* --- LISTA DE PEDIDOS PENDIENTES --- */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '0.95rem', color: '#cbd5e1', marginBottom: '1rem' }}>Pedidos de Material Pendientes</h3>
        {pedidosPendientes.length === 0 ? (
          <div className="admin-empty">No hay pedidos de material pendientes.</div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {pedidosPendientes.map(pedido => (
              <div key={pedido.id} style={{ background: '#0f172a', border: '1px solid #334155', padding: '1rem', borderRadius: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#e2e8f0' }}>PM #{pedido.id} (OF #{pedido.of_id})</strong>
                  <span style={{ background: '#92400e', color: '#fcd34d', padding: '0.2rem 0.6rem', borderRadius: '0.25rem', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' }}>
                    {pedido.estado}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.2rem' }}><strong>Emisor:</strong> <span style={{color: '#cbd5e1'}}>{pedido.emisor}</span></div>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.75rem' }}><strong>Equipo:</strong> <span style={{color: '#cbd5e1'}}>{pedido.equipo}</span></div>
                
                <div style={{ fontSize: '0.8rem', background: '#1e293b', padding: '0.75rem', borderRadius: '0.375rem' }}>
                  <strong style={{ color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>Ítems solicitados:</strong>
                  <ul style={{ paddingLeft: '1.2rem', margin: 0, color: '#e2e8f0' }}>
                    {pedido.items.map(item => (
                      <li key={item.id} style={{ marginBottom: '0.25rem' }}>{item.cantidad}x {item.descripcion}</li>
                    ))}
                  </ul>
                </div>

                <button 
                  onClick={() => handleProcesarCompra(pedido)}
                  style={{ marginTop: '1rem', width: '100%', padding: '0.55rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                >
                  Cargar Ítems al Formulario
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- FORMULARIO DE COMPRA --- */}
      <div id="compras-form" style={{ background: '#0f172a', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #1e293b', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#e2e8f0', marginBottom: '1.25rem' }}>Procesar Pedido de Material (PM)</h3>
        
        {error && <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.85rem', border: '1px solid #991b1b' }}>{error}</div>}
        {successMsg && <div style={{ background: '#14532d', color: '#86efac', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.85rem', border: '1px solid #166534' }}>{successMsg}</div>}

        <form onSubmit={handleSubmitFactura}>
          <div style={{ marginBottom: '1.25rem', width: '300px' }}>
            <label style={labelStyle}>ID Pedido Material (PM) Origen</label>
            <input 
              type="number" 
              value={selectedPedidoId}
              onChange={e => setSelectedPedidoId(e.target.value)}
              required
              style={inputStyle}
              placeholder="Ej: 1"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ ...labelStyle, marginBottom: '1rem', fontSize: '0.9rem', color: '#e2e8f0' }}>Desglose de Insumos y Proveedores</label>
            
            <div className="pm-table-wrapper" style={{ overflow: 'visible' }}>
              <table className="pm-table">
                <thead>
                  <tr>
                    <th className="pm-th-num">#</th>
                    <th style={{ minWidth: '200px', padding: '0.5rem 0.4rem', textAlign: 'left', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '600', borderBottom: '1px solid #334155' }}>Insumo</th>
                    <th style={{ minWidth: '200px', padding: '0.5rem 0.4rem', textAlign: 'left', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '600', borderBottom: '1px solid #334155' }}>Proveedor del Insumo</th>
                    <th className="pm-th-cant">Cant.</th>
                    <th style={{ width: '120px', padding: '0.5rem 0.4rem', textAlign: 'left', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '600', borderBottom: '1px solid #334155' }}>Unidad</th>
                    <th style={{ width: '100px', padding: '0.5rem 0.4rem', textAlign: 'left', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '600', borderBottom: '1px solid #334155' }}>Precio Unit. ($)</th>
                    <th className="pm-th-del"></th>
                  </tr>
                </thead>
                <tbody>
                  {materiales.map((mat, index) => (
                    <tr key={index}>
                      <td className="pm-cell-num">{index + 1}</td>
                      <td style={{ position: 'relative' }}>
                        <input 
                          type="text" 
                          value={mat.nombre}
                          onChange={e => handleInsumoQueryChange(index, e.target.value)}
                          onFocus={() => setMostrarSugerenciasInsumo(prev => ({ ...prev, [index]: true }))}
                          onBlur={() => setTimeout(() => setMostrarSugerenciasInsumo(prev => ({ ...prev, [index]: false })), 200)}
                          required
                          autoComplete="off"
                          placeholder="Nombre del insumo..."
                          style={{ width: '100%', background: 'transparent', border: '1px solid transparent', color: '#e2e8f0', padding: '0.35rem 0.4rem', borderRadius: '0.25rem', fontSize: '0.8rem', outline: 'none' }}
                          onMouseEnter={(e) => e.target.style.background = '#0f172a'}
                          onMouseLeave={(e) => { if(document.activeElement !== e.target) e.target.style.background = 'transparent'; }}
                          onFocusCapture={(e) => e.target.style.background = '#0f172a'}
                        />
                        {mostrarSugerenciasInsumo[index] && insumosSugeridos[index]?.length > 0 && (
                          <ul style={dropdownStyle}>
                            {insumosSugeridos[index].map(ins => (
                              <li 
                                key={ins.id}
                                style={dropdownItemStyle}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  selectInsumo(index, ins.nombre);
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#253348'}
                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                              >
                                {ins.nombre}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td style={{ position: 'relative' }}>
                        <input 
                          type="text" 
                          value={mat.proveedor}
                          onChange={e => handleProvQueryChange(index, e.target.value)}
                          onFocus={() => setMostrarSugerenciasProv(prev => ({ ...prev, [index]: true }))}
                          onBlur={() => setTimeout(() => setMostrarSugerenciasProv(prev => ({ ...prev, [index]: false })), 200)}
                          required
                          autoComplete="off"
                          placeholder="Proveedor a asignar..."
                          style={{ width: '100%', background: 'transparent', border: '1px solid transparent', color: '#e2e8f0', padding: '0.35rem 0.4rem', borderRadius: '0.25rem', fontSize: '0.8rem', outline: 'none' }}
                          onMouseEnter={(e) => e.target.style.background = '#0f172a'}
                          onMouseLeave={(e) => { if(document.activeElement !== e.target) e.target.style.background = 'transparent'; }}
                          onFocusCapture={(e) => e.target.style.background = '#0f172a'}
                        />
                        {mostrarSugerenciasProv[index] && proveedoresSugeridos[index]?.length > 0 && (
                          <ul style={dropdownStyle}>
                            {proveedoresSugeridos[index].map(prov => (
                              <li 
                                key={prov.id}
                                style={dropdownItemStyle}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  selectProveedor(index, prov.nombre);
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#253348'}
                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                              >
                                {prov.nombre}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td>
                        <input 
                          type="number" 
                          step="any"
                          value={mat.cantidad}
                          onChange={e => handleMaterialChange(index, 'cantidad', e.target.value)}
                          required min="0.01"
                          placeholder="Cant."
                          style={{ width: '100%', background: 'transparent', border: '1px solid transparent', color: '#e2e8f0', padding: '0.35rem 0.4rem', borderRadius: '0.25rem', fontSize: '0.8rem', textAlign: 'center', outline: 'none' }}
                          onMouseEnter={(e) => e.target.style.background = '#0f172a'}
                          onMouseLeave={(e) => { if(document.activeElement !== e.target) e.target.style.background = 'transparent'; }}
                          onFocusCapture={(e) => e.target.style.background = '#0f172a'}
                        />
                      </td>
                      <td>
                        <select
                          value={mat.unidad_medida}
                          onChange={e => handleMaterialChange(index, 'unidad_medida', e.target.value)}
                          style={{ width: '100%', background: 'transparent', border: '1px solid transparent', color: '#e2e8f0', padding: '0.35rem 0.4rem', borderRadius: '0.25rem', fontSize: '0.8rem', outline: 'none', appearance: 'auto' }}
                          onMouseEnter={(e) => e.target.style.background = '#0f172a'}
                          onMouseLeave={(e) => { if(document.activeElement !== e.target) e.target.style.background = 'transparent'; }}
                          onFocusCapture={(e) => e.target.style.background = '#0f172a'}
                        >
                          <option value="unidades" style={{background: '#1e293b'}}>Unidades</option>
                          <option value="kilogramos" style={{background: '#1e293b'}}>Kilogramos</option>
                          <option value="metros" style={{background: '#1e293b'}}>Metros</option>
                        </select>
                      </td>
                      <td>
                        <input 
                          type="number" 
                          step="any"
                          value={mat.precio_unitario}
                          onChange={e => handleMaterialChange(index, 'precio_unitario', e.target.value)}
                          required min="0.01"
                          placeholder="Precio Unit."
                          style={{ width: '100%', background: 'transparent', border: '1px solid transparent', color: '#e2e8f0', padding: '0.35rem 0.4rem', borderRadius: '0.25rem', fontSize: '0.8rem', textAlign: 'center', outline: 'none' }}
                          onMouseEnter={(e) => e.target.style.background = '#0f172a'}
                          onMouseLeave={(e) => { if(document.activeElement !== e.target) e.target.style.background = 'transparent'; }}
                          onFocusCapture={(e) => e.target.style.background = '#0f172a'}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="pm-row-del"
                          onClick={() => removeRow(index)}
                          disabled={materiales.length <= 1}
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
              <button type="button" className="pm-add-row" onClick={addMaterial}>
                + Agregar fila
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #1e293b', paddingTop: '1.25rem' }}>
            <div style={{ marginRight: '1.5rem', display: 'flex', alignItems: 'center' }}>
              <strong style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total Estimado de esta OC: </strong> 
              <span style={{ fontSize: '1.1rem', marginLeft: '0.5rem', color: '#10b981', fontWeight: 'bold' }}>
                ${materiales.reduce((acc, m) => acc + (parseFloat(m.cantidad || 0) * parseFloat(m.precio_unitario || 0)), 0).toFixed(2)}
              </span>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              style={{ padding: '0.55rem 1.5rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.85rem', transition: 'background 0.2s' }}
            >
              {loading ? 'Registrando...' : 'Confirmar Pedido de Material'}
            </button>
          </div>
        </form>
      </div>

      {/* --- LISTA DE FACTURAS --- */}
      <div>
        <h3 style={{ fontSize: '0.95rem', color: '#cbd5e1', marginBottom: '1rem' }}>Historial de Pedidos de Material (PM) Procesados</h3>
        {facturas.length === 0 ? (
          <div className="admin-empty">No hay Pedidos de Material procesados.</div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid #1e293b', borderRadius: '0.375rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '700px' }}>
              <thead style={{ background: '#1e293b' }}>
                <tr>
                  <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '600', borderBottom: '1px solid #334155' }}>ID Doc</th>
                  <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '600', borderBottom: '1px solid #334155' }}>PM Asoc.</th>
                  <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '600', borderBottom: '1px solid #334155' }}>Prov. Principal</th>
                  <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '600', borderBottom: '1px solid #334155' }}>Desglose Materiales</th>
                  <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '600', borderBottom: '1px solid #334155' }}>Monto Total</th>
                  <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '600', borderBottom: '1px solid #334155' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {facturas.map(fac => (
                  <tr key={fac.id} style={{ borderBottom: '1px solid #1e293b', background: '#0f172a' }}>
                    <td style={{ padding: '0.6rem 0.75rem', color: '#e2e8f0', verticalAlign: 'top' }}>#{fac.id}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: '#cbd5e1', verticalAlign: 'top' }}>PM #{fac.pedido_material_id}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: '#cbd5e1', verticalAlign: 'top' }}>{fac.proveedor}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: '#94a3b8' }}>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {fac.materiales && fac.materiales.map((m, idx) => (
                          <li key={idx} style={{ marginBottom: '0.2rem' }}>
                            <span style={{ color: '#e2e8f0' }}>{m.cantidad} {m.unidad_medida}</span> de {m.nombre} 
                            <span style={{ fontSize: '0.75rem' }}> ({m.proveedor || fac.proveedor})</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: 'bold', color: '#10b981', verticalAlign: 'top' }}>${parseFloat(fac.monto_total).toFixed(2)}</td>
                    <td style={{ padding: '0.6rem 0.75rem', verticalAlign: 'top' }}>
                      <span style={{ background: '#065f46', color: '#6ee7b7', padding: '0.2rem 0.6rem', borderRadius: '0.25rem', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' }}>
                        {fac.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
