import React from 'react';
import { api } from '../api';
import {
  cx, Icon, Button, Input, Field, Select,
  EstadoBadge, Card, CardHeader, CardTitle,
  Metric, useToast, useSearchShortcut,
  DataTable, ModuleHeader, EmptyState, MasterDetail,
} from './primitives';
import { usePermissions } from '../contexts/PermissionsContext';
import { useNodeEvents } from '../contexts/NotificationsContext';

const MOCK_DESPACHOS = [
  { id: 101, lote_id: 50, destino: "Av. Siempre Viva 742, CABA", transportista: "Transportes Charly", estado: 'pendiente', created_at: '2026-05-30T10:00:00Z' },
  { id: 102, lote_id: 51, destino: "Calle Falsa 123, Córdoba", transportista: "Expreso Norte", estado: 'esperando_autorizacion', created_at: '2026-05-31T11:30:00Z' },
  { id: 103, lote_id: 52, destino: "Ruta 2 km 45, La Plata", transportista: "Logística S.A.", estado: 'autorizado', created_at: '2026-06-01T09:15:00Z', observacion_admin: "Todo conforme, proceder con el envío." },
  { id: 104, lote_id: 53, destino: "Parque Industrial, Salta", transportista: "Cargas Rápidas", estado: 'rechazado', created_at: '2026-05-28T14:20:00Z', observacion_admin: "Falta comprobante de pago del saldo restante." },
];

const MOCK_LOTES = [
  { id: 50, of_id: 200, estado: 'terminado' },
  { id: 51, of_id: 201, estado: 'en_despacho' },
  { id: 52, of_id: 202, estado: 'terminado' },
  { id: 53, of_id: 203, estado: 'en_despacho' },
  { id: 60, of_id: 205, estado: 'terminado' },
  { id: 61, of_id: 206, estado: 'terminado' },
];

function DespachoDetalle({ despacho, onClose, onAccion, readonly }) {
  const Field2 = ({ label, children, full }) => (
    <div className={full ? 'col-span-2' : ''}>
      <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1">{label}</p>
      <div className="text-sm text-zinc-200">{children}</div>
    </div>
  );

  return (
    <div className="border-t border-zinc-700 bg-zinc-900/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-base font-bold text-zinc-100">D-{despacho.id}</span>
          <EstadoBadge estado={despacho.estado} />
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 transition-colors"
        >
          <Icon name="x" size={15} />
        </button>
      </div>

      {/* Info grid */}
      <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
        <Field2 label="Lote">
          <span className="font-mono text-orange-400">Lote-{despacho.lote_id}</span>
        </Field2>
        <Field2 label="Creado">
          <span className="font-mono text-zinc-400">
            {despacho.created_at ? despacho.created_at.split('T')[0] : '—'}
          </span>
        </Field2>
        <Field2 label="Destino" full>
          <span className="leading-relaxed text-zinc-300">{despacho.destino}</span>
        </Field2>
        <Field2 label="Transportista" full>
          <span className="text-zinc-300">{despacho.transportista}</span>
        </Field2>

        {despacho.observacion_admin && (
          <div className="col-span-2 rounded-md border border-zinc-700 bg-zinc-950/60 px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
              Observación — Administración
            </p>
            <p className="text-xs text-zinc-300 leading-relaxed">{despacho.observacion_admin}</p>
          </div>
        )}

        {/* Acciones */}
        {!readonly && (despacho.estado === 'pendiente' || despacho.estado === 'autorizado') && (
          <div className="col-span-2 flex justify-end gap-2 pt-1 border-t border-zinc-800">
            {despacho.estado === 'pendiente' && (
              <Button
                accent="amber" icon="alert"
                onClick={() => onAccion(despacho.id, 'solicitar')}
              >
                Solicitar autorización
              </Button>
            )}
            {despacho.estado === 'autorizado' && (
              <Button
                accent="orange" icon="truck"
                onClick={() => onAccion(despacho.id, 'ejecutar')}
              >
                Ejecutar despacho
              </Button>
            )}
          </div>
        )}

        {despacho.estado === 'esperando_autorizacion' && (
          <div className="col-span-2 flex items-center gap-2 pt-1 border-t border-zinc-800 text-xs text-zinc-500">
            <Icon name="alert" size={13} />
            Pendiente de aprobación por Administración
          </div>
        )}

        {despacho.estado === 'rechazado' && (
          <div className="col-span-2 flex items-center gap-2 pt-1 border-t border-zinc-800 text-xs text-rose-400">
            <Icon name="x" size={13} />
            Despacho rechazado — crear uno nuevo para reintentar
          </div>
        )}

        {despacho.estado === 'ejecutado' && (
          <div className="col-span-2 flex items-center gap-2 pt-1 border-t border-zinc-800 text-xs text-emerald-400">
            <Icon name="check-circle" size={13} />
            Despacho completado exitosamente
          </div>
        )}
      </div>
    </div>
  );
}

export default function LogisticaPanel({ openNewSignal }) {
  const { isReadonly } = usePermissions();
  const readonly = isReadonly('logistica');
  const [despachos, setDespachos] = React.useState([]);
  const [lotes, setLotes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState(null);
  const [form, setForm] = React.useState({ lote_id: '', destino: '', transportista: '' });
  const [saving, setSaving] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const searchRef = React.useRef(null);
  useSearchShortcut(searchRef, () => setSearch(''));
  const toast = useToast();

  const load = React.useCallback(async () => {
    try {
      const [desps, lotesData] = await Promise.all([
        api.logistica.getDespachos(),
        api.produccion.getLotes(),
      ]);
      
      // Merge with mocks
      const mergedDesps = [...MOCK_DESPACHOS, ...desps];
      const mergedLotes = [...MOCK_LOTES, ...lotesData];

      setDespachos(mergedDesps);
      // Lotes disponibles: terminado o en_despacho sin despacho activo (rechazados no bloquean)
      const occupiedLoteIds = new Set(
        mergedDesps.filter(d => d.estado !== 'rechazado').map(d => d.lote_id)
      );
      setLotes(mergedLotes.filter(l =>
        (l.estado === 'terminado' || l.estado === 'en_despacho') &&
        !occupiedLoteIds.has(l.id)
      ));
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => { load(); }, [load]);
  useNodeEvents('logistica', load);

  // Sync selected con datos frescos tras cada recarga
  React.useEffect(() => {
    if (!selected) return;
    const updated = despachos.find(d => d.id === selected.id);
    setSelected(updated ?? null);
  }, [despachos]); // eslint-disable-line react-hooks/exhaustive-deps

  // N → foco en formulario nuevo despacho
  React.useEffect(() => {
    if (!openNewSignal) return;
    document.getElementById('despacho-lote-select')?.focus();
  }, [openNewSignal]);

  // Esc → cierra detalle expandido (cuando búsqueda no está activa)
  React.useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return;
      if (document.activeElement === searchRef.current) return;
      const tag = e.target.tagName?.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag)) return;
      if (selected) setSelected(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = search.toLowerCase();
  const matchD = (d) => !q || `D-${d.id} Lote-${d.lote_id} ${d.destino} ${d.transportista} ${d.estado}`.toLowerCase().includes(q);

  const pendientes        = despachos.filter(d => d.estado === 'pendiente');
  const esperandoAuth     = despachos.filter(d => d.estado === 'esperando_autorizacion');
  const autorizados       = despachos.filter(d => d.estado === 'autorizado');
  const ejecutados        = despachos.filter(d => d.estado === 'ejecutado').filter(matchD);
  const rechazados        = despachos.filter(d => d.estado === 'rechazado');
  const activos = [...pendientes, ...esperandoAuth, ...autorizados, ...rechazados].filter(matchD);

  const handleAccion = async (id, accion) => {
    try {
      if (accion === 'solicitar') {
        await api.logistica.solicitarAutorizacion(id);
        toast({ msg: `Autorización solicitada para D-${id}` });
      } else if (accion === 'ejecutar') {
        await api.logistica.ejecutar(id);
        toast({ msg: `Despacho D-${id} ejecutado` });
      }
      await load();
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    }
  };

  const handleCrear = async () => {
    if (!form.lote_id || !form.destino.trim() || !form.transportista.trim()) return;
    setSaving(true);
    try {
      const d = await api.logistica.createDespacho({
        lote_id: parseInt(form.lote_id),
        destino: form.destino,
        transportista: form.transportista,
      });
      await load();
      setForm({ lote_id: '', destino: '', transportista: '' });
      toast({ msg: `Despacho D-${d.id} creado` });
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleRowClick = (row) => {
    setSelected(prev => prev?.id === row.id ? null : row);
  };

  const tableColumns = (showActions) => [
    { key: 'id', label: 'Despacho', mono: true, sortable: true, cell: r => <span className="font-mono font-bold text-zinc-200">D-{r.id}</span> },
    { key: 'lote_id', label: 'Lote', mono: true, cell: r => <span className="text-zinc-500 font-mono">Lote-{r.lote_id}</span> },
    { key: 'destino', label: 'Destino', cell: r => <span className="text-zinc-400 text-xs truncate max-w-[180px] block">{r.destino}</span> },
    { key: 'transportista', label: 'Transportista', cell: r => <span className="text-zinc-300">{r.transportista}</span> },
    { key: 'estado', label: 'Estado', cell: r => <EstadoBadge estado={r.estado} /> },
    {
      key: 'obs', label: 'Obs. admin.',
      cell: r => r.observacion_admin
        ? <span className="text-xs text-zinc-400 italic line-clamp-1 max-w-[200px]" title={r.observacion_admin}>{r.observacion_admin}</span>
        : <span className="text-zinc-700 text-xs">—</span>,
    },
    ...(showActions ? [{
      key: 'accion', label: '',
      cell: r => (
        <div onClick={e => e.stopPropagation()}>
          {r.estado === 'pendiente' && (
            <Button size="xs" accent="amber" onClick={() => handleAccion(r.id, 'solicitar')} icon="alert">
              Solicitar auth.
            </Button>
          )}
          {r.estado === 'autorizado' && (
            <Button size="xs" accent="orange" onClick={() => handleAccion(r.id, 'ejecutar')} icon="truck">
              Ejecutar
            </Button>
          )}
        </div>
      ),
    }] : []),
  ];

  if (loading) return (
    <div>
      <ModuleHeader module="logistica" subtitle="Cargando..." />
      <div className="px-4 sm:px-7 py-10 text-zinc-500 text-sm">Cargando datos...</div>
    </div>
  );

  return (
    <div>
      <ModuleHeader module="logistica" subtitle="Autorización y ejecución de despachos" actions={
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">
            <Icon name="search" size={13} />
          </span>
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar despacho..."
            className="h-10 sm:h-8 pl-8 pr-3 w-full sm:w-52 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
          />
        </div>
      } />

      <div className="px-4 sm:px-7 pt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Pendientes" value={pendientes.length} icon="alert" accent="amber" />
        <Metric label="En revisión admin" value={esperandoAuth.length} icon="alert" accent="violet" />
        <Metric label="Autorizados" value={autorizados.length} icon="check-circle" accent="emerald" />
        <Metric label="Ejecutados" value={ejecutados.length} icon="truck" accent="orange" />
      </div>

      <div className="px-4 sm:px-7 py-5">
       <MasterDetail
        listWidth="850px"
        listSide="right"
        stack
        hasSelection={false}
        onBack={() => setSelected(null)}
        backLabel="Despachos"
        list={
        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle hint={activos.length}>Despachos activos</CardTitle>
            </CardHeader>
            {activos.length === 0
              ? <EmptyState icon="truck" msg="Sin despachos activos" />
              : (
                <DataTable
                  data={activos}
                  columns={tableColumns(!readonly)}
                  onRowClick={handleRowClick}
                  selectedId={selected?.id}
                  renderExpanded={(row) => (
                    <DespachoDetalle
                      despacho={row}
                      onClose={() => setSelected(null)}
                      onAccion={handleAccion}
                      readonly={readonly}
                    />
                  )}
                />
              )
            }
          </Card>

          {ejecutados.length > 0 && (
            <Card>
              <CardHeader><CardTitle hint={ejecutados.length}>Ejecutados</CardTitle></CardHeader>
              <DataTable
                data={ejecutados}
                columns={tableColumns(false)}
                onRowClick={handleRowClick}
                selectedId={selected?.id}
                renderExpanded={(row) => (
                  <DespachoDetalle
                    despacho={row}
                    onClose={() => setSelected(null)}
                    onAccion={handleAccion}
                    readonly={readonly}
                  />
                )}
              />
            </Card>
          )}
        </div>
        }
        detail={
        <Card className="sticky top-[88px]">
          <CardHeader><CardTitle>Nuevo despacho</CardTitle></CardHeader>
          <div className="p-4 space-y-3">
            <Field label="Lote" required>
              <Select
                id="despacho-lote-select"
                value={form.lote_id}
                onChange={e => setForm({ ...form, lote_id: e.target.value })}
                options={[
                  { value: '', label: 'Seleccioná lote...' },
                  ...lotes.map(l => ({ value: l.id, label: `Lote-${l.id} — OF-${l.of_id}` })),
                ]}
              />
              {lotes.length === 0 && (
                <p className="text-[11px] text-zinc-500 mt-1">
                  Sin lotes disponibles — Producción debe registrar lotes terminados
                </p>
              )}
            </Field>
            <Field label="Destino" required>
              <Input
                value={form.destino}
                onChange={e => setForm({ ...form, destino: e.target.value })}
                placeholder="Dirección del cliente..."
              />
            </Field>
            <Field label="Transportista" required>
              <Input
                value={form.transportista}
                onChange={e => setForm({ ...form, transportista: e.target.value })}
                placeholder="Razón social..."
              />
            </Field>
            {!readonly && (
              <Button
                onClick={handleCrear}
                disabled={!form.lote_id || !form.destino.trim() || !form.transportista.trim() || saving}
                accent="orange"
                className="w-full"
                icon="truck"
              >
                {saving ? 'Guardando...' : 'Crear despacho'}
              </Button>
            )}
          </div>
        </Card>
        }
       />
      </div>
    </div>
  );
}
