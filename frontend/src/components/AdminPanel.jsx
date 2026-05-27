import React from 'react';
import { api } from '../api';
import {
  cx, Icon, Button, Textarea, Field,
  Badge, EstadoBadge, Card, CardHeader, CardTitle,
  Metric, useToast, Label, Tabs, useSearchShortcut,
  SectionLabel, EmptyState, ModuleHeader, MasterDetail,
} from './primitives';
import { usePermissions } from '../contexts/PermissionsContext';
import { useNodeEvents } from '../contexts/NotificationsContext';

export default function AdminPanel() {
  const { isReadonly } = usePermissions();
  const readonly = isReadonly('administracion');
  const [ordenes, setOrdenes] = React.useState([]);
  const [despachos, setDespachos] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState('anticipos');
  const [selected, setSelected] = React.useState(null);
  const [selectedDespacho, setSelectedDespacho] = React.useState(null);
  const [pagado, setPagado] = React.useState(false);
  const [observacion, setObservacion] = React.useState('');
  const [archivo, setArchivo] = React.useState(null);
  const [aprobado, setAprobado] = React.useState(true);
  const [obsDespacho, setObsDespacho] = React.useState('');
  const [comprobanteSaldo, setComprobanteSaldo] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [anticiposFilter, setAnticiposFilter] = React.useState('pendientes');
  const searchRef = React.useRef(null);
  useSearchShortcut(searchRef, () => setSearch(''));
  const toast = useToast();

  // 1/2 → cambio de tab
  React.useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName?.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) return;
      if (e.key === '1') setTab('anticipos');
      else if (e.key === '2') setTab('despachos');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const load = React.useCallback(async () => {
    try {
      const [ords, desps] = await Promise.all([
        api.administracion.getOrdenes(),
        api.logistica.getDespachos(),
      ]);
      setOrdenes(ords);
      setDespachos(desps);
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => { load(); }, [load]);
  useNodeEvents('administracion', load);

  const q = search.toLowerCase();
  const matchO = (o) => !q || `OF-${o.id} ${o.cliente} ${o.descripcion}`.toLowerCase().includes(q);
  const matchDesp = (d) => !q || `D-${d.id} Lote-${d.lote_id} ${d.destino} ${d.transportista}`.toLowerCase().includes(q);

  const pendientes  = ordenes.filter(o => o.anticipo?.estado === 'pendiente').filter(matchO);
  const validadas   = ordenes.filter(o => o.anticipo?.estado === 'validado').filter(matchO);
  const rechazadasA = ordenes.filter(o => o.anticipo?.estado === 'rechazado').filter(matchO);
  const despEnRevision = despachos.filter(d => d.estado === 'esperando_autorizacion').filter(matchDesp);
  // OFs finalizadas: lote en despacho ejecutado
  const despEjecutados  = despachos.filter(d => d.estado === 'ejecutado');
  const ofIdsFinalizadas = new Set(despEjecutados.map(d => d.lote_id));
  const MONEDAS = ['ARS', 'USD', 'EUR'];
  const MONEDA_SYMBOL = { ARS: '$', USD: 'U$S', EUR: '€' };
  const [monedaMetrica, setMonedaMetrica] = React.useState('ARS');
  const ciclicMoneda = () => setMonedaMetrica(m => MONEDAS[(MONEDAS.indexOf(m) + 1) % MONEDAS.length]);
  const montoPend = ordenes.filter(o => o.anticipo?.estado === 'pendiente').reduce((a, o) => a + (o.moneda_anticipo === monedaMetrica ? (o.monto_anticipo || 0) : 0), 0);
  const montoPendFmt = montoPend >= 1_000_000
    ? `${MONEDA_SYMBOL[monedaMetrica]} ${(montoPend / 1_000_000).toFixed(1)}M`
    : `${MONEDA_SYMBOL[monedaMetrica]} ${(montoPend / 1_000).toFixed(0)}k`;

  const handleSelect = (o) => {
    setSelected(o);
    setPagado(o.anticipo?.estado === 'validado');
    setObservacion(o.anticipo?.observacion || '');
    setArchivo(null);
  };

  const handleSubmitAnticipo = async () => {
    if (!selected?.anticipo) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('pagado', pagado ? 'true' : 'false');
      fd.append('observacion', observacion);
      if (archivo) fd.append('factura', archivo);
      await api.administracion.validarAnticipo(selected.anticipo.id, fd, true);
      toast({ type: pagado ? 'success' : 'error',
        msg: pagado ? `Anticipo OF-${selected.id} aprobado` : `Anticipo OF-${selected.id} rechazado` });
      setSelected(null);
      await load();
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAprobarDespacho = async () => {
    if (!selectedDespacho) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('aprobado', aprobado ? 'true' : 'false');
      fd.append('observacion', obsDespacho);
      if (comprobanteSaldo) fd.append('comprobante_saldo', comprobanteSaldo);
      await api.administracion.aprobarDespacho(selectedDespacho.id, fd, true);
      toast({ type: aprobado ? 'success' : 'error',
        msg: aprobado ? `Despacho D-${selectedDespacho.id} autorizado` : `Despacho D-${selectedDespacho.id} rechazado` });
      setSelectedDespacho(null);
      setObsDespacho('');
      setComprobanteSaldo(null);
      await load();
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const ListSection = ({ title, items }) => (
    <Card className="overflow-hidden">
      <CardHeader><CardTitle hint={items.length}>{title}</CardTitle></CardHeader>
      <div className="max-h-[300px] overflow-y-auto">
        {items.length === 0 ? <EmptyState icon="check-circle" msg="Sin registros" /> :
          items.map(o => (
            <button
              key={o.id}
              onClick={() => handleSelect(o)}
              className={cx(
                'w-full text-left px-4 py-2.5 border-b border-zinc-800/60 transition-colors border-l-2',
                selected?.id === o.id
                  ? 'bg-violet-500/10 border-l-violet-500'
                  : 'border-l-transparent hover:bg-zinc-800/40',
                o.anticipo?.estado !== 'pendiente' && 'opacity-70',
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs font-bold text-zinc-200">OF-{o.id}</span>
                {o.anticipo?.estado === 'pendiente' ? (
                  <span className="font-mono text-xs text-amber-400 font-semibold">
                    {o.moneda_anticipo} {Number(o.monto_anticipo).toLocaleString('es-AR')}
                  </span>
                ) : <EstadoBadge estado={o.anticipo?.estado || o.estado} />}
              </div>
              <div className="text-xs text-zinc-300 truncate">{o.cliente}</div>
              {o.anticipo?.estado === 'pendiente' && <div className="text-[11px] text-zinc-500 truncate mt-0.5">{o.descripcion}</div>}
            </button>
          ))
        }
      </div>
    </Card>
  );

  if (loading) return (
    <div>
      <ModuleHeader module="administracion" subtitle="Cargando..." />
      <div className="px-4 sm:px-7 py-10 text-zinc-500 text-sm">Cargando datos...</div>
    </div>
  );

  return (
    <div>
      <ModuleHeader module="administracion" subtitle="Validación de anticipos y autorización de despachos" actions={
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">
            <Icon name="search" size={13} />
          </span>
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="h-10 sm:h-8 pl-8 pr-3 w-full sm:w-52 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
          />
        </div>
      } />

      <div className="px-4 sm:px-7 pt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Pend. validación" value={pendientes.length} icon="alert" accent="amber" />
        <Metric label="Validados" value={validadas.length} icon="check-circle" accent="emerald" />
        <Metric label="Despachos en revisión" value={despEnRevision.length} icon="truck" accent="violet" />
        <Metric label="En espera" value={montoPendFmt} sub={`Anticipos ${monedaMetrica} · clic para cambiar`} icon="wallet" accent="violet" onClick={ciclicMoneda} />
      </div>

      <div className="px-4 sm:px-7 pt-4">
        <Tabs value={tab} onChange={setTab} accent="violet" items={[
          { value: 'anticipos', label: `Anticipos (${pendientes.length} pend.)` },
          { value: 'despachos', label: `Despachos (${despEnRevision.length} en revisión)` },
          { value: 'finalizadas', label: `Obras finalizadas (${despEjecutados.length})` },
        ]} />
      </div>

      {tab === 'anticipos' && (
        <div className="px-4 sm:px-7 py-5">
         <MasterDetail
          listWidth="320px"
          listSide="left"
          hasSelection={!!selected}
          onBack={() => setSelected(null)}
          backLabel="Anticipos"
          list={
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle hint={
                anticiposFilter === 'todas' ? ordenes.filter(matchO).length :
                anticiposFilter === 'pendientes' ? pendientes.length :
                anticiposFilter === 'validadas' ? validadas.length :
                rechazadasA.length
              }>Anticipos</CardTitle>
            </CardHeader>
            <div className="px-3 py-2 border-b border-zinc-800">
              <Tabs value={anticiposFilter} onChange={setAnticiposFilter} accent="violet" items={[
                { value: 'todas',      label: 'Todas', count: ordenes.filter(matchO).length },
                { value: 'pendientes', label: 'Pend.', count: pendientes.length },
                { value: 'validadas',  label: 'OK',    count: validadas.length },
                { value: 'rechazadas', label: 'Rech.', count: rechazadasA.length },
              ]} />
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {(() => {
                const items = anticiposFilter === 'todas' ? ordenes.filter(matchO) :
                             anticiposFilter === 'pendientes' ? pendientes :
                             anticiposFilter === 'validadas' ? validadas :
                             rechazadasA;
                
                return items.length === 0 ? <EmptyState icon="wallet" msg="Sin registros" /> :
                  items.map(o => (
                    <button
                      key={o.id}
                      onClick={() => handleSelect(o)}
                      className={cx(
                        'w-full text-left px-4 py-2.5 border-b border-zinc-800/60 transition-colors border-l-2',
                        selected?.id === o.id
                          ? 'bg-violet-500/10 border-l-violet-500'
                          : 'border-l-transparent hover:bg-zinc-800/40',
                        o.anticipo?.estado !== 'pendiente' && 'opacity-70',
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold text-zinc-200">OF-{o.id}</span>
                        {o.anticipo?.estado === 'pendiente' ? (
                          <span className="font-mono text-xs text-amber-400 font-semibold">
                            {o.moneda_anticipo} {Number(o.monto_anticipo).toLocaleString('es-AR')}
                          </span>
                        ) : <EstadoBadge estado={o.anticipo?.estado || o.estado} />}
                      </div>
                      <div className="text-xs text-zinc-300 truncate">{o.cliente}</div>
                      {o.anticipo?.estado === 'pendiente' && <div className="text-[11px] text-zinc-500 truncate mt-0.5">{o.descripcion}</div>}
                    </button>
                  ));
              })()}
            </div>
          </Card>
          }
          detail={
          <Card>
            {!selected ? (
              <EmptyState icon="wallet" msg="Seleccioná una OF para validar su anticipo" />
            ) : (
              <>
                <CardHeader actions={<EstadoBadge estado={selected.anticipo?.estado || 'pendiente'} />}>
                  <span className="font-mono text-base font-bold text-zinc-100 shrink-0">OF-{selected.id}</span>
                  <span className="text-sm text-zinc-500 truncate">{selected.cliente}</span>
                </CardHeader>

                <div className="p-5 space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 pb-5 border-b border-zinc-800">
                    <div>
                      <Label>Descripción</Label>
                      <p className="text-sm text-zinc-200">{selected.descripcion}</p>
                    </div>
                    <div>
                      <Label>Plazo entrega</Label>
                      <p className="text-sm text-zinc-200 font-mono">{selected.plazo_entrega}</p>
                    </div>
                    <div>
                      <Label>Monto anticipo</Label>
                      <p className="text-sm font-mono text-emerald-400 font-semibold">
                        {selected.moneda_anticipo} {Number(selected.monto_anticipo).toLocaleString('es-AR')}
                      </p>
                    </div>
                    <div>
                      <Label>Responsable</Label>
                      <p className="text-sm text-zinc-200">{selected.responsable_nombre ?? '—'}</p>
                    </div>
                    <div>
                      <Label>Plazo anticipo</Label>
                      <p className="text-sm text-zinc-200 font-mono">{selected.plazo_anticipo_dias ?? 7} días</p>
                    </div>
                  </div>

                  {selected.anticipo?.estado === 'pendiente' ? (
                    <>
                      <SectionLabel>Validación</SectionLabel>

                      <div className="flex items-center justify-between p-3 rounded-md border border-zinc-800 bg-zinc-950/40">
                        <div>
                          <div className="text-sm text-zinc-200 font-medium">Anticipo recibido</div>
                          <div className="text-xs text-zinc-500 mt-0.5">Confirmar transferencia / depósito</div>
                        </div>
                        <button
                          onClick={() => setPagado(!pagado)}
                          role="switch"
                          aria-checked={pagado}
                          className={cx(
                            'relative w-12 h-6 rounded-full transition-colors p-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40',
                            pagado ? 'bg-emerald-500' : 'bg-zinc-700',
                          )}
                        >
                          <div className={cx('w-5 h-5 rounded-full bg-white shadow-md transition-transform', pagado ? 'translate-x-6' : 'translate-x-0')} />
                        </button>
                      </div>

                      <Field label="Factura / Comprobante">
                        <label className="flex items-center gap-3 px-3 py-2 rounded-md border border-dashed border-zinc-800 bg-zinc-950/40 cursor-pointer hover:border-violet-500/60 hover:bg-violet-500/5 transition-colors">
                          <Icon name="upload" size={16} className="text-zinc-500" />
                          <span className="text-xs text-zinc-400 flex-1">
                            {archivo ? archivo.name : 'Arrastrá un PDF o hacé click para seleccionar'}
                          </span>
                          {archivo && <Badge accent="emerald">cargado</Badge>}
                          <input type="file" className="hidden" onChange={e => setArchivo(e.target.files[0] || null)} />
                        </label>
                      </Field>

                      <Field label="Observación">
                        <Textarea rows={2} value={observacion} onChange={e => setObservacion(e.target.value)} placeholder="Notas sobre la validación..." />
                      </Field>

                      {!readonly && (
                        <div className="flex gap-2 pt-2 border-t border-zinc-800">
                          <Button onClick={handleSubmitAnticipo} disabled={saving}
                            variant={pagado ? 'success' : 'danger'} icon={pagado ? 'check' : 'x'} className="flex-1">
                            {saving ? 'Guardando...' : pagado ? 'Aprobar anticipo' : 'Rechazar anticipo'}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <p className="text-sm text-zinc-400 mb-3">Anticipo ya procesado.</p>
                      {selected.anticipo?.observacion && (
                        <Field label="Observación registrada">
                          <p className="text-sm text-zinc-200 bg-zinc-950/60 border border-zinc-800 rounded-md p-3">
                            {selected.anticipo.observacion}
                          </p>
                        </Field>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>
          }
         />
        </div>
      )}

      {tab === 'despachos' && (
        <div className="px-4 sm:px-7 py-5">
         <MasterDetail
          listWidth="320px"
          listSide="left"
          hasSelection={!!selectedDespacho}
          onBack={() => setSelectedDespacho(null)}
          backLabel="Despachos"
          list={
          <Card className="overflow-hidden">
            <CardHeader><CardTitle hint={despEnRevision.length}>En revisión</CardTitle></CardHeader>
            <div className="max-h-[500px] overflow-y-auto">
              {despEnRevision.length === 0 ? <EmptyState icon="truck" msg="Sin despachos en revisión" /> :
                despEnRevision.map(d => (
                  <button
                    key={d.id}
                    onClick={() => { setSelectedDespacho(d); setAprobado(true); setObsDespacho(''); }}
                    className={cx(
                      'w-full text-left px-4 py-2.5 border-b border-zinc-800/60 transition-colors border-l-2',
                      selectedDespacho?.id === d.id ? 'bg-violet-500/10 border-l-violet-500' : 'border-l-transparent hover:bg-zinc-800/40',
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-zinc-200">D-{d.id}</span>
                      <EstadoBadge estado={d.estado} />
                    </div>
                    <div className="text-xs text-zinc-400">Lote #{d.lote_id} · {d.destino}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{d.transportista}</div>
                  </button>
                ))
              }
            </div>
          </Card>
          }
          detail={
          <Card>
            {!selectedDespacho ? (
              <EmptyState icon="truck" msg="Seleccioná un despacho para revisar" />
            ) : (
              <>
                <CardHeader actions={<EstadoBadge estado={selectedDespacho.estado} />}>
                  <span className="font-mono text-base font-bold text-zinc-100">Despacho D-{selectedDespacho.id}</span>
                </CardHeader>
                <div className="p-5 space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 pb-5 border-b border-zinc-800">
                    <div><Label>Lote</Label><p className="text-sm text-zinc-200 font-mono">Lote-{selectedDespacho.lote_id}</p></div>
                    <div><Label>Destino</Label><p className="text-sm text-zinc-200">{selectedDespacho.destino}</p></div>
                    <div><Label>Transportista</Label><p className="text-sm text-zinc-200">{selectedDespacho.transportista}</p></div>
                  </div>

                  <SectionLabel>Resolución</SectionLabel>
                  <div className="flex items-center justify-between p-3 rounded-md border border-zinc-800 bg-zinc-950/40">
                    <div>
                      <div className="text-sm text-zinc-200 font-medium">Autorizar despacho</div>
                      <div className="text-xs text-zinc-500 mt-0.5">Activar para aprobar, desactivar para rechazar</div>
                    </div>
                    <button
                      onClick={() => setAprobado(!aprobado)}
                      className={cx('relative w-12 h-6 rounded-full transition-colors p-0.5', aprobado ? 'bg-emerald-500' : 'bg-zinc-700')}
                    >
                      <div className={cx('w-5 h-5 rounded-full bg-white shadow-md transition-transform', aprobado ? 'translate-x-6' : 'translate-x-0')} />
                    </button>
                  </div>

                  <Field label="Comprobante de saldo restante">
                    <label className="flex items-center gap-3 px-3 py-2 rounded-md border border-dashed border-zinc-800 bg-zinc-950/40 cursor-pointer hover:border-violet-500/60 hover:bg-violet-500/5 transition-colors">
                      <Icon name="upload" size={16} className="text-zinc-500" />
                      <span className="text-xs text-zinc-400 flex-1">
                        {comprobanteSaldo ? comprobanteSaldo.name : 'Adjuntar comprobante del saldo (PDF/imagen)'}
                      </span>
                      {comprobanteSaldo && <Badge accent="emerald">cargado</Badge>}
                      <input type="file" className="hidden" onChange={e => setComprobanteSaldo(e.target.files[0] || null)} />
                    </label>
                  </Field>

                  <Field label="Observación">
                    <Textarea rows={2} value={obsDespacho} onChange={e => setObsDespacho(e.target.value)} placeholder="Notas..." />
                  </Field>

                  {!readonly && (
                    <div className="flex gap-2 pt-2 border-t border-zinc-800">
                      <Button onClick={handleAprobarDespacho} disabled={saving}
                        variant={aprobado ? 'success' : 'danger'} icon={aprobado ? 'check' : 'x'} className="flex-1">
                        {saving ? 'Guardando...' : aprobado ? 'Autorizar despacho' : 'Rechazar despacho'}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>
          }
         />
        </div>
      )}

      {tab === 'finalizadas' && (
        <div className="px-4 sm:px-7 py-5 space-y-4">
          {despEjecutados.length === 0 ? (
            <Card><EmptyState icon="check-circle" msg="Sin obras finalizadas aún" /></Card>
          ) : (
            despEjecutados.map(d => {
              const ordenRel = ordenes.find(o => o.id === d.of_id);
              const anticipo = ordenRel?.anticipo;
              return (
                <Card key={d.id}>
                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-base font-bold text-zinc-100">D-{d.id}</span>
                        <span className="font-mono text-sm text-orange-400">Lote-{d.lote_id}</span>
                        {ordenRel && (
                          <span className="font-mono text-sm text-blue-400">OF-{ordenRel.id} — {ordenRel.cliente}</span>
                        )}
                        <EstadoBadge estado={d.estado} />
                      </div>
                      <span className="font-mono text-xs text-zinc-500">{d.updated_at?.split('T')[0]}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-4">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Destino</p>
                        <p className="text-sm text-zinc-300">{d.destino}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Transportista</p>
                        <p className="text-sm text-zinc-300">{d.transportista}</p>
                      </div>
                      {ordenRel && (
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Responsable OF</p>
                          <p className="text-sm text-zinc-300">{ordenRel.responsable_nombre ?? '—'}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-zinc-800">
                      <div className="rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                          Comprobante de anticipo
                        </p>
                        {anticipo?.factura_archivo ? (
                          <div className="flex items-center gap-2 text-xs text-emerald-400">
                            <Icon name="check-circle" size={13} />
                            <span className="truncate">{anticipo.factura_archivo.nombre}</span>
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-600">No adjuntado</p>
                        )}
                      </div>
                      <div className="rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                          Comprobante de saldo
                        </p>
                        {d.comprobante_saldo ? (
                          <a
                            href={d.comprobante_saldo}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                          >
                            <Icon name="arrow-right" size={13} />
                            Ver comprobante
                          </a>
                        ) : (
                          <p className="text-xs text-zinc-600">No adjuntado</p>
                        )}
                      </div>
                    </div>

                    {d.observacion_admin && (
                      <div className="mt-3 pt-3 border-t border-zinc-800">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Observación</p>
                        <p className="text-xs text-zinc-300">{d.observacion_admin}</p>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
