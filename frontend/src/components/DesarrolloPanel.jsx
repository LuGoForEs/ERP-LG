import React from 'react';
import { api } from '../api';
import { usePermissions } from '../contexts/PermissionsContext';
import { useNodeEvents } from '../contexts/NotificationsContext';
import {
  cx, Icon, Button, Input, Field, Select,
  EstadoBadge, Badge, Card, CardHeader, CardTitle,
  Metric, useToast, Tabs, useSearchShortcut,
  EmptyState, DataTable, ModuleHeader, MasterDetail,
} from './primitives';

const V2_EMPTY_ITEM = { cantidad: '', unidad: 'u', descripcion: '', uso_en: '', observaciones: '' };

export default function DesarrolloPanel({ openNewSignal }) {
  const { isReadonly } = usePermissions();
  const readonly = isReadonly('desarrollo');
  const [ofsAprobadas, setOfsAprobadas] = React.useState([]);
  const [pms, setPms] = React.useState([]);
  const [planos, setPlanos] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState(null);
  const [tab, setTab] = React.useState('pm');
  const [expandedPm, setExpandedPm] = React.useState(null);

  const [pmForm, setPmForm] = React.useState({ emisor: '', fecha: new Date().toISOString().split('T')[0], plazo_entrega: '', equipo: '' });
  const [pmItems, setPmItems] = React.useState([{ ...V2_EMPTY_ITEM }]);
  const [planoForm, setPlanoForm] = React.useState({ descripcion: '' });
  const [planoArchivo, setPlanoArchivo] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const searchRef = React.useRef(null);
  useSearchShortcut(searchRef, () => setSearch(''));
  const toast = useToast();

  // P → PM tab, L → Plano tab (solo cuando hay OF seleccionada)
  React.useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName?.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) return;
      if (!selected) return;
      if (e.key === 'p') setTab('pm');
      else if (e.key === 'l') setTab('pp');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = React.useCallback(async () => {
    try {
      const [ofs, pmsData, planosData] = await Promise.all([
        api.desarrollo.getOFsDisponibles(),
        api.desarrollo.getPMs(),
        api.desarrollo.getPlanos(),
      ]);
      setOfsAprobadas(ofs);
      setPms(pmsData);
      setPlanos(planosData);
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => { load(); }, [load]);
  useNodeEvents('desarrollo', load);
  React.useEffect(() => {
    if (openNewSignal && ofsAprobadas[0]) handleSelect(ofsAprobadas[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNewSignal]);

  const handleSelect = (o) => {
    setSelected(o);
    setPmForm({ emisor: '', fecha: new Date().toISOString().split('T')[0], plazo_entrega: '', equipo: '' });
    setPmItems([{ ...V2_EMPTY_ITEM }]);
    setPlanoForm({ descripcion: '' });
    setPlanoArchivo(null);
    setExpandedPm(null);
  };

  const updateItem = (idx, field, val) => setPmItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));

  const handleCrearPM = async () => {
    if (!selected || !pmForm.emisor.trim()) return;
    const validItems = pmItems.filter(it => it.cantidad && it.descripcion.trim());
    if (validItems.length === 0) return;
    setSaving(true);
    try {
      await api.desarrollo.createPM({
        of_id: selected.id,
        emisor: pmForm.emisor,
        fecha: pmForm.fecha,
        plazo_entrega: pmForm.plazo_entrega,
        equipo: pmForm.equipo,
        items: validItems.map(it => ({
          cantidad: parseFloat(it.cantidad),
          descripcion: it.descripcion,
          uso_en: it.uso_en,
          observaciones: it.observaciones,
        })),
      });
      await load();
      setPmItems([{ ...V2_EMPTY_ITEM }]);
      setPmForm({ emisor: '', fecha: new Date().toISOString().split('T')[0], plazo_entrega: '', equipo: '' });
      toast({ msg: `Pedido de material creado para OF-${selected.id}` });
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleCrearPlano = async () => {
    if (!selected || !planoForm.descripcion.trim() || !planoArchivo) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('of_id', selected.id);
      fd.append('descripcion', planoForm.descripcion);
      fd.append('archivo', planoArchivo);
      await api.desarrollo.uploadPlano(fd);
      await load();
      setPlanoForm({ descripcion: '' });
      setPlanoArchivo(null);
      toast({ msg: `Plano enviado a Producción para OF-${selected.id}` });
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const q = search.toLowerCase();
  const ofsVisibles = ofsAprobadas.filter(o => !q || `OF-${o.id} ${o.cliente} ${o.descripcion}`.toLowerCase().includes(q));

  const pmsOf    = selected ? pms.filter(p => p.of_id === selected.id) : [];
  const planosOf = selected ? planos.filter(p => p.of_id === selected.id) : [];
  const hasValidItems = pmItems.some(it => it.cantidad && it.descripcion.trim());

  if (loading) return (
    <div>
      <ModuleHeader module="desarrollo" subtitle="Cargando..." />
      <div className="px-4 sm:px-7 py-10 text-zinc-500 text-sm">Cargando datos...</div>
    </div>
  );

  return (
    <div>
      <ModuleHeader module="desarrollo" subtitle="Crear pedidos de material y enviar planos de producción" actions={
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">
            <Icon name="search" size={13} />
          </span>
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar OF..."
            className="h-8 pl-8 pr-3 w-32 sm:w-52 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500"
          />
        </div>
      } />

      <div className="px-4 sm:px-7 pt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="OFs disponibles" value={ofsAprobadas.length} icon="briefcase" accent="cyan" />
        <Metric label="PMs generados" value={pms.length} icon="file-text" accent="blue" />
        <Metric label="Planos enviados" value={planos.filter(p => p.estado === 'enviado').length} icon="upload" accent="violet" />
        <Metric label="Items totales" value={pms.reduce((a,p) => a + (p.items?.length || 0), 0)} sub="Solicitados en PMs" icon="package" accent="cyan" />
      </div>

      <div className="px-4 sm:px-7 py-5">
       <MasterDetail
        listWidth="280px"
        listSide="left"
        hasSelection={!!selected}
        onBack={() => setSelected(null)}
        backLabel="OFs"
        list={
        <Card>
          <CardHeader><CardTitle hint={ofsVisibles.length}>OFs aprobadas</CardTitle></CardHeader>
          {ofsVisibles.length === 0 ? <EmptyState icon="alert" msg={search ? 'Sin resultados' : 'Sin OFs aprobadas'} hint={search ? 'Probá otro término' : 'Administración debe validar anticipos'} /> :
            ofsVisibles.map(o => (
              <button
                key={o.id}
                onClick={() => handleSelect(o)}
                className={cx(
                  'w-full text-left px-4 py-2.5 border-b border-zinc-800/60 transition-colors border-l-2',
                  selected?.id === o.id ? 'bg-cyan-500/10 border-l-cyan-500' : 'border-l-transparent hover:bg-zinc-800/40',
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-zinc-200">OF-{o.id}</span>
                  <EstadoBadge estado="aprobada" />
                </div>
                <div className="text-sm font-medium text-zinc-100 truncate">{o.cliente}</div>
                <div className="text-xs text-zinc-500 truncate mt-0.5">{o.descripcion}</div>
              </button>
            ))
          }
        </Card>
        }
        detail={
        <div className="space-y-3">
          {!selected ? (
            <Card><EmptyState icon="compass" msg="Seleccioná una OF aprobada" hint="Para crear PM o PP" /></Card>
          ) : (
            <>
              <Card className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-base font-bold text-zinc-100">OF-{selected.id}</span>
                      <EstadoBadge estado="aprobada" />
                    </div>
                    <div className="text-sm text-zinc-400 mt-0.5">{selected.cliente} — {selected.descripcion}</div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <div className="text-zinc-600 font-mono text-[10px] uppercase">Plazo</div>
                      <div className="text-zinc-300 font-mono">{selected.plazo_entrega}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-zinc-600 font-mono text-[10px] uppercase">PMs</div>
                      <div className="text-zinc-300 font-mono">{pmsOf.length}</div>
                    </div>
                  </div>
                </div>
              </Card>

              <Tabs value={tab} onChange={setTab} accent="cyan" items={[
                { value: 'pm', label: 'Pedido de material' },
                { value: 'pp', label: 'Plano de producción' },
              ]} />

              {tab === 'pm' && (
                <Card>
                  <CardHeader><CardTitle>Nuevo Pedido de Material</CardTitle></CardHeader>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Field label="Emisor" required><Input value={pmForm.emisor} onChange={e => setPmForm({...pmForm, emisor: e.target.value})} placeholder="Nombre..." /></Field>
                      <Field label="Fecha"><Input type="date" value={pmForm.fecha} onChange={e => setPmForm({...pmForm, fecha: e.target.value})} /></Field>
                      <Field label="Plazo entrega"><Input type="date" value={pmForm.plazo_entrega} onChange={e => setPmForm({...pmForm, plazo_entrega: e.target.value})} /></Field>
                      <Field label="Equipo"><Input value={pmForm.equipo} onChange={e => setPmForm({...pmForm, equipo: e.target.value})} placeholder="Tanque 5000L" /></Field>
                    </div>

                    <div className="border border-zinc-800 rounded-md overflow-x-auto">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead className="bg-zinc-900/60 border-b border-zinc-800">
                          <tr>
                            {['#','Cant.','Ud.','Descripción *','Uso en','Observaciones',''].map((h, i) => (
                              <th key={i} className={cx(
                                'font-mono text-[10px] uppercase tracking-[0.05em] text-zinc-500 font-semibold text-left px-2.5 py-2',
                                i === 0 && 'w-8 text-center', i === 1 && 'w-16', i === 2 && 'w-14',
                                i === 6 && 'w-8', i === 4 && 'w-24', i === 5 && 'w-32',
                              )}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pmItems.map((item, idx) => (
                            <tr key={idx} className="border-b border-zinc-800/60 hover:bg-zinc-800/30">
                              <td className="px-2.5 py-1 text-center font-mono text-xs text-zinc-600">{idx+1}</td>
                              <td className="px-1 py-1"><input type="number" step="0.01" value={item.cantidad} onChange={e => updateItem(idx,'cantidad',e.target.value)} placeholder="0" className="w-full bg-transparent border border-transparent hover:border-zinc-800 focus:border-cyan-500 focus:outline-none rounded px-1.5 py-1 text-xs text-zinc-200 text-center" /></td>
                              <td className="px-1 py-1">
                                <select value={item.unidad} onChange={e => updateItem(idx,'unidad',e.target.value)} className="w-full bg-transparent border border-transparent hover:border-zinc-800 focus:border-cyan-500 rounded px-1.5 py-1 text-xs text-zinc-200">
                                  {['u','m','kg','L','m²'].map(u => <option key={u} value={u} className="bg-zinc-900">{u}</option>)}
                                </select>
                              </td>
                              <td className="px-1 py-1"><input value={item.descripcion} onChange={e => updateItem(idx,'descripcion',e.target.value)} placeholder="Material..." className="w-full bg-transparent border border-transparent hover:border-zinc-800 focus:border-cyan-500 focus:outline-none rounded px-1.5 py-1 text-xs text-zinc-200" /></td>
                              <td className="px-1 py-1"><input value={item.uso_en} onChange={e => updateItem(idx,'uso_en',e.target.value)} placeholder="Destino" className="w-full bg-transparent border border-transparent hover:border-zinc-800 focus:border-cyan-500 focus:outline-none rounded px-1.5 py-1 text-xs text-zinc-200" /></td>
                              <td className="px-1 py-1"><input value={item.observaciones} onChange={e => updateItem(idx,'observaciones',e.target.value)} placeholder="Notas" className="w-full bg-transparent border border-transparent hover:border-zinc-800 focus:border-cyan-500 focus:outline-none rounded px-1.5 py-1 text-xs text-zinc-200" /></td>
                              <td className="px-1 py-1 text-center"><button onClick={() => setPmItems(p => p.length <= 1 ? p : p.filter((_,i) => i !== idx))} disabled={pmItems.length <= 1} className="text-zinc-600 hover:text-rose-400 disabled:opacity-20"><Icon name="x" size={14} /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between items-center">
                      <button onClick={() => setPmItems(p => [...p, {...V2_EMPTY_ITEM}])} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md border border-dashed border-zinc-800 text-xs text-zinc-400 hover:border-cyan-500/60 hover:text-cyan-400 transition-colors">
                        <Icon name="plus" size={12} />Agregar fila
                      </button>
                      {!readonly && (
                        <Button onClick={handleCrearPM} accent="cyan" disabled={!hasValidItems || !pmForm.emisor.trim() || saving} icon="check">
                          {saving ? 'Guardando...' : 'Crear PM'}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {tab === 'pp' && (
                <Card>
                  <CardHeader><CardTitle>Nuevo Plano de Producción</CardTitle></CardHeader>
                  <div className="p-5 space-y-4">
                    <Field label="Descripción" required>
                      <Input value={planoForm.descripcion} onChange={e => setPlanoForm({descripcion: e.target.value})} placeholder="Ej: Plano general rev.3 — vista explosionada" />
                    </Field>
                    <Field label="Archivo PDF">
                      <label className="flex items-center gap-3 px-3 py-3 rounded-md border border-dashed border-zinc-800 bg-zinc-950/40 cursor-pointer hover:border-cyan-500/60 hover:bg-cyan-500/5 transition-colors">
                        <Icon name="upload" size={16} className="text-zinc-500" />
                        <span className="text-xs text-zinc-400 flex-1">
                          {planoArchivo ? `${planoArchivo.name} (${(planoArchivo.size/1024).toFixed(1)} KB)` : 'Arrastrá un PDF o seleccioná archivo'}
                        </span>
                        {planoArchivo && <Badge accent="emerald">cargado</Badge>}
                        <input type="file" accept="application/pdf" className="hidden" onChange={e => setPlanoArchivo(e.target.files[0] || null)} />
                      </label>
                    </Field>
                    <div className="flex justify-end pt-2 border-t border-zinc-800">
                      {!readonly && (
                        <Button onClick={handleCrearPlano} accent="violet" disabled={!planoForm.descripcion.trim() || !planoArchivo || saving} icon="upload">
                          {saving ? 'Enviando...' : 'Enviar a Producción'}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {pmsOf.length > 0 && (
                <Card>
                  <CardHeader><CardTitle hint={pmsOf.length}>PMs de esta OF</CardTitle></CardHeader>
                  {pmsOf.map(p => (
                    <div key={p.id}>
                      <button onClick={() => setExpandedPm(expandedPm === p.id ? null : p.id)} className="w-full flex items-center justify-between px-4 py-3 border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-zinc-200">PM-{p.id}</span>
                          <span className="text-xs text-zinc-500">{p.emisor} · {p.fecha} · {p.equipo}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-zinc-500">{p.items?.length || 0} ítems</span>
                          <EstadoBadge estado={p.estado} />
                          <Icon name={expandedPm === p.id ? 'chevron-up' : 'chevron-down'} size={12} className="text-zinc-600" />
                        </div>
                      </button>
                      {expandedPm === p.id && (
                        <div className="bg-zinc-950/40 px-4 py-3">
                          <DataTable
                            density="compact"
                            data={p.items || []}
                            columns={[
                              { key: 'num', label: '#', width: 32, align: 'center', cell: (r,i) => <span className="font-mono text-zinc-600">{(p.items||[]).indexOf(r) + 1}</span> },
                              { key: 'cantidad', label: 'Cant.', mono: true, cell: (r) => <span className="text-cyan-400 font-mono">{r.cantidad}</span> },
                              { key: 'descripcion', label: 'Descripción' },
                              { key: 'uso_en', label: 'Uso en', cell: (r) => <span className="text-zinc-500">{r.uso_en || '—'}</span> },
                              { key: 'observaciones', label: 'Observ.', cell: (r) => <span className="text-zinc-500">{r.observaciones || '—'}</span> },
                            ]}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </Card>
              )}

              {planosOf.length > 0 && (
                <Card>
                  <CardHeader><CardTitle hint={planosOf.length}>Planos de esta OF</CardTitle></CardHeader>
                  {planosOf.map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800/60 last:border-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-zinc-200">PP-{p.id}</span>
                          <EstadoBadge estado={p.estado} />
                        </div>
                        <div className="text-xs text-zinc-400 truncate">{p.descripcion}</div>
                      </div>
                      {p.archivo && (
                        <div className="flex items-center gap-2 text-xs min-w-0 shrink">
                          <span className="shrink-0 px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 font-mono text-[10px] font-bold">PDF</span>
                          <span className="text-zinc-400 truncate max-w-[100px] sm:max-w-[200px]" title={p.archivo.nombre}>{p.archivo.nombre}</span>
                          <span className="text-zinc-600 font-mono shrink-0">{((p.archivo.tamanio_bytes||0)/1024).toFixed(0)} KB</span>
                        </div>
                      )}
                    </div>
                  ))}
                </Card>
              )}
            </>
          )}
        </div>
        }
       />
      </div>
    </div>
  );
}
