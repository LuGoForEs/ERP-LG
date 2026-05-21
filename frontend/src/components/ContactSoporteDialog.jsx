import React from 'react';
import { cx, Dialog, Field, Input, Textarea, Button, Badge, Icon, useFileDrop, useToast } from './primitives';
import { useAuth } from '../contexts/AuthContext';
import { useAnyEvent } from '../contexts/NotificationsContext';
import { api } from '../api';

// Cadencia del polling de fallback en el chat (ms). El SSE refresca al instante
// cuando hay actividad; el polling cubre los huecos (token expirado, CF cortó stream).
const CHAT_POLL_MS = 5000;
// Cadencia del refresh de la lista de tickets (cuando no hay chat abierto).
const LIST_POLL_MS = 20000;

const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXT = ['jpg','jpeg','png','gif','webp','pdf','doc','docx','xls','xlsx','ppt','pptx','csv','txt','log','zip'];
const ACCEPT_STR = ALLOWED_EXT.map(e => '.' + e).join(',');

const STATUS_LABELS = {
  abierto:    { label: 'Abierto',    accent: 'amber'   },
  en_proceso: { label: 'En proceso', accent: 'blue'    },
  resuelto:   { label: 'Resuelto',   accent: 'emerald' },
  cerrado:    { label: 'Cerrado',    accent: 'slate'   },
};

const PRIORITY_LABELS = {
  baja:    { label: 'Baja',    accent: 'slate' },
  media:   { label: 'Media',   accent: 'blue'  },
  alta:    { label: 'Alta',    accent: 'amber' },
  urgente: { label: 'Urgente', accent: 'rose'  },
};

const ROLE_LABELS = {
  comercial: 'Comercial', administracion: 'Administración', desarrollo: 'Desarrollo',
  compras: 'Compras', panol: 'Pañol', produccion: 'Producción',
  logistica: 'Logística', gerencia: 'Gerencia', soporte: 'Soporte de sistemas',
  usuarios: 'Usuarios',
};

const DATE_FMT = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: '2-digit' });
const TIME_FMT = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' });

function fmtSize(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function extOk(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return ALLOWED_EXT.includes(ext);
}

function describeRoles(user) {
  if (!user) return '';
  if (user.is_superuser) return 'Administrador de sistema';
  const roles = (user.roles || []).map(r => ROLE_LABELS[r.role] || r.role);
  const seen = new Set();
  const uniq = roles.filter(r => (seen.has(r) ? false : seen.add(r)));
  return uniq.join(', ') || 'Sin rol asignado';
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${DATE_FMT.format(d)} · ${TIME_FMT.format(d)}`;
}

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return TIME_FMT.format(d);
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayLabel(iso, today = new Date()) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (sameDay(d, today)) return 'Hoy';
  const y = new Date(today); y.setDate(today.getDate() - 1);
  if (sameDay(d, y)) return 'Ayer';
  return DATE_FMT.format(d);
}

export default function ContactSoporteDialog({ open, onClose }) {
  const { user } = useAuth();
  const toast = useToast();

  const [tab, setTab] = React.useState('new'); // 'new' | 'list'
  const [selectedTicket, setSelectedTicket] = React.useState(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);

  // Form state (Nuevo ticket)
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');
  const [priority, setPriority] = React.useState('media');
  const [files, setFiles] = React.useState([]);
  const [sending, setSending] = React.useState(false);
  const fileInputRef = React.useRef(null);

  // List state (Tickets creados)
  const [tickets, setTickets] = React.useState([]);
  const [loadingTickets, setLoadingTickets] = React.useState(false);
  const [listError, setListError] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('all');
  const [filterPriority, setFilterPriority] = React.useState('all');
  const [filterSearch, setFilterSearch] = React.useState('');

  const resetAll = React.useCallback(() => {
    setSubject(''); setBody(''); setPriority('media'); setFiles([]);
    setTickets([]); setListError('');
    setFilterStatus('all'); setFilterPriority('all'); setFilterSearch('');
    setSelectedTicket(null); setTab('new');
  }, []);

  React.useEffect(() => { if (!open) resetAll(); }, [open, resetAll]);

  const loadTickets = React.useCallback(async () => {
    setLoadingTickets(true); setListError('');
    try {
      const data = await api.soporte.listTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch (e) {
      setListError(e?.message || 'No se pudieron cargar los tickets.');
    } finally { setLoadingTickets(false); }
  }, []);

  React.useEffect(() => {
    if (open && tab === 'list' && !selectedTicket) loadTickets();
  }, [open, tab, selectedTicket, loadTickets]);

  // Polling suave de la lista mientras está visible (cubre cambios de estado/prioridad
  // que un admin de soporte hace desde su panel — sin SSE específico para esto).
  React.useEffect(() => {
    if (!open || tab !== 'list' || selectedTicket) return;
    const id = setInterval(loadTickets, LIST_POLL_MS);
    return () => clearInterval(id);
  }, [open, tab, selectedTicket, loadTickets]);

  // Refresh inmediato de la lista cuando llega CUALQUIER evento de ticket por SSE.
  useAnyEvent((data) => {
    if (!open || tab !== 'list' || selectedTicket) return;
    if (data?.ref_type === 'ticket') loadTickets();
  });

  const openTicket = async (id) => {
    setLoadingDetail(true);
    try {
      const t = await api.soporte.getTicket(id);
      setSelectedTicket(t);
    } catch (e) {
      toast({ type: 'error', msg: e?.message || 'No se pudo abrir el ticket.' });
    } finally { setLoadingDetail(false); }
  };

  const refreshTicket = async () => {
    if (!selectedTicket) return;
    try {
      const t = await api.soporte.getTicket(selectedTicket.id);
      setSelectedTicket(t);
    } catch (e) {
      toast({ type: 'error', msg: e?.message || 'No se pudo actualizar el ticket.' });
    }
  };

  const handleFilesAdded = (incoming) => {
    const added = Array.from(incoming);
    const errors = [];
    const accepted = [];
    for (const f of added) {
      if (!extOk(f.name)) { errors.push(`${f.name}: tipo no permitido`); continue; }
      if (f.size > MAX_SIZE) { errors.push(`${f.name}: > 10 MB`); continue; }
      accepted.push(f);
    }
    const next = [...files, ...accepted].slice(0, MAX_FILES);
    if (files.length + accepted.length > MAX_FILES) {
      errors.push(`Máximo ${MAX_FILES} archivos — se recortó la selección.`);
    }
    setFiles(next);
    errors.forEach(msg => toast({ type: 'error', msg }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (idx) => setFiles(fs => fs.filter((_, i) => i !== idx));
  const { dragActive, dropProps } = useFileDrop(handleFilesAdded, { disabled: sending });

  if (!open || !user) return null;

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.full_name || user.username;
  const rolesLabel = describeRoles(user);

  const handleSubmit = async () => {
    const subj = subject.trim();
    const msg = body.trim();
    if (!subj) { toast({ type: 'error', msg: 'Ingresá un asunto.' }); return; }
    if (!msg)  { toast({ type: 'error', msg: 'Escribí el mensaje.' }); return; }
    setSending(true);
    try {
      const ticket = await api.soporte.createTicket({ subject: subj, body: msg, priority }, files);
      toast({ msg: `Ticket #${ticket.numero} enviado a soporte.` });
      setSubject(''); setBody(''); setPriority('media'); setFiles([]);
      setTab('list');
    } catch (e) {
      toast({ type: 'error', msg: e.message || 'No se pudo enviar el ticket.' });
    } finally { setSending(false); }
  };

  const search = filterSearch.trim().toLowerCase();
  const filteredTickets = tickets.filter(t =>
    (filterStatus   === 'all' || t.status   === filterStatus)   &&
    (filterPriority === 'all' || t.priority === filterPriority) &&
    (search === '' || (t.subject || '').toLowerCase().includes(search))
  );

  const tabBtn = (id, label, count) => (
    <button
      type="button"
      onClick={() => { setTab(id); setSelectedTicket(null); }}
      className={cx(
        'flex-1 h-9 px-3 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5',
        tab === id
          ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900',
      )}
    >
      {label}
      {typeof count === 'number' && (
        <span className={cx(
          'rounded-md px-1.5 py-0.5 font-mono text-[10px]',
          tab === id ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-900 text-zinc-500',
        )}>{count}</span>
      )}
    </button>
  );

  return (
    <Dialog open={open} onClose={sending ? undefined : onClose} title="Contactar a soporte" size="lg">
      <div className="space-y-4">

        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg border border-zinc-800 bg-zinc-950/60">
          {tabBtn('new',  'Nuevo ticket')}
          {tabBtn('list', 'Tickets creados', tickets.length || undefined)}
        </div>

        {tab === 'new' && (
          <NewTicketForm
            user={user} fullName={fullName} rolesLabel={rolesLabel}
            subject={subject} setSubject={setSubject}
            body={body} setBody={setBody}
            priority={priority} setPriority={setPriority}
            files={files} removeFile={removeFile} handleFilesAdded={handleFilesAdded}
            sending={sending} fileInputRef={fileInputRef}
            dragActive={dragActive} dropProps={dropProps}
            handleSubmit={handleSubmit} onClose={onClose}
          />
        )}

        {tab === 'list' && !selectedTicket && (
          <TicketsList
            loading={loadingTickets} error={listError}
            tickets={tickets} filteredTickets={filteredTickets}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterPriority={filterPriority} setFilterPriority={setFilterPriority}
            filterSearch={filterSearch} setFilterSearch={setFilterSearch}
            onReload={loadTickets} onClose={onClose}
            onNewTicket={() => setTab('new')}
            onOpenTicket={openTicket} loadingDetail={loadingDetail}
          />
        )}

        {tab === 'list' && selectedTicket && (
          <TicketChat
            ticket={selectedTicket} currentUser={user}
            onBack={() => setSelectedTicket(null)}
            onRefresh={refreshTicket}
            onClose={onClose}
          />
        )}
      </div>
    </Dialog>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function NewTicketForm({
  user, fullName, rolesLabel,
  subject, setSubject, body, setBody, priority, setPriority,
  files, removeFile, handleFilesAdded, sending, fileInputRef,
  dragActive, dropProps, handleSubmit, onClose,
}) {
  return (
    <>
      <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3 space-y-1.5">
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500 mb-1.5">Tus datos</div>
        <Row label="Nombre"    value={fullName} />
        <Row label="Email"     value={user.email} />
        <Row label="Rol"       value={rolesLabel} />
        <Row label="N° ticket" value={<span className="text-zinc-500">se asignará al enviar</span>} />
      </div>

      <Field label="Asunto" required>
        <Input value={subject} onChange={e => setSubject(e.target.value)} maxLength={200}
          placeholder="Ej: No me carga el panel de Compras" disabled={sending} />
      </Field>

      <Field label="Prioridad">
        <select value={priority} onChange={e => setPriority(e.target.value)} disabled={sending}
          className="h-9 w-full rounded-md bg-zinc-950/50 border border-zinc-800 px-3 text-sm text-zinc-100 hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500">
          <option value="baja"    className="bg-zinc-900">Baja</option>
          <option value="media"   className="bg-zinc-900">Media</option>
          <option value="alta"    className="bg-zinc-900">Alta</option>
          <option value="urgente" className="bg-zinc-900">Urgente</option>
        </select>
      </Field>

      <Field label="Mensaje" required>
        <Textarea value={body} onChange={e => setBody(e.target.value)}
          placeholder="Describí el problema con el mayor detalle posible: qué módulo, qué hiciste, qué esperabas, qué pasó."
          rows={6} disabled={sending} />
      </Field>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-zinc-400">Adjuntos <span className="text-zinc-600">(opcional, máx {MAX_FILES})</span></span>
          <button type="button" onClick={() => fileInputRef.current?.click()}
            disabled={sending || files.length >= MAX_FILES}
            className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed">
            + Agregar archivo
          </button>
        </div>
        <input ref={fileInputRef} type="file" multiple accept={ACCEPT_STR}
          onChange={e => handleFilesAdded(e.target.files)} className="hidden" />
        <div {...dropProps} className={cx(
          'relative rounded-md transition-colors',
          dragActive && 'ring-2 ring-blue-500/60 bg-blue-500/5',
        )}>
          {files.length === 0 ? (
            <div className={cx(
              'rounded-md border border-dashed px-3 py-4 text-xs text-center transition-colors',
              dragActive ? 'border-blue-500 text-blue-300' : 'border-zinc-800 text-zinc-600',
            )}>
              {dragActive ? 'Soltá los archivos aquí'
                : 'Arrastrá archivos o hacé click en + Agregar archivo · jpg, png, pdf, docx, xlsx, csv, txt, zip — hasta 10 MB c/u'}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/40 px-2.5 py-1.5">
                  <Icon name="file-text" size={14} className="text-zinc-500 shrink-0" />
                  <span className="text-xs text-zinc-200 truncate flex-1">{f.name}</span>
                  <span className="font-mono text-[10px] text-zinc-500 shrink-0">{fmtSize(f.size)}</span>
                  <button type="button" onClick={() => removeFile(i)} disabled={sending}
                    aria-label="Quitar archivo" className="text-zinc-600 hover:text-rose-400 disabled:opacity-40">
                    <Icon name="x" size={13} />
                  </button>
                </li>
              ))}
              {dragActive && (
                <li className="rounded-md border border-dashed border-blue-500 bg-blue-500/5 px-3 py-2 text-xs text-blue-300 text-center">
                  Soltá para agregar más archivos
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onClose} disabled={sending}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={sending} icon={sending ? undefined : 'mail'}>
          {sending ? 'Enviando...' : 'Enviar a soporte'}
        </Button>
      </div>
    </>
  );
}

function TicketsList({
  loading, error, tickets, filteredTickets,
  filterStatus, setFilterStatus, filterPriority, setFilterPriority, filterSearch, setFilterSearch,
  onReload, onClose, onNewTicket, onOpenTicket, loadingDetail,
}) {
  const filtersActive = filterStatus !== 'all' || filterPriority !== 'all' || filterSearch.trim() !== '';
  const clearFilters = () => { setFilterStatus('all'); setFilterPriority('all'); setFilterSearch(''); };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        <div className="sm:col-span-6 relative">
          <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
          <Input value={filterSearch} onChange={e => setFilterSearch(e.target.value)}
            placeholder="Buscar por asunto..." className="pl-8" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="sm:col-span-3 h-9 rounded-md bg-zinc-950/50 border border-zinc-800 px-3 text-sm text-zinc-100 hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500">
          <option value="all" className="bg-zinc-900">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([v, m]) => (
            <option key={v} value={v} className="bg-zinc-900">{m.label}</option>
          ))}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="sm:col-span-3 h-9 rounded-md bg-zinc-950/50 border border-zinc-800 px-3 text-sm text-zinc-100 hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500">
          <option value="all" className="bg-zinc-900">Toda prioridad</option>
          {Object.entries(PRIORITY_LABELS).map(([v, m]) => (
            <option key={v} value={v} className="bg-zinc-900">{m.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
        <span>{filteredTickets.length} de {tickets.length} ticket{tickets.length === 1 ? '' : 's'}</span>
        <div className="flex items-center gap-3">
          {filtersActive && (
            <button onClick={clearFilters} className="text-zinc-400 hover:text-zinc-200 underline-offset-2 hover:underline">
              Limpiar filtros
            </button>
          )}
          <button onClick={onReload} className="text-zinc-400 hover:text-zinc-200 underline-offset-2 hover:underline" title="Recargar lista">
            Recargar
          </button>
        </div>
      </div>

      <div className="rounded-md border border-zinc-800 bg-zinc-950/40 overflow-hidden">
        {loading ? (
          <div className="px-4 py-8 text-center text-xs text-zinc-500">Cargando tickets...</div>
        ) : error ? (
          <div className="px-4 py-6 text-center text-xs text-rose-400">{error}</div>
        ) : tickets.length === 0 ? (
          <div className="px-4 py-8 text-center space-y-2">
            <Icon name="inbox" size={28} className="text-zinc-700 mx-auto" />
            <p className="text-xs text-zinc-500">Aún no creaste tickets.</p>
            <button onClick={onNewTicket} className="text-xs text-blue-400 hover:text-blue-300">
              + Crear el primero
            </button>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-zinc-500">Ningún ticket coincide con los filtros.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-zinc-900/60 text-zinc-500 font-mono text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2 font-medium w-12">N°</th>
                  <th className="text-left px-3 py-2 font-medium">Asunto</th>
                  <th className="text-left px-3 py-2 font-medium w-36">Fecha</th>
                  <th className="text-left px-3 py-2 font-medium w-28">Estado</th>
                  <th className="text-left px-3 py-2 font-medium w-24">Importancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredTickets.map(t => {
                  const st = STATUS_LABELS[t.status]   || { label: t.status,   accent: 'slate' };
                  const pr = PRIORITY_LABELS[t.priority] || { label: t.priority, accent: 'slate' };
                  const unread = (t.comments?.length || 0); // por ahora indicativo de "actividad"
                  return (
                    <tr key={t.id}
                        onClick={() => !loadingDetail && onOpenTicket(t.id)}
                        className={cx(
                          'transition-colors',
                          loadingDetail ? 'cursor-wait opacity-60' : 'cursor-pointer hover:bg-zinc-900/60',
                        )}>
                      <td className="px-3 py-2 font-mono text-zinc-500">#{t.numero ?? t.id}</td>
                      <td className="px-3 py-2 text-zinc-100">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[240px]" title={t.subject}>{t.subject}</span>
                          {unread > 0 && (
                            <span className="font-mono text-[10px] text-zinc-500 shrink-0">
                              {unread} msj
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">{fmtDate(t.created_at)}</td>
                      <td className="px-3 py-2"><Badge accent={st.accent} dot>{st.label}</Badge></td>
                      <td className="px-3 py-2"><Badge accent={pr.accent}>{pr.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        <Button onClick={onNewTicket} icon="mail">Nuevo ticket</Button>
      </div>
    </>
  );
}

function TicketChat({ ticket, currentUser, onBack, onRefresh, onClose }) {
  const toast = useToast();
  const st = STATUS_LABELS[ticket.status]   || { label: ticket.status,   accent: 'slate' };
  const pr = PRIORITY_LABELS[ticket.priority] || { label: ticket.priority, accent: 'slate' };

  const [reply, setReply] = React.useState('');
  const [sendingReply, setSendingReply] = React.useState(false);
  const scrollerRef = React.useRef(null);

  const isClosed = ticket.status === 'cerrado';
  const today = new Date();
  const ticketId = ticket.id;

  // ── Tiempo real ──
  // 1) Polling cada CHAT_POLL_MS (fallback siempre activo si el chat está abierto).
  React.useEffect(() => {
    if (!ticketId) return;
    const id = setInterval(() => { onRefresh?.(); }, CHAT_POLL_MS);
    return () => clearInterval(id);
  }, [ticketId, onRefresh]);

  // 2) SSE: refresco instantáneo cuando llega un evento del ticket actual.
  useAnyEvent((data) => {
    if (!data || data.ref_type !== 'ticket') return;
    if (String(data.ref_id) !== String(ticketId)) return;
    onRefresh?.();
  });

  // Construir lista unificada: el body inicial cuenta como "primer mensaje" del creador.
  const initialMsg = {
    id: `initial-${ticket.id}`,
    author_id: ticket.created_by_id,
    author_name: ticket.created_by_name || ticket.snapshot_full_name || 'Usuario',
    body: ticket.body,
    created_at: ticket.created_at,
    isOriginal: true,
  };
  const messages = [initialMsg, ...(ticket.comments || [])];

  React.useEffect(() => {
    // Auto-scroll al final cuando llegan mensajes nuevos / al abrir
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages.length, ticket.id]);

  const handleSend = async () => {
    const text = reply.trim();
    if (!text) return;
    setSendingReply(true);
    try {
      await api.soporte.addComment(ticket.id, { body: text });
      setReply('');
      await onRefresh();
    } catch (e) {
      toast({ type: 'error', msg: e?.message || 'No se pudo enviar el mensaje.' });
    } finally {
      setSendingReply(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSend(); }
  };

  // Agrupar mensajes por día para mostrar separadores.
  const grouped = [];
  let lastDay = null;
  for (const m of messages) {
    const d = new Date(m.created_at);
    const label = dayLabel(m.created_at, today);
    if (label !== lastDay) {
      grouped.push({ type: 'day', label, key: `d-${label}-${m.id}` });
      lastDay = label;
    }
    grouped.push({ type: 'msg', m, key: `m-${m.id}` });
  }

  return (
    <>
      {/* Header del ticket */}
      <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <button onClick={onBack} className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 mb-1.5">
              <Icon name="arrow-left" size={12} /> Volver a la lista
            </button>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-zinc-500">#{ticket.numero ?? ticket.id}</span>
              <span className="text-sm font-semibold text-zinc-100 truncate" title={ticket.subject}>
                {ticket.subject}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">
              Abierto el {fmtDate(ticket.created_at)}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge accent={st.accent} dot>{st.label}</Badge>
            <Badge accent={pr.accent}>{pr.label}</Badge>
          </div>
        </div>
      </div>

      {/* Banner cerrado */}
      {isClosed && (
        <div className="rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-400 flex items-center gap-2">
          <Icon name="check-circle" size={14} className="text-emerald-500" />
          Soporte cerró este ticket. No se pueden enviar más mensajes.
        </div>
      )}

      {/* Chat */}
      <div
        ref={scrollerRef}
        className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3 max-h-[40vh] min-h-[180px] overflow-y-auto space-y-3"
      >
        {grouped.map(item => {
          if (item.type === 'day') {
            return (
              <div key={item.key} className="text-center">
                <span className="inline-block px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  {item.label}
                </span>
              </div>
            );
          }
          const m = item.m;
          const mine = m.author_id === currentUser.id;
          return (
            <div key={item.key} className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cx(
                'max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed border',
                mine
                  ? 'bg-blue-600/15 border-blue-600/30 text-zinc-100'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-100',
              )}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className={cx('font-medium text-[11px]', mine ? 'text-blue-300' : 'text-zinc-300')}>
                    {mine ? 'Vos' : (m.author_name || 'Soporte')}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500">{fmtTime(m.created_at)}</span>
                </div>
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Caja de envío */}
      {!isClosed ? (
        <div className="space-y-2">
          <Textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribí tu respuesta… (Ctrl+Enter para enviar)"
            rows={3}
            disabled={sendingReply}
          />
          <div className="flex items-center justify-between gap-2">
            <button onClick={onRefresh}
                    className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 underline-offset-2 hover:underline">
              Actualizar mensajes
            </button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>Cerrar</Button>
              <Button onClick={handleSend} disabled={sendingReply || !reply.trim()} icon={sendingReply ? undefined : 'mail'}>
                {sendingReply ? 'Enviando...' : 'Enviar mensaje'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-end pt-1">
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
      )}
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline gap-3 text-xs">
      <span className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-wider text-zinc-600">{label}</span>
      <span className="text-zinc-200 break-all">{value || <span className="text-zinc-600">—</span>}</span>
    </div>
  );
}
