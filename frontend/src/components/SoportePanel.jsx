import React from 'react';
import {
  cx, Icon, Button, Input, Textarea, Field, Card, CardHeader, CardTitle,
  Badge, EmptyState, ModuleHeader, Tabs, Toggle, useToast,
} from './primitives';
import { api } from '../api';

const ATTACH_MAX_FILES = 5;
const ATTACH_MAX_SIZE = 10 * 1024 * 1024;
const ATTACH_ALLOWED_EXT = ['jpg','jpeg','png','gif','webp','pdf','doc','docx','xls','xlsx','ppt','pptx','csv','txt','log','zip'];
const ATTACH_ACCEPT = ATTACH_ALLOWED_EXT.map(e => '.' + e).join(',');

function fmtSize(n) {
  if (!n) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function fileIcon(contentType, name) {
  const ct = (contentType || '').toLowerCase();
  if (ct.startsWith('image/')) return 'file-text';
  if (ct === 'application/pdf' || (name || '').toLowerCase().endsWith('.pdf')) return 'file-text';
  return 'file-text';
}


const STATUS_ACCENT = {
  abierto: 'amber', en_proceso: 'cyan', resuelto: 'emerald', cerrado: 'slate',
};
const STATUS_LABEL = {
  abierto: 'Abierto', en_proceso: 'En proceso', resuelto: 'Resuelto', cerrado: 'Cerrado',
};
const PRIORITY_ACCENT = {
  baja: 'slate', media: 'blue', alta: 'amber', urgente: 'rose',
};
const PRIORITY_LABEL = {
  baja: 'Baja', media: 'Media', alta: 'Alta', urgente: 'Urgente',
};
const APP_ACCENT = {
  comercial: 'blue', administracion: 'violet', desarrollo: 'cyan',
  compras: 'amber', panol: 'emerald', produccion: 'rose', logistica: 'orange',
};


function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}


// ─── Trazabilidad de OF ──────────────────────────────────────────────────────

function TrazabilidadTab() {
  const toast = useToast();
  const [ofs, setOfs] = React.useState([]);
  const [loadingList, setLoadingList] = React.useState(true);
  const [q, setQ] = React.useState('');
  const [selected, setSelected] = React.useState(null);
  const [timeline, setTimeline] = React.useState(null);
  const [loadingTl, setLoadingTl] = React.useState(false);

  const fetchOFs = React.useCallback(async (query) => {
    setLoadingList(true);
    try {
      const data = await api.soporte.listOFs(query);
      setOfs(data || []);
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setLoadingList(false);
    }
  }, [toast]);

  React.useEffect(() => { fetchOFs(''); }, [fetchOFs]);

  // Debounce búsqueda
  React.useEffect(() => {
    const t = setTimeout(() => fetchOFs(q), 300);
    return () => clearTimeout(t);
  }, [q, fetchOFs]);

  const handleSelect = async (of) => {
    setSelected(of);
    setTimeline(null);
    setLoadingTl(true);
    try {
      const res = await api.soporte.getTrazabilidad(of.id);
      setTimeline(res);
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setLoadingTl(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      {/* Lista de OFs */}
      <Card className="lg:sticky lg:top-[88px] lg:self-start lg:max-h-[calc(100vh-100px)] flex flex-col overflow-hidden">
        <CardHeader>
          <CardTitle hint={ofs.length}>Órdenes de fabricación</CardTitle>
        </CardHeader>
        <div className="px-3 pb-2">
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por cliente..."
          />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60">
          {loadingList ? (
            <div className="px-3 py-6 text-zinc-500 text-xs">Cargando...</div>
          ) : ofs.length === 0 ? (
            <EmptyState icon="briefcase" msg="Sin OF" hint="Probá otro término" />
          ) : (
            ofs.map(o => (
              <button
                key={o.id}
                onClick={() => handleSelect(o)}
                className={cx(
                  'w-full text-left px-3 py-2.5 hover:bg-zinc-900/60 transition-colors',
                  selected?.id === o.id && 'bg-rose-500/5 border-l-2 border-rose-500'
                )}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[10px] text-zinc-500">#{o.id}</span>
                  <span className="font-medium text-sm text-zinc-200 truncate">{o.cliente}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                  <span>{o.estado}</span>
                  <span>·</span>
                  <span>{fmtDate(o.created_at)}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle hint={timeline?.count ?? ''}>
            {selected ? `Trazabilidad — OF #${selected.id} ${selected.cliente}` : 'Seleccioná una OF'}
          </CardTitle>
        </CardHeader>
        <div className="p-4">
          {!selected ? (
            <EmptyState icon="compass" msg="Elegí una orden" hint="Vas a ver toda la historia de cambios desde su creación." />
          ) : loadingTl ? (
            <div className="text-zinc-500 text-sm">Cargando timeline...</div>
          ) : !timeline || timeline.timeline.length === 0 ? (
            <EmptyState icon="file-text" msg="Sin historial" hint="Aún no hay registros para esta OF." />
          ) : (
            <ol className="relative border-l-2 border-zinc-800 ml-3 space-y-3">
              {timeline.timeline.map((ev, i) => (
                <TimelineItem key={i} ev={ev} />
              ))}
            </ol>
          )}
        </div>
      </Card>
    </div>
  );
}


function TimelineItem({ ev }) {
  const [open, setOpen] = React.useState(false);
  const accent = APP_ACCENT[ev.app] || 'slate';
  const accionAccent = ev.history_type === '+' ? 'emerald' : ev.history_type === '-' ? 'rose' : 'cyan';

  return (
    <li className="ml-4">
      <span className={cx(
        'absolute -left-[7px] w-3 h-3 rounded-full border-2',
        accent === 'blue'    && 'bg-blue-500 border-blue-300',
        accent === 'violet'  && 'bg-violet-500 border-violet-300',
        accent === 'cyan'    && 'bg-cyan-500 border-cyan-300',
        accent === 'amber'   && 'bg-amber-500 border-amber-300',
        accent === 'emerald' && 'bg-emerald-500 border-emerald-300',
        accent === 'rose'    && 'bg-rose-500 border-rose-300',
        accent === 'orange'  && 'bg-orange-500 border-orange-300',
        accent === 'slate'   && 'bg-zinc-500 border-zinc-300',
      )} />

      <div className="rounded-md border border-zinc-800/80 bg-zinc-950/60 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge accent={accent} dot>{ev.app}</Badge>
          <span className="text-zinc-400 font-medium">{ev.modelo}</span>
          <span className="text-zinc-600">·</span>
          <Badge accent={accionAccent}>{ev.accion}</Badge>
          <span className="text-zinc-600">·</span>
          <span className="font-mono text-[10px] text-zinc-500">{ev.ref_label}</span>
          <span className="ml-auto font-mono text-[10px] text-zinc-500">{fmtDate(ev.ts)}</span>
        </div>

        {ev.usuario && (
          <div className="mt-1 text-[11px] text-zinc-500">
            por <span className="text-zinc-300">{ev.usuario}</span>
          </div>
        )}

        {ev.changes && ev.changes.length > 0 && (
          <div className="mt-2 space-y-1">
            {ev.changes.map((c, j) => (
              <div key={j} className="text-[11px] font-mono">
                <span className="text-zinc-500">{c.field}</span>
                <span className="text-zinc-600 mx-1.5">:</span>
                <span className="text-rose-400 line-through">{c.old ?? '∅'}</span>
                <span className="text-zinc-600 mx-1.5">→</span>
                <span className="text-emerald-400">{c.new ?? '∅'}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setOpen(o => !o)}
          className="mt-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
        >
          {open ? '− snapshot' : '+ snapshot'}
        </button>
        {open && (
          <pre className="mt-1 p-2 rounded bg-black/40 text-[10px] text-zinc-400 overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(ev.snapshot, null, 2)}
          </pre>
        )}
      </div>
    </li>
  );
}


// ─── Tickets ──────────────────────────────────────────────────────────────────

function TicketsTab() {
  const toast = useToast();
  const [tickets, setTickets] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState(null);
  const [reply, setReply] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.soporte.listTickets();
      setTickets(data || []);
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  const updateTicket = async (id, patch) => {
    try {
      const updated = await api.soporte.patchTicket(id, patch);
      setTickets(ts => ts.map(t => t.id === id ? updated : t));
      toast({ msg: 'Ticket actualizado' });
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    }
  };

  const submitReply = async (id) => {
    const body = reply.trim();
    if (!body) return;
    setSubmitting(true);
    try {
      await api.soporte.addComment(id, { body });
      setReply('');
      // Recargo el ticket con sus comentarios actualizados
      const t = await api.soporte.getTicket(id);
      setTickets(ts => ts.map(x => x.id === id ? t : x));
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader actions={<Button variant="ghost" size="sm" icon="search" onClick={load}>Recargar</Button>}>
        <CardTitle hint={tickets.length}>Bandeja de tickets</CardTitle>
      </CardHeader>
      {loading ? (
        <div className="px-4 py-10 text-zinc-500 text-sm">Cargando...</div>
      ) : tickets.length === 0 ? (
        <EmptyState icon="mail" msg="Sin tickets" hint="Cuando alguien escriba a soporte aparecerá acá." />
      ) : (
        <ul className="divide-y divide-zinc-800/60">
          {tickets.map(t => {
            const isOpen = expanded === t.id;
            return (
              <li key={t.id}>
                <button
                  onClick={() => { setExpanded(isOpen ? null : t.id); setReply(''); }}
                  className="w-full text-left px-4 py-3 hover:bg-zinc-900/40 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-mono text-xs text-zinc-500">#{t.numero}</span>
                    <span className="font-medium text-zinc-200 flex-1 truncate">{t.subject}</span>
                    <Badge accent={PRIORITY_ACCENT[t.priority]} dot>{PRIORITY_LABEL[t.priority]}</Badge>
                    <Badge accent={STATUS_ACCENT[t.status]} dot>{STATUS_LABEL[t.status]}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                    <span>{t.created_by_name}</span>
                    {t.snapshot_role && <><span>·</span><span>{t.snapshot_role}</span></>}
                    <span>·</span>
                    <span className="font-mono">{fmtDate(t.created_at)}</span>
                    {t.comments?.length > 0 && (
                      <>
                        <span>·</span>
                        <span>{t.comments.length} comentario{t.comments.length === 1 ? '' : 's'}</span>
                      </>
                    )}
                  </div>
                </button>

                {isOpen && (() => {
                  const isClosed = t.status === 'cerrado';
                  const confirmAndClose = () => {
                    if (window.confirm(
                      `¿Cerrar definitivamente el ticket #${t.numero}?\n\n`
                      + 'Una vez cerrado NO se podrán modificar parámetros, '
                      + 'agregar comentarios, ni subir/eliminar adjuntos. '
                      + 'Esta acción es irreversible.'
                    )) {
                      updateTicket(t.id, { status: 'cerrado' });
                    }
                  };
                  return (
                  <div className="px-4 pb-4 space-y-3 border-t border-zinc-800/60 bg-zinc-950/40">
                    {isClosed && (
                      <div className="mt-3 rounded-md border border-amber-700/40 bg-amber-500/5 px-3 py-2 flex items-center gap-2 text-xs text-amber-300">
                        <Icon name="alert" size={14} className="shrink-0" />
                        <span>Ticket cerrado — solo lectura. No se admiten modificaciones.</span>
                      </div>
                    )}

                    {/* Sliders Resuelto / Cerrado (mutuamente excluyentes) */}
                    <div className={cx('grid grid-cols-1 sm:grid-cols-2 gap-2', !isClosed && 'pt-3')}>
                      <Toggle
                        label="Resuelto"
                        hint="Marca el ticket como solucionado (se mantiene visible)"
                        accent="emerald"
                        checked={t.status === 'resuelto'}
                        onChange={isClosed ? undefined : (next) => {
                          if (next) updateTicket(t.id, { status: 'resuelto' });
                          else updateTicket(t.id, { status: 'en_proceso' });
                        }}
                      />
                      <Toggle
                        label="Cerrado"
                        hint={isClosed ? 'Bloqueado — el cierre es irreversible' : 'Cierra definitivamente el ticket (irreversible)'}
                        accent="rose"
                        checked={isClosed}
                        onChange={isClosed ? undefined : (next) => {
                          if (next) confirmAndClose();
                        }}
                      />
                    </div>

                    {/* Meta: prioridad / contacto */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Field label="Prioridad">
                        <select
                          value={t.priority}
                          onChange={e => updateTicket(t.id, { priority: e.target.value })}
                          disabled={isClosed}
                          className={cx(
                            'h-9 w-full rounded-md bg-zinc-950/50 border border-zinc-800 px-3 text-sm text-zinc-100',
                            !isClosed && 'hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40',
                            isClosed && 'opacity-60 cursor-not-allowed',
                          )}
                        >
                          {Object.entries(PRIORITY_LABEL).map(([v, l]) => (
                            <option key={v} value={v} className="bg-zinc-900">{l}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Contacto">
                        <div className="h-9 flex items-center text-xs text-zinc-400 font-mono break-all">
                          {t.snapshot_email || '—'}
                        </div>
                      </Field>
                    </div>

                    <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3 whitespace-pre-wrap text-sm text-zinc-200">
                      {t.body}
                    </div>

                    <AttachmentsSection
                      ticket={t}
                      readOnly={isClosed}
                      onChanged={async () => {
                        const fresh = await api.soporte.getTicket(t.id);
                        setTickets(ts => ts.map(x => x.id === t.id ? fresh : x));
                      }}
                    />

                    {t.comments?.length > 0 && (
                      <div className="space-y-2">
                        <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Hilo</div>
                        {t.comments.map(c => (
                          <div key={c.id} className="rounded-md border border-zinc-800/60 bg-zinc-900/40 p-2.5">
                            <div className="flex items-baseline gap-2 mb-1 text-[11px]">
                              <span className="font-medium text-zinc-300">{c.author_name || 'Anónimo'}</span>
                              <span className="font-mono text-zinc-600">{fmtDate(c.created_at)}</span>
                            </div>
                            <div className="text-sm text-zinc-200 whitespace-pre-wrap">{c.body}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {!isClosed && (
                      <div className="pt-1">
                        <Field label="Responder">
                          <Textarea
                            value={expanded === t.id ? reply : ''}
                            onChange={e => setReply(e.target.value)}
                            placeholder="Escribí tu respuesta..."
                            rows={3}
                            disabled={submitting}
                          />
                        </Field>
                        <div className="flex justify-end mt-2">
                          <Button
                            onClick={() => submitReply(t.id)}
                            disabled={!reply.trim() || submitting}
                            icon={submitting ? undefined : 'mail'}
                            size="sm"
                          >
                            {submitting ? 'Enviando...' : 'Enviar respuesta'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })()}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}


// ─── Panel raíz ──────────────────────────────────────────────────────────────

export default function SoportePanel() {
  const [tab, setTab] = React.useState('trazabilidad');

  return (
    <>
      <ModuleHeader module="soporte" subtitle="Auditoría de OF + bandeja de tickets" />
      <div className="px-4 sm:px-7 py-5 space-y-4">
        <Tabs
          value={tab}
          onChange={setTab}
          accent="rose"
          items={[
            { value: 'trazabilidad', label: 'Trazabilidad de OF', icon: 'compass' },
            { value: 'tickets',      label: 'Tickets',            icon: 'mail' },
          ]}
        />
        {tab === 'trazabilidad' ? <TrazabilidadTab /> : <TicketsTab />}
      </div>
    </>
  );
}


// ─── Adjuntos de ticket ──────────────────────────────────────────────────────

function AttachmentsSection({ ticket, onChanged, readOnly = false }) {
  const toast = useToast();
  const inputRef = React.useRef(null);
  const [busy, setBusy] = React.useState(false);
  const attachments = ticket.attachments || [];
  const remaining = ATTACH_MAX_FILES - attachments.length;

  const handleUpload = async (incoming) => {
    const added = Array.from(incoming);
    const accepted = [];
    for (const f of added) {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (!ATTACH_ALLOWED_EXT.includes(ext)) { toast({ type: 'error', msg: `${f.name}: tipo no permitido` }); continue; }
      if (f.size > ATTACH_MAX_SIZE) { toast({ type: 'error', msg: `${f.name}: > 10 MB` }); continue; }
      accepted.push(f);
    }
    if (!accepted.length) return;
    if (accepted.length > remaining) {
      toast({ type: 'error', msg: `Solo podés subir ${remaining} archivo${remaining === 1 ? '' : 's'} más.` });
      return;
    }
    setBusy(true);
    try {
      await api.soporte.uploadAttachments(ticket.id, accepted);
      toast({ msg: `${accepted.length} archivo${accepted.length === 1 ? '' : 's'} subido${accepted.length === 1 ? '' : 's'}` });
      await onChanged?.();
    } catch (e) {
      toast({ type: 'error', msg: e.message || 'No se pudo subir' });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDownload = async (att) => {
    try {
      const blob = await api.soporte.downloadAttachment(ticket.id, att.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = att.original_name;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ type: 'error', msg: e.message || 'No se pudo descargar' });
    }
  };

  const handleDelete = async (att) => {
    if (!window.confirm(`Eliminar "${att.original_name}"?`)) return;
    try {
      await api.soporte.deleteAttachment(ticket.id, att.id);
      toast({ msg: 'Adjunto eliminado' });
      await onChanged?.();
    } catch (e) {
      toast({ type: 'error', msg: e.message || 'No se pudo eliminar' });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          Adjuntos {attachments.length > 0 && <span className="text-zinc-400">({attachments.length}/{ATTACH_MAX_FILES})</span>}
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy || remaining <= 0}
            className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? 'Subiendo...' : '+ Subir archivo'}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ATTACH_ACCEPT}
        onChange={e => handleUpload(e.target.files)}
        className="hidden"
      />
      {attachments.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-800 px-3 py-2 text-xs text-zinc-600 text-center">
          Sin adjuntos
        </div>
      ) : (
        <ul className="space-y-1.5">
          {attachments.map(att => (
            <li key={att.id} className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/40 px-2.5 py-1.5">
              <Icon name={fileIcon(att.content_type, att.original_name)} size={14} className="text-zinc-500 shrink-0" />
              <button
                type="button"
                onClick={() => handleDownload(att)}
                className="text-xs text-zinc-200 hover:text-blue-300 truncate flex-1 text-left"
              >
                {att.original_name}
              </button>
              <span className="font-mono text-[10px] text-zinc-500 shrink-0">{fmtSize(att.size)}</span>
              <span className="font-mono text-[10px] text-zinc-600 shrink-0 hidden sm:inline">{att.uploaded_by_name || ''}</span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleDelete(att)}
                  aria-label="Eliminar adjunto"
                  className="text-zinc-600 hover:text-rose-400"
                >
                  <Icon name="trash" size={13} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
