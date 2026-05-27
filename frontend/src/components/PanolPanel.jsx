import React from 'react';
import { api } from '../api';
import {
  cx, Icon, Button, Input, Select, Field,
  Badge, Card, CardHeader, CardTitle,
  Metric, useToast, Tabs, useSearchShortcut,
  EmptyState, DataTable, ModuleHeader, MasterDetail,
} from './primitives';
import { useSharedArticulos, ArticuloForm, V2_EMPTY_ARTICULO, articuloIsValid } from '../contexts/ArticulosContext';
import { usePermissions } from '../contexts/PermissionsContext';

export default function PanolPanel() {
  const { isReadonly } = usePermissions();
  const readonly = isReadonly('panol');
  const { articulos, create: createArticulo } = useSharedArticulos();
  const [stock, setStock] = React.useState({});
  const [ingresos, setIngresos] = React.useState([]);
  const [movimientos, setMovimientos] = React.useState([]);
  const [facturasPendientes, setFacturasPendientes] = React.useState([]);
  const [ofsAprobadas, setOfsAprobadas] = React.useState([]);
  const [tab, setTab] = React.useState('stock');
  const [tipoMov, setTipoMov] = React.useState('ingreso');
  // ingreso form
  const [facturaId, setFacturaId] = React.useState('');
  const [verificacion, setVerificacion] = React.useState('conforme');
  const [notasVerif, setNotasVerif] = React.useState('');
  const [faltantesQty, setFaltantesQty] = React.useState({});
  // despacho form
  const [ofId, setOfId] = React.useState('');
  const [matItems, setMatItems] = React.useState([{ nombre: '', cantidad: '' }]);
  const [ofMateriales, setOfMateriales] = React.useState([]);
  const [ofMatLoading, setOfMatLoading] = React.useState(false);
  // catalogo
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const [artForm, setArtForm] = React.useState({ ...V2_EMPTY_ARTICULO });
  const [artFilter, setArtFilter] = React.useState('');
  const [stockSearch, setStockSearch] = React.useState('');
  const [selectedMov, setSelectedMov] = React.useState(null);
  const [movsFilter, setMovsFilter] = React.useState('stock');
  const stockSearchRef = React.useRef(null);
  useSearchShortcut(stockSearchRef, () => setStockSearch(''));
  const [saving, setSaving] = React.useState(false);

  // 1/2 → tabs; I/D → modo ingreso/despacho
  React.useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName?.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) return;
      if (e.key === '1') setTab('stock');
      else if (e.key === '2') setTab('catalogo');
      else if (e.key === 'i') setTipoMov('ingreso');
      else if (e.key === 'd') setTipoMov('despacho');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  const toast = useToast();

  const load = React.useCallback(async () => {
    try {
      const [stockData, ingresosData, movsData, facturasData, ofsData] = await Promise.all([
        api.panol.getStock(),
        api.panol.getIngresos(),
        api.panol.getMovimientos(),
        api.compras.getFacturas(),
        api.desarrollo.getOFsDisponibles(),
      ]);
      setStock(stockData);
      setIngresos(ingresosData);
      setMovimientos(movsData);
      setFacturasPendientes(facturasData.filter(f => f.estado === 'registrada'));
      setOfsAprobadas(ofsData);
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    if (!ofId) { setOfMateriales([]); setMatItems([{ nombre: '', cantidad: '' }]); return; }
    setOfMatLoading(true);
    api.panol.getMaterialesOf(ofId)
      .then(data => {
        setOfMateriales(data);
        if (data.length > 0) {
          setMatItems(data.map(m => ({ nombre: m.nombre, cantidad: String(m.cantidad) })));
        }
      })
      .catch(() => setOfMateriales([]))
      .finally(() => setOfMatLoading(false));
  }, [ofId]); // eslint-disable-line react-hooks/exhaustive-deps

  const stockRows = Object.entries(stock).map(([material, stock_actual], i) => {
    const ultimoIngreso = [...ingresos]
      .sort((a, b) => b.id - a.id)
      .find(ing => (ing.materiales || []).some(m => m.nombre === material));
    return {
      id: i + 1,
      material,
      stock_actual,
      oc_id:         ultimoIngreso ? ultimoIngreso.factura_id : null,
      fecha_ingreso: ultimoIngreso ? ultimoIngreso.created_at : null,
    };
  });

  const handleRegistrarIngreso = async () => {
    if (!facturaId) return;
    setSaving(true);
    try {
      const facturaSeleccionada = facturasPendientes.find(f => String(f.id) === String(facturaId));
      const faltantes = verificacion === 'no_conforme'
        ? (facturaSeleccionada?.materiales || [])
            .map((m, i) => ({ ...m, cantidad: parseFloat(faltantesQty[i] || 0) }))
            .filter(m => m.cantidad > 0)
        : [];
      const result = await api.panol.registrarIngreso({
        factura_id: parseInt(facturaId),
        verificacion_estado: verificacion,
        verificacion_notas: notasVerif,
        faltantes,
      });
      setStock(result.stock_actualizado || stock);
      await load();
      const msg = result.nueva_oc_id
        ? `No conforme — OC-${result.nueva_oc_id} de reposición generada en Compras`
        : verificacion === 'conforme' ? 'Ingreso conforme — stock actualizado' : 'No conforme registrado — stock sin cambios';
      toast({ msg, type: result.nueva_oc_id ? 'warning' : undefined });
      setFacturaId('');
      setNotasVerif('');
      setVerificacion('conforme');
      setFaltantesQty({});
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDespachar = async () => {
    if (!ofId) return;
    const items = matItems.filter(it => it.nombre && it.cantidad);
    if (items.length === 0) return;
    setSaving(true);
    try {
      const result = await api.panol.despacharProduccion({
        of_id: parseInt(ofId),
        materiales: items.map(it => ({ nombre: it.nombre, cantidad: parseFloat(it.cantidad) })),
      });
      setStock(result.stock_actualizado || stock);
      await load();
      toast({ msg: `Materiales despachados a Producción — OF-${ofId}` });
      setOfId('');
      setMatItems([{ nombre: '', cantidad: '' }]);
      setOfMateriales([]);
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleCrearArticulo = async () => {
    if (!articuloIsValid(artForm)) return;
    setSaving(true);
    try {
      const a = await createArticulo(artForm);
      toast({ msg: `Artículo "${a.nombre}" creado en el catálogo` });
      setArtForm({ ...V2_EMPTY_ARTICULO });
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const filteredArts = articulos.filter(a =>
    !artFilter || a.nombre.toLowerCase().includes(artFilter.toLowerCase())
  );

  const sq = stockSearch.toLowerCase();
  const stockRowsFiltrados = stockRows.filter(r => !sq || [
    r.material,
    r.oc_id ? `OC-${r.oc_id}` : '',
    r.fecha_ingreso ? r.fecha_ingreso.slice(0, 10) : '',
  ].join(' ').toLowerCase().includes(sq));
  const ingresosRows = ingresos
    .map(i => ({ _tipo: 'ingreso', ...i, id: `i-${i.id}` }))
    .filter(r => !sq || `OC-${r.factura_id} ${(r.materiales||[]).map(m=>m.nombre).join(' ')} ${r.verificacion_estado}`.toLowerCase().includes(sq));

  const despachosRows = movimientos
    .map(m => ({ _tipo: 'despacho', ...m, id: `m-${m.id}` }))
    .filter(r => !sq || `OF-${r.of_id} ${(r.materiales||[]).map(m=>m.nombre).join(' ')} ${r.estado}`.toLowerCase().includes(sq));

  const MovimientoDetalle = ({ row }) => (
    <div className="border-t border-zinc-700 bg-zinc-900/50 px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {row._tipo === 'ingreso' ? (
            <>
              <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Ingreso #{row.factura_id} · OC-{row.factura_id}
              </p>
              <span className={cx(
                'font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded',
                row.verificacion_estado === 'conforme'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-rose-500/15 text-rose-400',
              )}>
                {row.verificacion_estado === 'conforme' ? 'Conforme' : 'No conforme'}
              </span>
            </>
          ) : (
            <>
              <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Despacho a Producción · OF-{row.of_id}
              </p>
              <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">
                {row.estado}
              </span>
            </>
          )}
        </div>
        <button onClick={() => setSelectedMov(null)} className="text-zinc-600 hover:text-zinc-300 p-0.5 rounded hover:bg-zinc-800">
          <Icon name="x" size={13} />
        </button>
      </div>

      <div className="border border-zinc-800 rounded-md overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-zinc-950/60 border-b border-zinc-800">
            <tr>
              <th className="font-mono text-[10px] uppercase tracking-[0.05em] text-zinc-500 font-semibold px-3 py-2 text-left">Material</th>
              <th className="font-mono text-[10px] uppercase tracking-[0.05em] text-zinc-500 font-semibold px-3 py-2 text-center w-24">Cantidad</th>
              {row._tipo === 'ingreso' && (
                <th className="font-mono text-[10px] uppercase tracking-[0.05em] text-zinc-500 font-semibold px-3 py-2 text-right w-32">Precio unit.</th>
              )}
            </tr>
          </thead>
          <tbody>
            {(row.materiales || []).map((m, i) => (
              <tr key={i} className="border-b border-zinc-800/50 last:border-0">
                <td className="px-3 py-2 text-zinc-200 font-medium">{m.nombre}</td>
                <td className="px-3 py-2 text-center font-mono font-semibold text-emerald-400">{m.cantidad}</td>
                {row._tipo === 'ingreso' && (
                  <td className="px-3 py-2 text-right font-mono text-zinc-400">
                    {m.precio_unitario != null ? `$${parseFloat(m.precio_unitario).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {row._tipo === 'ingreso' && row.verificacion_notas && (
        <div className="mt-2.5 rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Observaciones</p>
          <p className="text-xs text-zinc-300 leading-relaxed">{row.verificacion_notas}</p>
        </div>
      )}
    </div>
  );

  const updateMatItem = (idx, field, val) => setMatItems(prev => prev.map((it,i) => i === idx ? {...it,[field]:val} : it));

  return (
    <div>
      <ModuleHeader module="panol" subtitle="Stock de materiales, ingresos y despachos a producción" actions={
        tab === 'stock' ? (
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">
              <Icon name="search" size={13} />
            </span>
            <input
              ref={stockSearchRef}
              value={stockSearch}
              onChange={e => setStockSearch(e.target.value)}
              placeholder="Buscar material..."
              className="h-10 sm:h-8 pl-8 pr-3 w-full sm:w-52 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
            />
          </div>
        ) : null
      } />

      <div className="px-4 sm:px-7 pt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Materiales en stock" value={stockRows.length} icon="package" accent="emerald" />
        <Metric label="Facturas a ingresar" value={facturasPendientes.length} sub="Pendientes de verificación" icon="alert" accent="amber" />
        <Metric label="Ingresos registrados" value={ingresos.length} icon="arrow-up" accent="emerald" />
        <Metric label="Despachos producción" value={movimientos.length} icon="arrow-down" accent="amber" />
      </div>

      <div className="px-4 sm:px-7 pt-4">
        <Tabs value={tab} onChange={setTab} accent="emerald" items={[
          { value: 'stock',    label: 'Stock & movimientos' },
          { value: 'catalogo', label: `Catálogo (${articulos.length})` },
        ]} />
      </div>

      {tab === 'stock' && (
        <div className="px-4 sm:px-7 py-5">
         <MasterDetail
          listWidth="340px"
          listSide="right"
          stack
          hasSelection={false}
          onBack={() => setSelectedMov(null)}
          backLabel="Stock"
          list={
          <div className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle hint={
                  movsFilter === 'stock' ? stockRowsFiltrados.length :
                  movsFilter === 'ingresos' ? ingresosRows.length :
                  despachosRows.length
                }>
                  {movsFilter === 'stock' ? 'Stock actual' :
                   movsFilter === 'ingresos' ? 'Ingresos de material' :
                   'Despachos a producción'}
                </CardTitle>
              </CardHeader>

              <div className="px-3 py-2 border-b border-zinc-800">
                <Tabs value={movsFilter} onChange={setMovsFilter} accent="emerald" items={[
                  { value: 'stock',    label: 'Stock',    count: stockRowsFiltrados.length },
                  { value: 'ingresos', label: 'Ingresos', count: ingresosRows.length },
                  { value: 'despachos', label: 'Despachos', count: despachosRows.length },
                ]} />
              </div>

              <div className="max-h-[50vh] lg:max-h-[480px] overflow-y-auto">
                {movsFilter === 'stock' && (
                  stockRowsFiltrados.length === 0
                    ? <EmptyState icon="package" msg={stockSearch ? 'Sin resultados' : 'Sin materiales en stock'} hint={stockSearch ? 'Probá otro término' : 'Registrá un ingreso de factura para cargar stock'} />
                    : <DataTable
                        data={stockRowsFiltrados}
                        columns={[
                          { key: 'material', label: 'Material', sortable: true, cell: r => <span className="text-zinc-200 font-medium">{r.material}</span> },
                          { key: 'oc_id', label: 'Último OC', sortable: true, accessor: r => r.oc_id || 0, cell: r => r.oc_id
                            ? <span className="font-mono text-xs text-zinc-400">OC-{r.oc_id}</span>
                            : <span className="text-zinc-600 text-xs">—</span>
                          },
                          { key: 'fecha_ingreso', label: 'Fecha ingreso', sortable: true, accessor: r => r.fecha_ingreso || '', cell: r => r.fecha_ingreso
                            ? <span className="font-mono text-xs text-zinc-400">{r.fecha_ingreso.slice(0,10)}</span>
                            : <span className="text-zinc-600 text-xs">—</span>
                          },
                          { key: 'stock_actual', label: 'Stock', sortable: true, mono: true, align: 'right',
                            cell: r => <span className="font-mono font-bold text-base text-emerald-400">{r.stock_actual}</span> },
                        ]}
                      />
                )}

                {movsFilter === 'ingresos' && (
                  ingresosRows.length === 0
                    ? <EmptyState icon="arrow-up" msg={stockSearch ? 'Sin resultados' : 'Sin ingresos registrados'} hint={stockSearch ? 'Probá otro término' : 'Registrá un ingreso de factura'} />
                    : <DataTable
                        data={ingresosRows}
                        onRowClick={row => setSelectedMov(prev => prev === row.id ? null : row.id)}
                        selectedId={selectedMov}
                        renderExpanded={row => <MovimientoDetalle row={row} />}
                        columns={[
                          { key: 'factura_id', label: 'OC', sortable: true, accessor: r => r.factura_id || 0,
                            cell: r => <span className="font-mono text-xs text-zinc-300">OC-{r.factura_id}</span> },
                          { key: 'created_at', label: 'Fecha', sortable: true, accessor: r => r.created_at || '',
                            cell: r => <span className="font-mono text-xs text-zinc-500">{r.created_at ? r.created_at.slice(0,10) : '—'}</span> },
                          { key: 'materiales', label: 'Materiales', sortable: true, accessor: r => (r.materiales||[])[0]?.nombre || '',
                            cell: r => {
                              const mats = r.materiales || [];
                              return <span className="text-zinc-400 text-xs">{mats.slice(0,2).map(m => m.nombre).join(', ')}{mats.length > 2 ? ` +${mats.length-2}` : ''}</span>;
                            }},
                          { key: 'items', label: 'Ítems', sortable: true, mono: true, align: 'center', accessor: r => (r.materiales||[]).length,
                            cell: r => <span className="font-mono text-zinc-500">{(r.materiales||[]).length}</span> },
                          { key: 'verificacion_estado', label: 'Estado', sortable: true, accessor: r => r.verificacion_estado || '',
                            cell: r => (
                              <span className={cx('text-xs font-mono', r.verificacion_estado === 'conforme' ? 'text-emerald-400' : 'text-rose-400')}>
                                {r.verificacion_estado === 'conforme' ? 'Conforme' : 'No conforme'}
                              </span>
                            )},
                        ]}
                      />
                )}

                {movsFilter === 'despachos' && (
                  despachosRows.length === 0
                    ? <EmptyState icon="arrow-down" msg={stockSearch ? 'Sin resultados' : 'Sin despachos registrados'} hint={stockSearch ? 'Probá otro término' : 'Despachá materiales a una OF aprobada'} />
                    : <DataTable
                        data={despachosRows}
                        onRowClick={row => setSelectedMov(prev => prev === row.id ? null : row.id)}
                        selectedId={selectedMov}
                        renderExpanded={row => <MovimientoDetalle row={row} />}
                        columns={[
                          { key: 'of_id', label: 'OF', sortable: true, accessor: r => r.of_id || 0,
                            cell: r => <span className="font-mono text-xs text-zinc-300">OF-{r.of_id}</span> },
                          { key: 'created_at', label: 'Fecha', sortable: true, accessor: r => r.created_at || '',
                            cell: r => <span className="font-mono text-xs text-zinc-500">{r.created_at ? r.created_at.slice(0,10) : '—'}</span> },
                          { key: 'materiales', label: 'Materiales', sortable: true, accessor: r => (r.materiales||[])[0]?.nombre || '',
                            cell: r => {
                              const mats = r.materiales || [];
                              return <span className="text-zinc-400 text-xs">{mats.slice(0,2).map(m => m.nombre).join(', ')}{mats.length > 2 ? ` +${mats.length-2}` : ''}</span>;
                            }},
                          { key: 'items', label: 'Ítems', sortable: true, mono: true, align: 'center', accessor: r => (r.materiales||[]).length,
                            cell: r => <span className="font-mono text-zinc-500">{(r.materiales||[]).length}</span> },
                          { key: 'estado', label: 'Estado', sortable: true, accessor: r => r.estado || '',
                            cell: r => <span className="text-xs font-mono text-blue-400">{r.estado}</span> },
                        ]}
                      />
                )}
              </div>
            </Card>
          </div>
          }
          detail={
          <Card className="sticky top-[88px]">
            <CardHeader><CardTitle>Registrar movimiento</CardTitle></CardHeader>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[['ingreso','Ingreso','emerald'],['despacho','Despacho Prod.','amber']].map(([val, label, color]) => (
                  <button
                    key={val}
                    onClick={() => setTipoMov(val)}
                    className={cx(
                      'h-10 rounded-md text-xs font-semibold transition-all border',
                      tipoMov === val
                        ? color === 'emerald'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                          : 'bg-amber-500/15 border-amber-500 text-amber-300'
                        : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300',
                    )}
                  >{label}</button>
                ))}
              </div>

              {tipoMov === 'ingreso' && (() => {
                const facturaSeleccionada = facturasPendientes.find(f => String(f.id) === String(facturaId));
                return (
                <>
                  <Field label="Factura de compra" required>
                    <select
                      value={facturaId}
                      onChange={e => { setFacturaId(e.target.value); setFaltantesQty({}); }}
                      className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-900 text-xs text-zinc-200 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                    >
                      <option value="">Seleccioná factura...</option>
                      {facturasPendientes.map(f => (
                        <option key={f.id} value={f.id}>OC-{f.id} · PM-{f.pedido_material_id} · ${Number(f.monto_total||0).toLocaleString('es-AR')}</option>
                      ))}
                    </select>
                    {facturasPendientes.length === 0 && <p className="text-[11px] text-zinc-500 mt-1">Sin facturas pendientes de ingreso</p>}
                  </Field>

                  {facturaSeleccionada && (
                    <div className="rounded-md border border-zinc-800 bg-zinc-950/60 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                          Detalle OC-{facturaSeleccionada.id}
                        </span>
                        {facturaSeleccionada.tiene_pdf && (
                          <button
                            disabled={pdfLoading}
                            onClick={async () => {
                              setPdfLoading(true);
                              try {
                                const blob = await api.compras.downloadFacturaPdf(facturaSeleccionada.id);
                                const url = URL.createObjectURL(blob);
                                window.open(url, '_blank');
                                setTimeout(() => URL.revokeObjectURL(url), 30000);
                              } catch (e) {
                                toast({ type: 'error', msg: e.message });
                              } finally {
                                setPdfLoading(false);
                              }
                            }}
                            className={cx(
                              'flex items-center gap-1 text-[11px] transition-colors cursor-pointer',
                              pdfLoading
                                ? 'text-zinc-500 cursor-not-allowed'
                                : 'text-amber-400 hover:text-amber-300',
                            )}
                          >
                            <Icon name="upload" size={11} />
                            {pdfLoading ? 'Abriendo...' : 'Ver PDF'}
                          </button>
                        )}
                      </div>
                      <div className="divide-y divide-zinc-800/60">
                        {(facturaSeleccionada.materiales || []).map((m, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-xs text-zinc-200 font-medium truncate">{m.nombre}</p>
                              <p className="text-[11px] text-zinc-500 truncate">{m.proveedor || 'Sin proveedor'}</p>
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              <p className="font-mono text-xs text-emerald-400 font-semibold">{m.cantidad} {m.unidad_medida}</p>
                              <p className="font-mono text-[11px] text-zinc-500">${parseFloat(m.precio_unitario||0).toLocaleString('es-AR',{minimumFractionDigits:2})}/u</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center px-3 py-2 border-t border-zinc-800 bg-zinc-900/40">
                        <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-wider">Total OC</span>
                        <span className="font-mono text-sm font-bold text-emerald-400">${Number(facturaSeleccionada.monto_total||0).toLocaleString('es-AR',{minimumFractionDigits:2})}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {[['conforme','Conforme','emerald'],['no_conforme','No conforme','rose']].map(([val, label, color]) => (
                      <button
                        key={val}
                        onClick={() => { setVerificacion(val); setFaltantesQty({}); }}
                        className={cx(
                          'h-9 rounded-md text-xs font-semibold transition-all border',
                          verificacion === val
                            ? color === 'emerald' ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300' : 'bg-rose-500/15 border-rose-500 text-rose-300'
                            : 'border-zinc-800 text-zinc-500 hover:border-zinc-700',
                        )}
                      >{label}</button>
                    ))}
                  </div>

                  {verificacion === 'no_conforme' && facturaSeleccionada && (
                    <div className="rounded-md border border-rose-500/30 bg-rose-500/5 overflow-hidden">
                      <div className="px-3 py-2 border-b border-rose-500/20">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-rose-400">Especificá los faltantes</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Ingresá la cantidad faltante por ítem (0 = recibido)</p>
                      </div>
                      <div className="divide-y divide-zinc-800/50">
                        {(facturaSeleccionada.materiales || []).map((m, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-zinc-200 truncate">{m.nombre}</p>
                              <p className="text-[11px] text-zinc-500 font-mono">pedido: {m.cantidad} {m.unidad_medida}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[11px] text-zinc-600">faltante:</span>
                              <input
                                type="number"
                                min="0"
                                max={m.cantidad}
                                value={faltantesQty[i] ?? ''}
                                onChange={e => setFaltantesQty(prev => ({ ...prev, [i]: e.target.value }))}
                                placeholder="0"
                                className="w-16 h-7 rounded border border-zinc-700 bg-zinc-900 text-xs text-rose-300 font-mono text-center focus:outline-none focus:border-rose-500"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Field label="Notas de verificación">
                    <Input value={notasVerif} onChange={e => setNotasVerif(e.target.value)} placeholder="Observaciones..." />
                  </Field>

                  {!readonly && (
                    <Button onClick={handleRegistrarIngreso} disabled={!facturaId || saving} accent="emerald" className="w-full" icon="check">
                      {saving ? 'Registrando...' : 'Registrar ingreso'}
                    </Button>
                  )}
                </>
                );
              })()}

              {tipoMov === 'despacho' && (
                <>
                  <Field label="Orden de fabricación" required>
                    <Select
                      value={ofId}
                      onChange={e => setOfId(e.target.value)}
                      options={[{value:'',label:'Seleccioná OF...'}, ...ofsAprobadas.map(o => ({value: o.id, label: `OF-${o.id} — ${o.cliente}`}))]}
                    />
                  </Field>

                  {ofMatLoading && (
                    <p className="text-[11px] text-zinc-500 font-mono">Cargando materiales...</p>
                  )}

                  {ofId && !ofMatLoading && ofMateriales.length === 0 && (
                    <p className="text-[11px] text-zinc-500 italic">Sin materiales ingresados al stock para esta OF.</p>
                  )}

                  {ofMateriales.length > 0 && (
                    <div className="rounded-md border border-zinc-800 overflow-hidden">
                      <div className="px-3 py-1.5 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Materiales solicitados</span>
                        <span className="font-mono text-[10px] text-zinc-600">
                          {ofMateriales.filter(m => m.stock_actual >= m.cantidad).length}/{ofMateriales.length} con stock
                        </span>
                      </div>
                      <div className="divide-y divide-zinc-800/60">
                        {ofMateriales.map((m, idx) => {
                          const hayStock = m.stock_actual >= m.cantidad;
                          return (
                            <div key={idx} className={cx(
                              'flex items-center justify-between px-3 py-2',
                              hayStock ? 'bg-emerald-500/5' : 'bg-rose-500/5',
                            )}>
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={cx('w-1.5 h-1.5 rounded-full shrink-0', hayStock ? 'bg-emerald-400' : 'bg-rose-400')} />
                                <span className="text-xs text-zinc-200 truncate">{m.nombre}</span>
                              </div>
                              <div className="shrink-0 ml-2 text-right">
                                <span className={cx('font-mono text-xs font-semibold', hayStock ? 'text-emerald-400' : 'text-rose-400')}>
                                  {m.stock_actual}
                                </span>
                                <span className="font-mono text-[10px] text-zinc-600"> / {m.cantidad} {m.unidad}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Materiales a despachar</div>
                    {matItems.map((it, idx) => (
                      <div key={idx} className="flex gap-1.5 items-center">
                        <input
                          value={it.nombre}
                          onChange={e => updateMatItem(idx,'nombre',e.target.value)}
                          placeholder="Nombre del material..."
                          list="panol-stock-list"
                          className="flex-1 h-8 rounded-md border border-zinc-800 bg-zinc-900 text-xs text-zinc-200 px-2.5 focus:outline-none focus:border-amber-500"
                        />
                        <input
                          type="number"
                          value={it.cantidad}
                          onChange={e => updateMatItem(idx,'cantidad',e.target.value)}
                          placeholder="Cant."
                          className="w-16 h-8 rounded-md border border-zinc-800 bg-zinc-900 text-xs text-zinc-200 px-2 text-center focus:outline-none focus:border-amber-500"
                        />
                        <button onClick={() => setMatItems(p => p.length <= 1 ? p : p.filter((_,i)=>i!==idx))} disabled={matItems.length <= 1} className="text-zinc-600 hover:text-rose-400 disabled:opacity-20 px-1">
                          <Icon name="x" size={13} />
                        </button>
                      </div>
                    ))}
                    <datalist id="panol-stock-list">
                      {Object.keys(stock).map(n => <option key={n} value={n} />)}
                    </datalist>
                    <button onClick={() => setMatItems(p => [...p, {nombre:'',cantidad:''}])} className="text-xs text-zinc-500 hover:text-amber-400 flex items-center gap-1 transition-colors">
                      <Icon name="plus" size={12} /> Agregar material
                    </button>
                  </div>

                  {!readonly && (
                    <Button onClick={handleDespachar} disabled={!ofId || matItems.every(it => !it.nombre || !it.cantidad) || saving} accent="amber" className="w-full" icon="arrow-down">
                      {saving ? 'Despachando...' : 'Despachar a Producción'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </Card>
          }
         />
        </div>
      )}

      {tab === 'catalogo' && (
        <div className="px-4 sm:px-7 py-5">
         <MasterDetail
          listWidth="360px"
          listSide="right"
          stack
          hasSelection={false}
          onBack={() => {}}
          backLabel="Catálogo"
          list={
          <Card>
            <CardHeader actions={
              <Input value={artFilter} onChange={e => setArtFilter(e.target.value)} placeholder="Buscar artículo..." />
            }>
              <CardTitle hint={filteredArts.length}>Catálogo de artículos</CardTitle>
            </CardHeader>
            {filteredArts.length === 0 ? (
              <EmptyState icon="package" msg="Sin artículos" hint={artFilter ? 'Probá ajustar el filtro' : 'Creá el primer artículo del catálogo'} />
            ) : (
              <DataTable
                data={filteredArts}
                columns={[
                  { key: 'id', label: 'ID', mono: true, width: 60, cell: r => <span className="font-mono text-xs text-zinc-600">ART-{String(r.id).padStart(3,'0')}</span> },
                  { key: 'nombre', label: 'Nombre', sortable: true, cell: r => <span className="text-zinc-200 font-medium">{r.nombre}</span> },
                  { key: 'categoria', label: 'Categoría', sortable: true, cell: r => r.categoria ? <Badge accent="emerald" dot>{r.categoria}</Badge> : <span className="text-zinc-600 text-xs">—</span> },
                  { key: 'subcategoria', label: 'Subcategoría', cell: r => <span className="text-zinc-400 text-xs">{r.subcategoria || '—'}</span> },
                  { key: 'unidad', label: 'Unidad', cell: r => <span className="text-zinc-500">{r.unidad}</span> },
                ]}
              />
            )}
          </Card>
          }
          detail={
          <Card className="sticky top-[88px]">
            <CardHeader><CardTitle>Nuevo artículo</CardTitle></CardHeader>
            <div className="p-4">
              <ArticuloForm value={artForm} onChange={setArtForm} />
              <div className="pt-3 mt-3 border-t border-zinc-800">
                {!readonly && (
                  <Button
                    onClick={handleCrearArticulo}
                    disabled={!articuloIsValid(artForm) || saving}
                    accent="emerald"
                    className="w-full"
                    icon="plus"
                  >{saving ? 'Guardando...' : 'Crear artículo'}</Button>
                )}
                <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
                  Los artículos del catálogo quedan disponibles como insumos en Compras y Pañol.
                </p>
              </div>
            </div>
          </Card>
          }
         />
        </div>
      )}
    </div>
  );
}
