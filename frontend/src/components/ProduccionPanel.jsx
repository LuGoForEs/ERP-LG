import React from 'react';
import { api } from '../api';
import {
  cx, Icon, Button, Input, Field, Select,
  Card, CardHeader, CardTitle,
  Metric, useToast, useSearchShortcut,
  DataTable, ModuleHeader, EmptyState,
} from './primitives';
import { usePermissions } from '../contexts/PermissionsContext';

const ESTADOS = [
  { key: 'pre_produccion',   label: 'Pre-Producción' },
  { key: 'produccion',       label: 'Producción' },
  { key: 'final_produccion', label: 'Final de producción' },
  { key: 'terminado',        label: 'Terminado' },
  { key: 'en_despacho',      label: 'En despacho' },
];

const ESTADO_COLORS = {
  pre_produccion:   { dot: 'bg-zinc-400',   text: 'text-zinc-400',   badge: 'bg-zinc-500/15 text-zinc-400' },
  produccion:       { dot: 'bg-blue-400',   text: 'text-blue-400',   badge: 'bg-blue-500/15 text-blue-400' },
  final_produccion: { dot: 'bg-violet-400', text: 'text-violet-400', badge: 'bg-violet-500/15 text-violet-400' },
  terminado:        { dot: 'bg-emerald-400', text: 'text-emerald-400', badge: 'bg-emerald-500/15 text-emerald-400' },
  en_despacho:      { dot: 'bg-amber-400',  text: 'text-amber-400',  badge: 'bg-amber-500/15 text-amber-400' },
};

function EstadoLabel({ estado }) {
  const e = ESTADOS.find(s => s.key === estado);
  const c = ESTADO_COLORS[estado] || ESTADO_COLORS.pre_produccion;
  return (
    <span className={cx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[11px] font-semibold', c.badge)}>
      <span className={cx('w-1.5 h-1.5 rounded-full', c.dot)} />
      {e?.label || estado}
    </span>
  );
}

function ProgresoEstados({ estado, observaciones = [], activeKey, onActiveKeyChange }) {
  const idx = ESTADOS.findIndex(s => s.key === estado);
  const obsMap = {};
  for (const obs of observaciones) { obsMap[obs.hacia] = obs; }

  return (
    <div className="flex items-center gap-0">
      {ESTADOS.map((s, i) => {
        const done     = i < idx;
        const current  = i === idx;
        const c        = ESTADO_COLORS[s.key];
        const hasObs   = !!obsMap[s.key];
        const isActive = activeKey === s.key;

        return (
          <React.Fragment key={s.key}>
            <button
              type="button"
              aria-disabled={!hasObs}
              onClick={() => hasObs && onActiveKeyChange(isActive ? null : s.key)}
              className={cx(
                'flex flex-col items-center gap-1 transition-opacity',
                hasObs ? 'cursor-pointer' : 'cursor-default',
                !hasObs && !current && 'opacity-60',
              )}
            >
              <div className={cx(
                'w-2.5 h-2.5 rounded-full border-2 transition-all',
                done    ? `${c.dot} border-transparent ${isActive ? 'scale-125' : ''}` :
                current ? `${c.dot} border-transparent ring-2 ring-offset-1 ring-offset-zinc-900 ring-current ${c.text}` :
                          'bg-transparent border-zinc-700',
              )} />
              <span className={cx(
                'text-[9px] font-mono uppercase tracking-wide whitespace-nowrap',
                done    ? (isActive ? c.text : 'text-zinc-400') :
                current ? c.text : 'text-zinc-700',
              )}>
                {s.label}
                {hasObs && <span className="ml-0.5 opacity-60">·</span>}
              </span>
            </button>
            {i < ESTADOS.length - 1 && (
              <div className={cx('h-px w-6 mb-4 mx-1 shrink-0', done ? 'bg-zinc-500' : 'bg-zinc-800')} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function ProduccionPanel({ openNewSignal }) {
  const { isReadonly } = usePermissions();
  const readonly = isReadonly('produccion');
  const [lotes, setLotes] = React.useState([]);
  const [ofsAprobadas, setOfsAprobadas] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState({ of_id: '', descripcion: '' });
  const [saving, setSaving] = React.useState(false);
  const [selectedLote, setSelectedLote] = React.useState(null);
  const [planoLoadingId, setPlanoLoadingId] = React.useState(null);
  const [obsTexto, setObsTexto] = React.useState('');
  const [avanzando, setAvanzando] = React.useState(false);
  const [activeObsKey, setActiveObsKey] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const searchRef = React.useRef(null);
  useSearchShortcut(searchRef, () => setSearch(''));
  const toast = useToast();

  React.useEffect(() => {
    if (!openNewSignal) return;
    document.getElementById('prod-of-select')?.focus();
  }, [openNewSignal]);

  const load = React.useCallback(async () => {
    try {
      const [lotesData, ofsData] = await Promise.all([
        api.produccion.getLotes(),
        api.desarrollo.getOFsDisponibles(),
      ]);
      setLotes(lotesData);
      setOfsAprobadas(ofsData);
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => { load(); }, [load]);

  // Sync selectedLote con datos frescos tras operaciones
  React.useEffect(() => {
    if (!selectedLote) return;
    const fresh = lotes.find(l => l.id === selectedLote.id);
    if (fresh) setSelectedLote(fresh);
  }, [lotes]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = search.toLowerCase();
  const lotesFiltrados = lotes.filter(l =>
    !q || `Lote-${l.id} OF-${l.of_id} ${l.descripcion} ${l.estado}`.toLowerCase().includes(q)
  );

  const handleCrear = async () => {
    if (!form.of_id || !form.descripcion.trim()) return;
    setSaving(true);
    try {
      await api.produccion.finalizarLote({ of_id: parseInt(form.of_id), descripcion: form.descripcion });
      await load();
      setForm({ of_id: '', descripcion: '' });
      toast({ msg: `Lote iniciado para OF-${form.of_id}` });
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAvanzar = async () => {
    if (!selectedLote || !obsTexto.trim()) return;
    setAvanzando(true);
    try {
      const data = await api.produccion.avanzarEstado(selectedLote.id, { observaciones: obsTexto });
      await load();
      setObsTexto('');
      const nextLabel = ESTADOS.find(s => s.key === data.estado)?.label || data.estado;
      toast({ msg: `Lote-${selectedLote.id} avanzó a "${nextLabel}"` });
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setAvanzando(false);
    }
  };

  const handleRowClick = (row) => {
    if (selectedLote?.id === row.id) {
      setSelectedLote(null);
      setObsTexto('');
      setActiveObsKey(null);
    } else {
      setSelectedLote(row);
      setObsTexto('');
      setActiveObsKey(null);
    }
  };

  if (loading) return (
    <div>
      <ModuleHeader module="produccion" subtitle="Cargando..." />
      <div className="px-7 py-10 text-zinc-500 text-sm">Cargando datos...</div>
    </div>
  );

  const PlanosDetalle = ({ lote }) => (
    <div className="border-t border-zinc-700 bg-zinc-900/50 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-2.5">
        Planos — Lote-{lote.id} (OF-{lote.of_id})
      </p>
      {(lote.planos_asociados || []).length === 0 ? (
        <p className="text-xs text-zinc-600 italic">Sin planos asociados</p>
      ) : (
        <div className="space-y-1.5">
          {(lote.planos_asociados || []).map(p => (
            <div key={p.id} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 font-mono text-[10px] font-bold shrink-0">PDF</span>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-200 font-medium truncate">{p.descripcion}</p>
                  <p className="text-[11px] text-zinc-500 font-mono truncate">{p.archivo_nombre}</p>
                </div>
              </div>
              {p.tiene_archivo ? (
                <button
                  disabled={planoLoadingId === p.id}
                  onClick={async () => {
                    setPlanoLoadingId(p.id);
                    try {
                      const blob = await api.desarrollo.downloadPlano(p.id);
                      const url = URL.createObjectURL(blob);
                      window.open(url, '_blank');
                      setTimeout(() => URL.revokeObjectURL(url), 30000);
                    } catch (e) {
                      toast({ type: 'error', msg: e.message });
                    } finally {
                      setPlanoLoadingId(null);
                    }
                  }}
                  className={cx(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium shrink-0 ml-3 transition-colors cursor-pointer',
                    planoLoadingId === p.id
                      ? 'bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20',
                  )}
                >
                  <Icon name="upload" size={12} />
                  {planoLoadingId === p.id ? 'Abriendo...' : 'Abrir PDF'}
                </button>
              ) : (
                <span className="text-[11px] text-zinc-600 italic shrink-0 ml-3">Sin archivo</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const estadoIdx = selectedLote ? ESTADOS.findIndex(s => s.key === selectedLote.estado) : -1;
  const esFinal   = estadoIdx === ESTADOS.length - 1;
  const nextEstado = !esFinal && estadoIdx >= 0 ? ESTADOS[estadoIdx + 1] : null;

  const columns = [
    { key: 'id',          label: 'Lote',      mono: true, sortable: true,
      cell: r => <span className={cx('font-mono font-bold', selectedLote?.id === r.id ? 'text-rose-300' : 'text-zinc-200')}>Lote-{r.id}</span> },
    { key: 'of_id',       label: 'OF',        mono: true,
      cell: r => <span className="text-zinc-500 font-mono">OF-{r.of_id}</span> },
    { key: 'descripcion', label: 'Descripción',
      cell: r => <span className="text-zinc-300">{r.descripcion || '—'}</span> },
    { key: 'estado',      label: 'Estado',
      cell: r => <EstadoLabel estado={r.estado} /> },
    { key: 'fecha',       label: 'Fecha', mono: true,
      cell: r => <span className="text-zinc-500 font-mono text-xs">{r.created_at ? r.created_at.split('T')[0] : '—'}</span> },
  ];

  const counts = Object.fromEntries(ESTADOS.map(s => [s.key, lotes.filter(l => l.estado === s.key).length]));

  return (
    <div>
      <ModuleHeader module="produccion" subtitle="Seguimiento de lotes por etapa de producción" actions={
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">
            <Icon name="search" size={13} />
          </span>
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar lote..."
            className="h-8 pl-8 pr-3 w-52 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500"
          />
        </div>
      } />

      <div className="px-7 pt-5 grid grid-cols-5 gap-3">
        {ESTADOS.map(s => (
          <Metric key={s.key} label={s.label} value={counts[s.key] || 0} icon="package"
            accent={s.key === 'pre_produccion' ? 'zinc' : s.key === 'produccion' ? 'blue' : s.key === 'final_produccion' ? 'violet' : s.key === 'terminado' ? 'emerald' : 'amber'} />
        ))}
      </div>

      <div className="px-7 py-5 grid grid-cols-[1fr_320px] gap-4 items-start">
        <div className="space-y-3">
          <Card>
            <CardHeader><CardTitle hint={lotesFiltrados.length}>Lotes de producción</CardTitle></CardHeader>
            {lotesFiltrados.length === 0
              ? <EmptyState icon="package" msg={search ? 'Sin resultados' : 'Sin lotes registrados'}
                  hint={search ? 'Probá otro término' : 'Iniciá un lote cuando la OF tenga planos y materiales'} />
              : <DataTable
                  data={lotesFiltrados}
                  columns={columns}
                  onRowClick={handleRowClick}
                  selectedId={selectedLote?.id}
                  renderExpanded={row => <PlanosDetalle lote={row} />}
                />
            }
          </Card>
        </div>

        <div className="space-y-3 sticky top-[88px]">
          {selectedLote ? (
            <Card>
              <div className="flex items-start justify-between px-4 py-3 border-b border-zinc-800">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-zinc-100">Lote-{selectedLote.id}</span>
                    <span className="text-zinc-600 font-mono text-xs">OF-{selectedLote.of_id}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{selectedLote.descripcion}</p>
                </div>
                <button onClick={() => { setSelectedLote(null); setObsTexto(''); }}
                  className="text-zinc-600 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 shrink-0 ml-2">
                  <Icon name="x" size={13} />
                </button>
              </div>
              <div className="p-4 space-y-4">

                {/* Progreso */}
                <div className="overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-track]:bg-zinc-900 [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-600" style={{ scrollbarWidth: 'thin', scrollbarColor: '#52525b #18181b' }}>
                  <ProgresoEstados
                    estado={selectedLote.estado}
                    observaciones={selectedLote.observaciones || []}
                    activeKey={activeObsKey}
                    onActiveKeyChange={setActiveObsKey}
                  />
                </div>

                {/* Observación del estado seleccionado */}
                {(() => {
                  const obsMap = {};
                  for (const obs of selectedLote.observaciones || []) { obsMap[obs.hacia] = obs; }
                  const activeObs = activeObsKey ? obsMap[activeObsKey] : null;
                  if (!activeObs) return null;
                  return (
                    <div className="rounded-md border border-zinc-700 bg-zinc-950/70 px-3 py-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-zinc-500">
                          {ESTADOS.find(s => s.key === activeObs.desde)?.label}
                          {' → '}
                          <span className="text-zinc-300">{ESTADOS.find(s => s.key === activeObs.hacia)?.label}</span>
                        </span>
                        <span className="font-mono text-[10px] text-zinc-700">{activeObs.fecha?.slice(0, 10)}</span>
                      </div>
                      <p className="text-xs text-zinc-200 leading-relaxed">{activeObs.texto}</p>
                    </div>
                  );
                })()}

                {/* Avanzar estado */}
                {!esFinal ? (
                  <>
                    <Field label={`Observaciones para avanzar a "${nextEstado?.label}"`} required>
                      <textarea
                        value={obsTexto}
                        onChange={e => setObsTexto(e.target.value)}
                        placeholder="Describa el avance o novedades de esta etapa..."
                        rows={3}
                        className="w-full rounded-md border border-zinc-700 bg-zinc-950 text-sm text-zinc-100 px-3 py-2 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 resize-none"
                      />
                    </Field>
                    {!readonly && (
                      <Button
                        onClick={handleAvanzar}
                        disabled={!obsTexto.trim() || avanzando}
                        accent="rose"
                        className="w-full"
                        icon="arrow-right"
                      >
                        {avanzando ? 'Avanzando...' : `Avanzar a "${nextEstado?.label}"`}
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-center">
                    <p className="text-xs text-emerald-400 font-semibold">Lote en estado final</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Disponible para Logística</p>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader><CardTitle>Iniciar producción</CardTitle></CardHeader>
              <div className="p-4 space-y-3">
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Requiere que la OF tenga planos (Desarrollo) y materiales despachados (Pañol).
                </p>
                <Field label="Orden de fabricación" required>
                  <Select
                    id="prod-of-select"
                    value={form.of_id}
                    onChange={e => setForm({...form, of_id: e.target.value})}
                    options={[{value:'',label:'Seleccioná OF...'}, ...ofsAprobadas.map(o => ({value: o.id, label: `OF-${o.id} — ${o.cliente}`}))]}
                  />
                </Field>
                <Field label="Descripción del lote" required>
                  <Input
                    value={form.descripcion}
                    onChange={e => setForm({...form, descripcion: e.target.value})}
                    placeholder="Ej: Tanque 5000L rev.2 — completo"
                  />
                </Field>
                {!readonly && (
                  <Button
                    onClick={handleCrear}
                    disabled={!form.of_id || !form.descripcion.trim() || saving}
                    accent="rose"
                    className="w-full"
                    icon="check"
                  >
                    {saving ? 'Guardando...' : 'Registrar inicio de lote'}
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
