import React from 'react';
import { api } from '../api';
import {
  cx, Icon, Button, Input, Field, Select,
  EstadoBadge, Card, CardHeader, CardTitle,
  Metric, useToast, useSearchShortcut,
  DataTable, ModuleHeader, EmptyState,
} from './primitives';

export default function ProduccionPanel({ openNewSignal }) {
  const [lotes, setLotes] = React.useState([]);
  const [ofsAprobadas, setOfsAprobadas] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState({ of_id: '', descripcion: '' });
  const [saving, setSaving] = React.useState(false);
  const [selectedLote, setSelectedLote] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const searchRef = React.useRef(null);
  useSearchShortcut(searchRef, () => setSearch(''));
  const toast = useToast();

  // N → foco en selector de OF del formulario
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

  const q = search.toLowerCase();
  const lotesFiltrados = lotes.filter(l => !q || `Lote-${l.id} OF-${l.of_id} ${l.descripcion} ${l.estado}`.toLowerCase().includes(q));

  const terminados  = lotes.filter(l => l.estado === 'terminado');
  const enDespacho  = lotes.filter(l => l.estado === 'en_despacho');

  const handleCrear = async () => {
    if (!form.of_id || !form.descripcion.trim()) return;
    setSaving(true);
    try {
      await api.produccion.finalizarLote({ of_id: parseInt(form.of_id), descripcion: form.descripcion });
      await load();
      setForm({ of_id: '', descripcion: '' });
      toast({ msg: `Lote finalizado para OF-${form.of_id}` });
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div>
      <ModuleHeader module="produccion" subtitle="Cargando..." />
      <div className="px-7 py-10 text-zinc-500 text-sm">Cargando datos...</div>
    </div>
  );

  const handleRowClick = (row) => {
    setSelectedLote(prev => prev?.id === row.id ? null : row);
  };

  const PlanosDetalle = ({ lote }) => (
    <div className="border-t border-zinc-700 bg-zinc-900/50 px-4 py-3">
      <div className="flex items-center justify-between mb-2.5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          Planos de producción — Lote-{lote.id} (OF-{lote.of_id})
        </p>
        <button onClick={() => setSelectedLote(null)} className="text-zinc-600 hover:text-zinc-300 p-0.5 rounded hover:bg-zinc-800">
          <Icon name="x" size={13} />
        </button>
      </div>
      {(lote.planos_asociados || []).length === 0 ? (
        <p className="text-xs text-zinc-600 italic">Sin planos asociados a este lote</p>
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
                  onClick={() => window.open(`/api/v1/desarrollo/planos/${p.id}/archivo`, '_blank')}
                  className={cx(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium shrink-0 ml-3 transition-colors',
                    'bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20',
                  )}
                >
                  <Icon name="upload" size={12} />
                  Abrir PDF
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

  const columns = [
    { key: 'id', label: 'Lote', mono: true, sortable: true, cell: r => <span className="font-mono font-bold text-zinc-200">Lote-{r.id}</span> },
    { key: 'of_id', label: 'OF', mono: true, cell: r => <span className="text-zinc-500 font-mono">OF-{r.of_id}</span> },
    { key: 'descripcion', label: 'Descripción', cell: r => <span className="text-zinc-300">{r.descripcion || '—'}</span> },
    { key: 'planos', label: 'Planos', mono: true, align: 'center', cell: r => (
      <span className={cx('font-mono', (r.planos_asociados||[]).length > 0 ? 'text-rose-400 font-semibold' : 'text-zinc-600')}>
        {(r.planos_asociados||[]).length}
      </span>
    )},
    { key: 'movimientos', label: 'Despachos mat.', mono: true, align: 'center', cell: r => <span className="font-mono text-zinc-400">{(r.movimientos_asociados||[]).length}</span> },
    { key: 'estado', label: 'Estado', cell: r => <EstadoBadge estado={r.estado} /> },
    { key: 'fecha', label: 'Fecha', mono: true, cell: r => <span className="text-zinc-500 font-mono text-xs">{r.created_at ? r.created_at.split('T')[0] : '—'}</span> },
  ];

  return (
    <div>
      <ModuleHeader module="produccion" subtitle="Registro de lotes terminados listos para despacho" actions={
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

      <div className="px-7 pt-5 grid grid-cols-4 gap-3">
        <Metric label="Lotes terminados" value={terminados.length} icon="check-circle" accent="emerald" />
        <Metric label="En despacho" value={enDespacho.length} icon="truck" accent="orange" />
        <Metric label="Total lotes" value={lotes.length} icon="package" accent="rose" />
        <Metric label="OFs disponibles" value={ofsAprobadas.length} sub="Con anticipo aprobado" icon="briefcase" accent="cyan" />
      </div>

      <div className="px-7 py-5 grid grid-cols-[1fr_300px] gap-4 items-start">
        <div className="space-y-3">
          <Card>
            <CardHeader><CardTitle hint={lotesFiltrados.length}>Lotes de producción</CardTitle></CardHeader>
            {lotesFiltrados.length === 0
              ? <EmptyState icon="package" msg={search ? 'Sin resultados' : 'Sin lotes registrados'} hint={search ? 'Probá otro término' : 'Registrá un lote cuando la producción de una OF esté completa'} />
              : <DataTable
                  data={lotesFiltrados}
                  columns={columns}
                  onRowClick={handleRowClick}
                  selectedId={selectedLote?.id}
                  renderExpanded={(row) => <PlanosDetalle lote={row} />}
                />
            }
          </Card>
        </div>

        <Card className="sticky top-[88px]">
          <CardHeader><CardTitle>Finalizar lote</CardTitle></CardHeader>
          <div className="p-4 space-y-3">
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Requiere que la OF tenga planos enviados (Desarrollo) y materiales despachados (Pañol).
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
            <Button
              onClick={handleCrear}
              disabled={!form.of_id || !form.descripcion.trim() || saving}
              accent="rose"
              className="w-full"
              icon="check"
            >
              {saving ? 'Guardando...' : 'Registrar lote terminado'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
