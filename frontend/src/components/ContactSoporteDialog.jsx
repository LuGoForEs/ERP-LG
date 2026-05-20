import React from 'react';
import { Dialog, Field, Input, Textarea, Button, Icon, useToast } from './primitives';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api';

const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXT = ['jpg','jpeg','png','gif','webp','pdf','doc','docx','xls','xlsx','ppt','pptx','csv','txt','log','zip'];
const ACCEPT_STR = ALLOWED_EXT.map(e => '.' + e).join(',');

function fmtSize(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function extOk(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return ALLOWED_EXT.includes(ext);
}

const ROLE_LABELS = {
  comercial: 'Comercial', administracion: 'Administración', desarrollo: 'Desarrollo',
  compras: 'Compras', panol: 'Pañol', produccion: 'Producción',
  logistica: 'Logística', gerencia: 'Gerencia', soporte: 'Soporte de sistemas',
  usuarios: 'Usuarios',
};

function describeRoles(user) {
  if (!user) return '';
  if (user.is_superuser) return 'Administrador de sistema';
  const roles = (user.roles || []).map(r => ROLE_LABELS[r.role] || r.role);
  // Dedupe preservando orden — el backend expande gerencia/soporte a varios paneles.
  const seen = new Set();
  const uniq = roles.filter(r => (seen.has(r) ? false : seen.add(r)));
  return uniq.join(', ') || 'Sin rol asignado';
}

export default function ContactSoporteDialog({ open, onClose }) {
  const { user } = useAuth();
  const toast = useToast();
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');
  const [priority, setPriority] = React.useState('media');
  const [files, setFiles] = React.useState([]);
  const [sending, setSending] = React.useState(false);
  const fileInputRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) { setSubject(''); setBody(''); setPriority('media'); setFiles([]); }
  }, [open]);

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

  if (!open || !user) return null;

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.full_name || user.username;
  const rolesLabel = describeRoles(user);

  const handleSubmit = async () => {
    const subj = subject.trim();
    const msg = body.trim();
    if (!subj) { toast({ type: 'error', msg: 'Ingresá un asunto.' }); return; }
    if (!msg) { toast({ type: 'error', msg: 'Escribí el mensaje.' }); return; }
    setSending(true);
    try {
      const ticket = await api.soporte.createTicket({ subject: subj, body: msg, priority }, files);
      toast({ msg: `Ticket #${ticket.numero} enviado a soporte.` });
      onClose?.();
    } catch (e) {
      toast({ type: 'error', msg: e.message || 'No se pudo enviar el ticket.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={sending ? undefined : onClose} title="Contactar a soporte" size="lg">
      <div className="space-y-4">
        <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3 space-y-1.5">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500 mb-1.5">
            Tus datos
          </div>
          <Row label="Nombre"   value={fullName} />
          <Row label="Email"    value={user.email} />
          <Row label="Rol"      value={rolesLabel} />
          <Row label="N° ticket" value={<span className="text-zinc-500">se asignará al enviar</span>} />
        </div>

        <Field label="Asunto" required>
          <Input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            maxLength={200}
            placeholder="Ej: No me carga el panel de Compras"
            disabled={sending}
          />
        </Field>

        <Field label="Prioridad">
          <select
            value={priority}
            onChange={e => setPriority(e.target.value)}
            disabled={sending}
            className="h-9 w-full rounded-md bg-zinc-950/50 border border-zinc-800 px-3 text-sm text-zinc-100 hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
          >
            <option value="baja"    className="bg-zinc-900">Baja</option>
            <option value="media"   className="bg-zinc-900">Media</option>
            <option value="alta"    className="bg-zinc-900">Alta</option>
            <option value="urgente" className="bg-zinc-900">Urgente</option>
          </select>
        </Field>

        <Field label="Mensaje" required>
          <Textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Describí el problema con el mayor detalle posible: qué módulo, qué hiciste, qué esperabas, qué pasó."
            rows={6}
            disabled={sending}
          />
        </Field>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-zinc-400">Adjuntos <span className="text-zinc-600">(opcional, máx {MAX_FILES})</span></span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || files.length >= MAX_FILES}
              className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Agregar archivo
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT_STR}
            onChange={e => handleFilesAdded(e.target.files)}
            className="hidden"
          />
          {files.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-800 px-3 py-3 text-xs text-zinc-600 text-center">
              jpg, png, pdf, docx, xlsx, csv, txt, zip — hasta 10 MB c/u
            </div>
          ) : (
            <ul className="space-y-1.5">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/40 px-2.5 py-1.5">
                  <Icon name="file-text" size={14} className="text-zinc-500 shrink-0" />
                  <span className="text-xs text-zinc-200 truncate flex-1">{f.name}</span>
                  <span className="font-mono text-[10px] text-zinc-500 shrink-0">{fmtSize(f.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    disabled={sending}
                    aria-label="Quitar archivo"
                    className="text-zinc-600 hover:text-rose-400 disabled:opacity-40"
                  >
                    <Icon name="x" size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} disabled={sending}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={sending} icon={sending ? undefined : 'mail'}>
            {sending ? 'Enviando...' : 'Enviar a soporte'}
          </Button>
        </div>
      </div>
    </Dialog>
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
