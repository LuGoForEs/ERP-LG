import React from 'react';
import { api } from '../api';
import {
  cx, Icon, Button, Input, Textarea, Select, Field,
  Badge, EstadoBadge, Card, CardHeader, CardTitle,
  Metric, useToast, Dialog, Tabs, Kbd, useSearchShortcut,
  SectionLabel, EmptyState, ModuleHeader, MasterDetail,
} from './primitives';
import { usePermissions } from '../contexts/PermissionsContext';
import { useNodeEvents } from '../contexts/NotificationsContext';

export default function ComercialPanel({ openNewSignal }) {
  const { isReadonly } = usePermissions();
  const readonly = isReadonly('comercial');
  const [ofs, setOfs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState(null);
  const [filter, setFilter] = React.useState('todas');
  const [search, setSearch] = React.useState('');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState({ cliente: '', descripcion: '', plazo_valor: '', plazo_unidad: 'dias', anticipo_valor: '', anticipo_moneda: 'ARS', plazo_anticipo_dias: '7' });
  const [errors, setErrors] = React.useState({});
  const [saving, setSaving] = React.useState(false);
  const toast = useToast();
  const searchRef = React.useRef(null);
  useSearchShortcut(searchRef, () => setSearch(''));

  const load = React.useCallback(async () => {
    try {
      const data = await api.comercial.getOFs();
      setOfs(data);
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => { load(); }, [load]);
  useNodeEvents('comercial', load);
  React.useEffect(() => { if (openNewSignal) setDialogOpen(true); }, [openNewSignal]);

  const pendientes  = ofs.filter(o => o.estado === 'pendiente_anticipo');
  const aprobadas   = ofs.filter(o => o.estado === 'aprobada');
  const rechazadas  = ofs.filter(o => o.estado === 'rechazada_anticipo');

  const MONEDAS = ['ARS', 'USD', 'EUR'];
  const MONEDA_SYMBOL = { ARS: '$', USD: 'U$S', EUR: '€' };
  const [monedaMetrica, setMonedaMetrica] = React.useState('ARS');
  const ciclicMoneda = () => setMonedaMetrica(m => MONEDAS[(MONEDAS.indexOf(m) + 1) % MONEDAS.length]);
  const montoPendiente = pendientes.reduce((a, o) => a + (o.moneda_anticipo === monedaMetrica ? (o.monto_anticipo || 0) : 0), 0);
  const montoPendienteFmt = montoPendiente >= 1_000_000
    ? `${MONEDA_SYMBOL[monedaMetrica]} ${(montoPendiente / 1_000_000).toFixed(1)}M`
    : `${MONEDA_SYMBOL[monedaMetrica]} ${(montoPendiente / 1_000).toFixed(0)}k`;

  const filtered = ofs.filter(o => {
    if (filter === 'pendientes'  && o.estado !== 'pendiente_anticipo') return false;
    if (filter === 'aprobadas'   && o.estado !== 'aprobada') return false;
    if (filter === 'rechazadas'  && o.estado !== 'rechazada_anticipo') return false;
    if (search && !`${o.cliente} ${o.descripcion} OF-${o.id}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const validate = () => {
    const e = {};
    if (!form.cliente.trim()) e.cliente = 'Requerido';
    if (!form.descripcion.trim()) e.descripcion = 'Requerido';
    if (!form.plazo_valor || parseFloat(form.plazo_valor) <= 0) e.plazo_valor = 'Mayor a 0';
    if (!form.anticipo_valor || parseFloat(form.anticipo_valor) <= 0) e.anticipo_valor = 'Mayor a 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const newOf = await api.comercial.createOF({
        cliente: form.cliente,
        descripcion: form.descripcion,
        plazo_entrega: `${form.plazo_valor} ${form.plazo_unidad}`,
        monto_anticipo: parseFloat(form.anticipo_valor),
        moneda_anticipo: form.anticipo_moneda,
        plazo_anticipo_dias: parseInt(form.plazo_anticipo_dias) || 7,
      });
      await load();
      toast({ msg: `OF-${newOf.id} creada para ${newOf.cliente}` });
      setDialogOpen(false);
      setForm({ cliente: '', descripcion: '', plazo_valor: '', plazo_unidad: 'dias', anticipo_valor: '', anticipo_moneda: 'ARS', plazo_anticipo_dias: '7' });
      setErrors({});
      setSelected(newOf);
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div>
      <ModuleHeader module="comercial" subtitle="Cargando..." />
      <div className="px-4 sm:px-7 py-10 text-zinc-500 text-sm">Cargando órdenes...</div>
    </div>
  );

  return (
    <div>
      <ModuleHeader
        module="comercial"
        subtitle={`${ofs.length} órdenes · ${pendientes.length} pendientes · ${aprobadas.length} aprobadas`}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">
                <Icon name="search" size={13} />
              </span>
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="h-10 sm:h-8 pl-8 pr-12 w-full sm:w-56 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2"><Kbd>/</Kbd></span>
            </div>
            {!readonly && <Button onClick={() => setDialogOpen(true)} icon="plus" accent="blue">Nueva OF</Button>}
          </div>
        }
      />

      <div className="px-4 sm:px-7 pt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Total OFs" value={ofs.length} icon="briefcase" accent="blue" />
        <Metric label="Pend. anticipo" value={pendientes.length} sub="En espera de aprobación" icon="alert" accent="amber" />
        <Metric label="Aprobadas" value={aprobadas.length} sub="En producción" icon="check-circle" accent="emerald" />
        <Metric label="Monto pendiente"
          value={montoPendienteFmt}
          sub={`Anticipos ${monedaMetrica} · clic para cambiar`}
          icon="wallet" accent="violet"
          onClick={ciclicMoneda} />
      </div>

      <div className="px-4 sm:px-7 py-5">
       <MasterDetail
        listWidth="340px"
        hasSelection={!!selected}
        onBack={() => setSelected(null)}
        backLabel="Órdenes"
        list={
        <Card>
          <CardHeader>
            <CardTitle hint={`${filtered.length}`}>Órdenes</CardTitle>
          </CardHeader>
          <div className="px-3 py-2 border-b border-zinc-800">
            <Tabs value={filter} onChange={setFilter} accent="blue" items={[
              { value: 'todas', label: 'Todas', count: ofs.length },
              { value: 'pendientes', label: 'Pend.', count: pendientes.length },
              { value: 'aprobadas', label: 'OK', count: aprobadas.length },
              { value: 'rechazadas', label: 'Rech.', count: rechazadas.length },
            ]} />
          </div>
          <div className="max-h-[50vh] lg:max-h-[330px] overflow-y-auto">
            {filtered.length === 0 ? <EmptyState icon="briefcase" msg="Sin resultados" hint="Probá ajustar el filtro" /> :
              filtered.map(o => (
                <button
                  key={o.id}
                  onClick={() => setSelected(o)}
                  className={cx(
                    'w-full text-left px-4 py-3 border-b border-zinc-800/60 transition-colors border-l-2',
                    selected?.id === o.id
                      ? 'bg-blue-500/10 border-l-blue-500'
                      : 'border-l-transparent hover:bg-zinc-800/40',
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-zinc-200">OF-{o.id}</span>
                    <EstadoBadge estado={o.estado} />
                  </div>
                  <div className="text-sm font-medium text-zinc-100 mb-0.5 truncate">{o.cliente}</div>
                  <div className="text-xs text-zinc-500 mb-1.5 line-clamp-1">{o.descripcion}</div>
                  <div className="font-mono text-[11px] text-zinc-500 flex items-center gap-2">
                    <span className="text-zinc-400">{o.moneda_anticipo} {Number(o.monto_anticipo).toLocaleString('es-AR')}</span>
                    <span className="text-zinc-600">·</span>
                    <span>{o.plazo_entrega}</span>
                  </div>
                </button>
              ))
            }
          </div>
        </Card>
        }
        detail={
        <Card>
          {!selected ? (
            <EmptyState icon="briefcase" msg="Seleccioná una OF" hint={<>O presioná <Kbd>N</Kbd> para crear una nueva</>} />
          ) : (
            <>
              <CardHeader actions={<EstadoBadge estado={selected.estado} />}>
                <h2 className="font-mono text-base font-bold text-zinc-100 shrink-0">OF-{selected.id}</h2>
                <span className="text-sm text-zinc-500 truncate">{selected.cliente}</span>
              </CardHeader>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Plazo de entrega</p>
                    <p className="text-sm text-zinc-200 font-mono">{selected.plazo_entrega}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Monto anticipo</p>
                    <p className="text-sm text-emerald-400 font-mono font-semibold">
                      {selected.moneda_anticipo} {Number(selected.monto_anticipo).toLocaleString('es-AR')}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Plazo pago anticipo</p>
                    <p className="text-sm text-zinc-200 font-mono">{selected.plazo_anticipo_dias ?? 7} días</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Responsable</p>
                    <p className="text-sm text-zinc-200">{selected.responsable_nombre ?? '—'}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1">ID interno</p>
                    <p className="text-sm text-zinc-200 font-mono">#{String(selected.id).padStart(5, '0')}</p>
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Descripción del trabajo</p>
                  <p className="text-sm text-zinc-200 leading-relaxed bg-zinc-950/60 border border-zinc-800 rounded-md p-3">
                    {selected.descripcion}
                  </p>
                </div>
                {selected.anticipo?.observacion && (
                  <div className="rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
                      Observación registrada — Administración
                    </p>
                    <p className="text-xs text-zinc-300 leading-relaxed">{selected.anticipo.observacion}</p>
                  </div>
                )}
                <div className="border-t border-zinc-800 pt-4">
                  <SectionLabel>Trazabilidad</SectionLabel>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-zinc-400">OF creada</span>
                      <span className="text-zinc-600 font-mono ml-auto">{selected.created_at ? selected.created_at.split('T')[0] : '—'}</span>
                    </div>
                    {selected.anticipo?.estado === 'validado' && (
                      <div className="flex items-center gap-3 text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-zinc-400">Anticipo validado</span>
                        <span className="text-zinc-600 font-mono ml-auto">— administración</span>
                      </div>
                    )}
                    {selected.anticipo?.estado === 'rechazado' && (
                      <div className="flex items-center gap-3 text-xs">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span className="text-zinc-400">Anticipo rechazado</span>
                        <span className="text-zinc-600 font-mono ml-auto">— administración</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>
        }
       />
      </div>

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setErrors({}); }} title="Nueva Orden de Fabricación" size="lg">
        <div className="p-5 space-y-4">
          <Field label="Cliente" required error={errors.cliente}>
            <Input value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} placeholder="Razón social..." error={errors.cliente} autoFocus />
          </Field>
          <Field label="Descripción del trabajo" required error={errors.descripcion}>
            <Textarea rows={3} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Detalle de lo que se fabricará..." error={errors.descripcion} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Plazo de entrega" required error={errors.plazo_valor}>
              <div className="flex gap-2">
                <Input type="number" value={form.plazo_valor} onChange={e => setForm({ ...form, plazo_valor: e.target.value })} placeholder="30" error={errors.plazo_valor} />
                <Select value={form.plazo_unidad} onChange={e => setForm({ ...form, plazo_unidad: e.target.value })} className="!w-24"
                  options={[{value:'dias',label:'días'},{value:'meses',label:'meses'}]} />
              </div>
            </Field>
            <Field label="Anticipo requerido" required error={errors.anticipo_valor}>
              <div className="flex gap-2">
                <Input type="number" value={form.anticipo_valor} onChange={e => setForm({ ...form, anticipo_valor: e.target.value })} placeholder="0.00" error={errors.anticipo_valor} />
                <Select value={form.anticipo_moneda} onChange={e => setForm({ ...form, anticipo_moneda: e.target.value })} className="!w-20"
                  options={[{value:'ARS',label:'ARS'},{value:'USD',label:'USD'},{value:'EUR',label:'EUR'}]} />
              </div>
            </Field>
          </div>
          <Field label="Plazo para pago de anticipo (días)" required>
            <Input
              type="number"
              min="1"
              value={form.plazo_anticipo_dias}
              onChange={e => setForm({ ...form, plazo_anticipo_dias: e.target.value })}
              placeholder="7"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Días hábiles. Vencido este plazo sin validar, el sistema rechaza la OF automáticamente.
            </p>
          </Field>
        </div>
        <div className="border-t border-zinc-800 px-5 py-3 bg-zinc-900/40 flex justify-end gap-2 rounded-b-lg">
          <Button variant="ghost" onClick={() => { setDialogOpen(false); setErrors({}); }}>Cancelar</Button>
          <Button onClick={handleCreate} accent="blue" icon="check" disabled={saving}>{saving ? 'Guardando...' : 'Crear OF'}</Button>
        </div>
      </Dialog>
    </div>
  );
}
