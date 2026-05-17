import React from 'react';
import { api } from '../api';
import { usePermissions } from '../contexts/PermissionsContext';
import {
  cx, Icon, Button,
  EstadoBadge, Badge, Card, CardHeader, CardTitle,
  Metric, useToast, useSearchShortcut,
  SectionLabel, EmptyState, DataTable, ModuleHeader,
} from './primitives';

export default function ComprasPanel() {
  const { isReadonly } = usePermissions();
  const readonly = isReadonly('compras');
  const [pedidos, setPedidos] = React.useState([]);
  const [facturas, setFacturas] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedPm, setSelectedPm] = React.useState(null);
  const [materiales, setMateriales] = React.useState([{ nombre: '', proveedor: '', cantidad: 1, unidad: 'u', precio_unitario: 0 }]);
  const [saving, setSaving] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [selectedOC, setSelectedOC] = React.useState(null);
  const [pdfFile, setPdfFile] = React.useState(null);
  const [pdfLoadingId, setPdfLoadingId] = React.useState(null);
  const searchRef = React.useRef(null);
  useSearchShortcut(searchRef, () => setSearch(''));
  const toast = useToast();

  const load = React.useCallback(async () => {
    try {
      const [pms, facs] = await Promise.all([
        api.compras.getPMs(),
        api.compras.getFacturas(),
      ]);
      setPedidos(pms);
      setFacturas(facs);
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => { load(); }, [load]);

  const q = search.toLowerCase();
  const matchP = (p) => !q || `PM-${p.id} OF-${p.of_id} ${p.emisor} ${(p.items||[]).map(i=>i.descripcion).join(' ')}`.toLowerCase().includes(q);
  const matchF = (f) => !q || `OC-${f.id} PM-${f.pedido_material_id} ${f.proveedor} ${f.estado}`.toLowerCase().includes(q);

  const pendientes = pedidos.filter(p => p.estado === 'generado').filter(matchP);
  const facturasFiltradas = facturas.filter(matchF);
  const totalFacturado = facturas.reduce((a, f) => a + (f.monto_total || 0), 0);

  const handleCargar = (p) => {
    setSelectedPm(p);
    setPdfFile(null);
    setMateriales((p.items || []).length > 0
      ? (p.items || []).map(it => ({ nombre: it.descripcion, proveedor: '', cantidad: it.cantidad, unidad: 'u', precio_unitario: 0 }))
      : [{ nombre: '', proveedor: '', cantidad: 1, unidad: 'u', precio_unitario: 0 }]);
  };

  const updateMat = (idx, field, val) => setMateriales(prev => prev.map((m,i) => i === idx ? {...m,[field]: val} : m));
  const total = materiales.reduce((a,m) => a + (parseFloat(m.cantidad||0) * parseFloat(m.precio_unitario||0)), 0);

  const handleSubmit = async () => {
    if (!selectedPm) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('pedido_material_id', selectedPm.id);
      fd.append('materiales', JSON.stringify(materiales.map(m => ({
        nombre: m.nombre,
        proveedor: m.proveedor,
        cantidad: parseFloat(m.cantidad),
        precio_unitario: parseFloat(m.precio_unitario),
        unidad_medida: m.unidad,
      }))));
      if (pdfFile) fd.append('pdf', pdfFile);
      await api.compras.registrarFactura(fd);
      await load();
      toast({ msg: `PM-${selectedPm.id} procesado — factura registrada` });
      setSelectedPm(null);
      setPdfFile(null);
      setMateriales([{ nombre: '', proveedor: '', cantidad: 1, unidad: 'u', precio_unitario: 0 }]);
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const OCDetalle = ({ oc }) => {
    const subtotal = (m) => parseFloat(m.cantidad || 0) * parseFloat(m.precio_unitario || 0);
    return (
      <div className="border-t border-zinc-700 bg-zinc-900/50 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              OC-{oc.id} — {oc.pedido_material_id ? `PM-${oc.pedido_material_id}` : 'Reposición'}
            </p>
            <EstadoBadge estado={oc.estado} />
          </div>
          <button onClick={() => setSelectedOC(null)} className="text-zinc-600 hover:text-zinc-300 p-0.5 rounded hover:bg-zinc-800">
            <Icon name="x" size={13} />
          </button>
        </div>
        <div className="border border-zinc-800 rounded-md overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-zinc-950/60 border-b border-zinc-800">
              <tr>
                {[['Insumo', null], ['Proveedor', null], ['Cant.', 72, 'center'], ['Unidad', 64, 'center'], ['Precio unit.', 110, 'right'], ['Subtotal', 110, 'right']].map(([h, w, a], i) => (
                  <th key={i} style={w ? { width: w } : undefined}
                    className={cx('font-mono text-[10px] uppercase tracking-[0.05em] text-zinc-500 font-semibold px-3 py-2',
                      a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left'
                    )}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(oc.materiales || []).map((m, i) => (
                <tr key={i} className="border-b border-zinc-800/50 last:border-0">
                  <td className="px-3 py-2 text-zinc-200">{m.nombre || '—'}</td>
                  <td className="px-3 py-2 text-zinc-400">{m.proveedor || '—'}</td>
                  <td className="px-3 py-2 text-center font-mono text-amber-400 font-semibold">{m.cantidad}</td>
                  <td className="px-3 py-2 text-center font-mono text-zinc-500">{m.unidad_medida}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-400">${parseFloat(m.precio_unitario || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-400 font-semibold">${subtotal(m).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {oc.ingreso && (
          <div className={cx(
            'mt-2.5 rounded-md border px-3 py-2.5',
            oc.ingreso.verificacion_estado === 'conforme'
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-rose-500/30 bg-rose-500/5',
          )}>
            <div className="flex items-center gap-2 mb-1">
              <span className={cx(
                'w-1.5 h-1.5 rounded-full',
                oc.ingreso.verificacion_estado === 'conforme' ? 'bg-emerald-400' : 'bg-rose-400',
              )} />
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Verificación Pañol — Ingreso #{oc.ingreso.id}
              </span>
              <span className={cx(
                'font-mono text-[10px] font-semibold',
                oc.ingreso.verificacion_estado === 'conforme' ? 'text-emerald-400' : 'text-rose-400',
              )}>
                {oc.ingreso.verificacion_estado === 'conforme' ? 'Conforme' : 'No conforme'}
              </span>
            </div>
            {oc.ingreso.verificacion_notas ? (
              <p className="text-xs text-zinc-300 leading-relaxed pl-3.5">{oc.ingreso.verificacion_notas}</p>
            ) : (
              <p className="text-[11px] text-zinc-600 italic pl-3.5">Sin observaciones registradas</p>
            )}
          </div>
        )}

        <div className="flex justify-between items-end mt-2.5 pr-1">
          <div>
            {oc.tiene_pdf ? (
              <button
                disabled={pdfLoadingId === oc.id}
                onClick={async () => {
                  setPdfLoadingId(oc.id);
                  try {
                    const blob = await api.compras.downloadFacturaPdf(oc.id);
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    setTimeout(() => URL.revokeObjectURL(url), 30000);
                  } catch (e) {
                    toast({ type: 'error', msg: e.message });
                  } finally {
                    setPdfLoadingId(null);
                  }
                }}
                className={cx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
                  pdfLoadingId === oc.id
                    ? 'bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20',
                )}
              >
                <Icon name="upload" size={12} />
                {pdfLoadingId === oc.id ? 'Abriendo factura...' : 'Abrir factura PDF'}
              </button>
            ) : (
              <span className="text-[11px] text-zinc-600 italic">Sin factura adjunta</span>
            )}
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">Total OC</div>
            <div className="font-mono text-lg font-bold text-emerald-400">${Number(oc.monto_total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div>
      <ModuleHeader module="compras" subtitle="Cargando..." />
      <div className="px-4 sm:px-7 py-10 text-zinc-500 text-sm">Cargando datos...</div>
    </div>
  );

  return (
    <div>
      <ModuleHeader module="compras" subtitle="Procesar pedidos de material y registrar órdenes de compra" actions={
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">
            <Icon name="search" size={13} />
          </span>
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar PM u OC..."
            className="h-10 sm:h-8 pl-8 pr-3 w-full sm:w-52 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
          />
        </div>
      } />

      <div className="px-4 sm:px-7 pt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="PMs pendientes" value={pendientes.length} icon="alert" accent="amber" />
        <Metric label="PMs procesados" value={pedidos.filter(p => p.estado !== 'generado').length} icon="check-circle" accent="emerald" />
        <Metric label="OCs registradas" value={facturas.length} icon="file-text" accent="blue" />
        <Metric label="Total compras" value={`$${(totalFacturado/1000).toFixed(0)}k`} sub="ARS acumulado" icon="wallet" accent="emerald" />
      </div>

      <div className="px-4 sm:px-7 py-5 space-y-4">
        <div>
          <SectionLabel>Pedidos de material pendientes</SectionLabel>
          {pendientes.length === 0 ? (
            <Card><EmptyState icon="check-circle" msg="Sin pedidos pendientes" /></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendientes.map(p => (
                <Card key={p.id} className={cx('p-4 transition-colors', selectedPm?.id === p.id && 'border-amber-500 ring-1 ring-amber-500/40')}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-zinc-200">PM-{p.id}</span>
                      <span className="font-mono text-xs text-zinc-500">OF-{p.of_id}</span>
                    </div>
                    <EstadoBadge estado={p.estado} />
                  </div>
                  <div className="text-xs text-zinc-500 mb-1">Emisor: <span className="text-zinc-300">{p.emisor}</span></div>
                  <div className="text-xs text-zinc-500 mb-3">Equipo: <span className="text-zinc-300">{p.equipo || '—'}</span></div>
                  <div className="bg-zinc-950/60 border border-zinc-800 rounded-md p-2.5 mb-3">
                    <div className="font-mono text-[9px] uppercase tracking-wider text-zinc-600 mb-1.5 font-semibold">Ítems</div>
                    {(p.items || []).map((it, i) => (
                      <div key={i} className="text-[11px] text-zinc-300 truncate">
                        <span className="font-mono text-amber-400">{it.cantidad}</span> — {it.descripcion}
                      </div>
                    ))}
                    {(!p.items || p.items.length === 0) && <div className="text-[11px] text-zinc-600">Sin ítems</div>}
                  </div>
                  {!readonly && (
                    <Button onClick={() => handleCargar(p)} accent="amber" size="sm" className="w-full" icon={selectedPm?.id === p.id ? 'check' : 'arrow-down'}>
                      {selectedPm?.id === p.id ? 'Cargado' : 'Procesar PM'}
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        <Card>
          <CardHeader actions={selectedPm && <Badge accent="amber">PM-{selectedPm.id}</Badge>}>
            <CardTitle>Procesar pedido de material</CardTitle>
          </CardHeader>
          <div className="p-5 space-y-3">
            <div className="border border-zinc-800 rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/60 border-b border-zinc-800">
                  <tr>
                    {[['#',32,'center'],['Insumo',null],['Proveedor',null],['Cant.',64,'center'],['Ud.',60],['Precio unit.',110,'right'],['Subtotal',110,'right'],['',32]].map(([h,w,a],i) => (
                      <th key={i} style={w ? {width: w} : undefined} className={cx('font-mono text-[10px] uppercase tracking-[0.05em] text-zinc-500 font-semibold px-2.5 py-2', a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {materiales.map((m, idx) => (
                    <tr key={idx} className="border-b border-zinc-800/60 hover:bg-zinc-800/30">
                      <td className="text-center font-mono text-xs text-zinc-600 px-1 py-1">{idx+1}</td>
                      <td className="px-1 py-1"><input value={m.nombre} onChange={e => updateMat(idx,'nombre',e.target.value)} placeholder="Insumo..." className="w-full bg-transparent border border-transparent hover:border-zinc-800 focus:border-amber-500 focus:outline-none rounded px-1.5 py-1 text-xs text-zinc-200" /></td>
                      <td className="px-1 py-1"><input value={m.proveedor} onChange={e => updateMat(idx,'proveedor',e.target.value)} placeholder="Proveedor..." className="w-full bg-transparent border border-transparent hover:border-zinc-800 focus:border-amber-500 focus:outline-none rounded px-1.5 py-1 text-xs text-zinc-200" /></td>
                      <td className="px-1 py-1"><input type="number" value={m.cantidad} onChange={e => updateMat(idx,'cantidad',e.target.value)} className="w-full bg-transparent border border-transparent hover:border-zinc-800 focus:border-amber-500 focus:outline-none rounded px-1.5 py-1 text-xs text-zinc-200 text-center font-mono" /></td>
                      <td className="px-1 py-1">
                        <select value={m.unidad} onChange={e => updateMat(idx,'unidad',e.target.value)} className="w-full bg-transparent border border-transparent hover:border-zinc-800 focus:border-amber-500 rounded px-1.5 py-1 text-xs text-zinc-200">
                          {['u','m','kg','L','m²'].map(u => <option key={u} value={u} className="bg-zinc-900">{u}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1"><input type="number" value={m.precio_unitario} onChange={e => updateMat(idx,'precio_unitario',e.target.value)} className="w-full bg-transparent border border-transparent hover:border-zinc-800 focus:border-amber-500 focus:outline-none rounded px-1.5 py-1 text-xs text-zinc-200 text-right font-mono" /></td>
                      <td className="px-2.5 py-1 text-right font-mono text-xs text-emerald-400">${(parseFloat(m.cantidad||0) * parseFloat(m.precio_unitario||0)).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                      <td className="px-1 py-1 text-center"><button onClick={() => setMateriales(p => p.length <= 1 ? p : p.filter((_,i) => i !== idx))} disabled={materiales.length <= 1} className="text-zinc-600 hover:text-rose-400 disabled:opacity-20"><Icon name="x" size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center">
              <button onClick={() => setMateriales(p => [...p, { nombre: '', proveedor: '', cantidad: 1, unidad: 'u', precio_unitario: 0 }])} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md border border-dashed border-zinc-800 text-xs text-zinc-400 hover:border-amber-500/60 hover:text-amber-400 transition-colors">
                <Icon name="plus" size={12} />Agregar fila
              </button>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">Total estimado</div>
                  <div className="font-mono text-xl font-bold text-emerald-400">${total.toLocaleString('es-AR', {minimumFractionDigits: 2})}</div>
                </div>
                {!readonly && (
                  <Button onClick={handleSubmit} disabled={!selectedPm || saving} accent="amber" icon="check">
                    {saving ? 'Guardando...' : 'Confirmar OC'}
                  </Button>
                )}
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-3">
              <label className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 block">
                Factura PDF <span className="normal-case text-zinc-600 ml-1">(opcional)</span>
              </label>
              <label className={cx(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-md border cursor-pointer transition-colors w-fit',
                pdfFile
                  ? 'border-amber-500/50 bg-amber-500/5 text-amber-400'
                  : 'border-dashed border-zinc-700 text-zinc-500 hover:border-amber-500/50 hover:text-amber-400',
              )}>
                <Icon name="upload" size={13} />
                <span className="text-xs">{pdfFile ? pdfFile.name : 'Adjuntar factura...'}</span>
                {pdfFile && (
                  <button
                    onClick={e => { e.preventDefault(); setPdfFile(null); }}
                    className="ml-1 text-zinc-500 hover:text-rose-400"
                  >
                    <Icon name="x" size={12} />
                  </button>
                )}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={e => setPdfFile(e.target.files[0] || null)}
                />
              </label>
            </div>
          </div>
        </Card>

        {facturasFiltradas.length > 0 && (
          <Card>
            <CardHeader><CardTitle hint={facturasFiltradas.length}>Historial de OCs</CardTitle></CardHeader>
            <DataTable
              data={facturasFiltradas}
              columns={[
                { key: 'id', label: 'OC', mono: true, sortable: true, cell: r => <span className="font-mono font-bold text-zinc-200">OC-{r.id}</span> },
                { key: 'pedido_material_id', label: 'PM', mono: true, cell: r => r.pedido_material_id
                  ? <span className="text-zinc-500">PM-{r.pedido_material_id}</span>
                  : <span className="text-rose-400 text-[10px] font-semibold font-mono">Reposición</span>
                },
                { key: 'proveedor', label: 'Proveedor', sortable: true, cell: r => <span>{r.proveedor || r.materiales?.[0]?.proveedor || '—'}</span> },
                { key: 'items', label: 'Ítems', mono: true, align: 'center', cell: r => <span className="font-mono text-zinc-400">{r.materiales?.length || 0}</span> },
                { key: 'monto', label: 'Total', mono: true, align: 'right', sortable: true, accessor: r => r.monto_total, cell: r => <span className="text-emerald-400 font-bold">${Number(r.monto_total||0).toLocaleString('es-AR',{minimumFractionDigits:2})}</span> },
                { key: 'estado', label: 'Estado', cell: r => <EstadoBadge estado={r.estado} /> },
              ]}
              onRowClick={row => setSelectedOC(prev => prev?.id === row.id ? null : row)}
              selectedId={selectedOC?.id}
              renderExpanded={row => <OCDetalle oc={row} />}
            />
          </Card>
        )}
      </div>
    </div>
  );
}
