import { useState, useEffect } from 'react'
import {
  Loader2,
  Package,
  TrendingUp,
  ArrowRight,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react'

const API_BASE = '/api/v1'

export default function PanolPanel() {
  const [stock, setStock] = useState({})
  const [ingresos, setIngresos] = useState([])
  const [movimientos, setMovimientos] = useState([])

  const [loadingStock, setLoadingStock] = useState(false)
  const [loadingIngreso, setLoadingIngreso] = useState(false)
  const [loadingDespacho, setLoadingDespacho] = useState(false)

  const [facturaId, setFacturaId] = useState('')
  const [ofId, setOfId] = useState('')
  const [materiales, setMateriales] = useState([{ nombre: '', cantidad: '' }])

  const [message, setMessage] = useState(null)

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const fetchStock = async () => {
    setLoadingStock(true)
    try {
      const res = await fetch(`${API_BASE}/panol/stock`)
      const data = await res.json()
      setStock(data.data || {})
    } catch {
      showMessage('error', 'Error al cargar el stock')
    } finally {
      setLoadingStock(false)
    }
  }

  const fetchIngresos = async () => {
    try {
      const res = await fetch(`${API_BASE}/panol/ingresos`)
      const data = await res.json()
      setIngresos(data.data || [])
    } catch {
      console.error('Error al cargar ingresos')
    }
  }

  const fetchMovimientos = async () => {
    try {
      const res = await fetch(`${API_BASE}/panol/movimientos`)
      const data = await res.json()
      setMovimientos(data.data || [])
    } catch {
      console.error('Error al cargar movimientos')
    }
  }

  useEffect(() => {
    fetchStock()
    fetchIngresos()
    fetchMovimientos()
  }, [])

  const handleRegistrarIngreso = async () => {
    if (!facturaId) return
    setLoadingIngreso(true)
    try {
      const res = await fetch(`${API_BASE}/panol/ingresos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factura_id: parseInt(facturaId, 10) })
      })
      const result = await res.json()
      if (res.ok) {
        showMessage('success', result.message || 'Ingreso registrado con éxito')
        setFacturaId('')
        await Promise.all([fetchStock(), fetchIngresos()])
      } else {
        showMessage('error', result.detail || 'Error al registrar el ingreso')
      }
    } catch {
      showMessage('error', 'Error de red al conectar con el servidor')
    } finally {
      setLoadingIngreso(false)
    }
  }

  const handleDespacho = async () => {
    const materialesValidos = materiales.filter(
      (m) => m.nombre.trim() !== '' && m.cantidad !== ''
    )
    if (!ofId || materialesValidos.length === 0) return

    setLoadingDespacho(true)
    try {
      const res = await fetch(`${API_BASE}/panol/movimientos/produccion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          of_id: parseInt(ofId, 10),
          materiales: materialesValidos.map((m) => ({
            nombre: m.nombre.trim(),
            cantidad: parseFloat(m.cantidad)
          }))
        })
      })
      const result = await res.json()
      if (res.ok) {
        showMessage('success', result.message || 'Despacho registrado con éxito')
        setOfId('')
        setMateriales([{ nombre: '', cantidad: '' }])
        await Promise.all([fetchStock(), fetchMovimientos()])
      } else {
        const errText =
          result.detail ||
          (result.message
            ? `Faltante de stock: ${result.message}`
            : 'Error al registrar el despacho')
        showMessage('error', errText)
      }
    } catch {
      showMessage('error', 'Error de red al conectar con el servidor')
    } finally {
      setLoadingDespacho(false)
    }
  }

  const agregarMaterial = () => {
    setMateriales((prev) => [...prev, { nombre: '', cantidad: '' }])
  }

  const eliminarMaterial = (idx) => {
    setMateriales((prev) => prev.filter((_, i) => i !== idx))
  }

  const actualizarMaterial = (idx, field, value) => {
    setMateriales((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m))
    )
  }

  const stockEntries = Object.entries(stock)

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-plus-jakarta">

      {/* Header */}
      <div className="flex justify-between items-end mb-2">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">
            Pañol de Materiales
          </h2>
          <p className="font-body-md text-body-md text-outline mt-1">
            Control de stock, ingresos por factura y despachos a producción.
          </p>
        </div>
      </div>

      {/* ── SECCIÓN STOCK ─────────────────────────────────────────── */}
      <section className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-lg">
        <div className="p-6 pb-4 border-b border-outline-variant flex justify-between items-center">
          <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
            <Package size={18} className="text-primary" />
            Stock Actual
          </h3>
          <button
            onClick={fetchStock}
            disabled={loadingStock}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-lg text-xs font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
          >
            {loadingStock
              ? <Loader2 size={14} className="animate-spin" />
              : <RefreshCw size={14} />}
            Actualizar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background/50 border-b border-outline-variant">
                <th className="p-4 font-label-md text-[10px] text-outline font-black uppercase tracking-wider">
                  Material
                </th>
                <th className="p-4 font-label-md text-[10px] text-outline font-black uppercase tracking-wider text-right">
                  Cantidad en Stock
                </th>
              </tr>
            </thead>
            <tbody className="font-body-md text-body-md">
              {stockEntries.length === 0 ? (
                <tr>
                  <td colSpan="2" className="p-8 text-center text-outline italic text-sm">
                    {loadingStock ? 'Cargando stock...' : 'No hay materiales en stock'}
                  </td>
                </tr>
              ) : (
                stockEntries.map(([nombre, cantidad]) => (
                  <tr
                    key={nombre}
                    className="border-b border-outline-variant hover:bg-surface-variant transition-colors"
                  >
                    <td className="p-4 text-on-surface text-sm font-medium">{nombre}</td>
                    <td className="p-4 text-right">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black border ${
                        cantidad <= 0
                          ? 'bg-error/10 text-error border-error/20'
                          : cantidad < 10
                          ? 'bg-secondary/10 text-secondary border-secondary/20'
                          : 'bg-primary/10 text-primary border-primary/20'
                      }`}>
                        {Number(cantidad).toLocaleString('es-AR')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        {/* ── SECCIÓN INGRESOS ──────────────────────────────────────── */}
        <section className="space-y-4">
          {/* Formulario de nuevo ingreso */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <TrendingUp size={80} className="text-primary" />
            </div>

            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-5 flex items-center gap-2 relative z-10">
              <TrendingUp size={18} className="text-primary" />
              Registrar Ingreso
            </h3>

            <div className="space-y-4 relative z-10">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">
                  Factura ID
                </label>
                <input
                  type="number"
                  placeholder="Nro. de factura..."
                  min="1"
                  className="w-full bg-surface-container-high border border-outline-variant rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-primary transition-all text-on-surface"
                  value={facturaId}
                  onChange={(e) => setFacturaId(e.target.value)}
                />
              </div>

              <button
                onClick={handleRegistrarIngreso}
                disabled={!facturaId || loadingIngreso}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
              >
                {loadingIngreso
                  ? <Loader2 size={14} className="animate-spin" />
                  : <ArrowRight size={14} />}
                REGISTRAR INGRESO
              </button>
            </div>
          </div>

          {/* Lista de ingresos */}
          <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-lg">
            <div className="p-5 pb-3 border-b border-outline-variant">
              <h4 className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">
                Ingresos Registrados
              </h4>
            </div>
            <div className="divide-y divide-outline-variant max-h-72 overflow-y-auto">
              {ingresos.length === 0 ? (
                <p className="p-6 text-center text-outline italic text-sm">
                  No hay ingresos registrados
                </p>
              ) : (
                ingresos.map((ing) => (
                  <div key={ing.id} className="p-4 hover:bg-surface-variant transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-[10px] font-black text-outline uppercase tracking-widest">
                          ING-{ing.id}
                        </span>
                        <span className="ml-2 text-[10px] font-black text-primary uppercase tracking-widest">
                          FAC-{ing.factura_id}
                        </span>
                      </div>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        ing.estado === 'procesado'
                          ? 'bg-secondary/10 text-secondary border-secondary/20'
                          : 'bg-primary/10 text-primary border-primary/20'
                      }`}>
                        {ing.estado}
                      </span>
                    </div>
                    {ing.materiales && ing.materiales.length > 0 && (
                      <ul className="space-y-0.5">
                        {ing.materiales.map((m, i) => (
                          <li key={i} className="text-xs text-outline flex justify-between">
                            <span>{m.nombre}</span>
                            <span className="text-on-surface font-medium">
                              {Number(m.cantidad).toLocaleString('es-AR')} u.
                              {m.precio_unitario != null && (
                                <span className="ml-2 text-outline">
                                  @ ${Number(m.precio_unitario).toLocaleString('es-AR')}
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* ── SECCIÓN MOVIMIENTOS A PRODUCCIÓN ─────────────────────── */}
        <section className="space-y-4">
          {/* Formulario de despacho */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <ArrowRight size={80} className="text-secondary" />
            </div>

            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-5 flex items-center gap-2 relative z-10">
              <ArrowRight size={18} className="text-secondary" />
              Despachar a Producción
            </h3>

            <div className="space-y-4 relative z-10">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">
                  OF ID
                </label>
                <input
                  type="number"
                  placeholder="Nro. de Orden de Fabricación..."
                  min="1"
                  className="w-full bg-surface-container-high border border-outline-variant rounded-lg py-2.5 px-3 text-xs focus:outline-none focus:border-primary transition-all text-on-surface"
                  value={ofId}
                  onChange={(e) => setOfId(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">
                    Materiales
                  </label>
                  <button
                    onClick={agregarMaterial}
                    className="flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-widest hover:text-primary/80 transition-colors"
                  >
                    <Plus size={12} />
                    Agregar Material
                  </button>
                </div>

                <div className="space-y-2">
                  {materiales.map((mat, idx) => (
                    <div key={idx} className="flex gap-2 items-center animate-in slide-in-from-top-1 duration-150">
                      <input
                        type="text"
                        placeholder="Nombre..."
                        className="flex-1 bg-surface-container-high border border-outline-variant rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary transition-all text-on-surface"
                        value={mat.nombre}
                        onChange={(e) => actualizarMaterial(idx, 'nombre', e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Cant."
                        min="0"
                        step="any"
                        className="w-20 bg-surface-container-high border border-outline-variant rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary transition-all text-on-surface"
                        value={mat.cantidad}
                        onChange={(e) => actualizarMaterial(idx, 'cantidad', e.target.value)}
                      />
                      <button
                        onClick={() => eliminarMaterial(idx)}
                        disabled={materiales.length === 1}
                        className="p-2 text-outline hover:text-error hover:bg-error/10 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Eliminar material"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleDespacho}
                disabled={
                  !ofId ||
                  loadingDespacho ||
                  materiales.every((m) => m.nombre.trim() === '' || m.cantidad === '')
                }
                className="w-full py-3 bg-secondary hover:bg-secondary/90 text-on-secondary font-bold text-xs rounded-xl transition-all shadow-lg shadow-secondary/20 active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
              >
                {loadingDespacho
                  ? <Loader2 size={14} className="animate-spin" />
                  : <ArrowRight size={14} />}
                DESPACHAR A PRODUCCIÓN
              </button>
            </div>
          </div>

          {/* Lista de movimientos */}
          <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-lg">
            <div className="p-5 pb-3 border-b border-outline-variant">
              <h4 className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">
                Movimientos Registrados
              </h4>
            </div>
            <div className="divide-y divide-outline-variant max-h-72 overflow-y-auto">
              {movimientos.length === 0 ? (
                <p className="p-6 text-center text-outline italic text-sm">
                  No hay movimientos registrados
                </p>
              ) : (
                movimientos.map((mov) => (
                  <div key={mov.id} className="p-4 hover:bg-surface-variant transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-[10px] font-black text-outline uppercase tracking-widest">
                          MOV-{mov.id}
                        </span>
                        <span className="ml-2 text-[10px] font-black text-secondary uppercase tracking-widest">
                          OF-{mov.of_id}
                        </span>
                      </div>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        mov.estado === 'entregado'
                          ? 'bg-secondary/10 text-secondary border-secondary/20'
                          : 'bg-primary/10 text-primary border-primary/20'
                      }`}>
                        {mov.estado}
                      </span>
                    </div>
                    {mov.materiales && mov.materiales.length > 0 && (
                      <ul className="space-y-0.5">
                        {mov.materiales.map((m, i) => (
                          <li key={i} className="text-xs text-outline flex justify-between">
                            <span>{m.nombre}</span>
                            <span className="text-on-surface font-medium">
                              {Number(m.cantidad).toLocaleString('es-AR')} u.
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── TOAST DE MENSAJES ─────────────────────────────────────── */}
      {message && (
        <div
          className={`fixed bottom-8 right-8 z-[100] flex items-center gap-4 p-5 rounded-2xl border shadow-2xl animate-in slide-in-from-right-8 duration-300 ${
            message.type === 'success'
              ? 'bg-secondary/20 border-secondary text-secondary'
              : 'bg-error/20 border-error text-error'
          }`}
        >
          {message.type === 'success'
            ? <CheckCircle size={20} />
            : <AlertTriangle size={20} />}
          <p className="text-xs font-bold">{message.text}</p>
          <button
            onClick={() => setMessage(null)}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
