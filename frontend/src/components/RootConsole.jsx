import React from 'react';
import { api } from '../api';
import {
  cx, Icon, Button, Input, Field, Card, CardHeader, CardTitle,
  Badge, EmptyState, useToast, Dialog,
} from './primitives';
import TwoFASetupDialog from './TwoFASetupDialog';

const EMPTY = { first_name: '', last_name: '', dni: '', email: '' };

export default function RootConsole({ user, onLogout, onRefreshUser }) {
  const toast = useToast();
  const [admins, setAdmins]   = React.useState([]);
  const [pending, setPending] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [form, setForm]       = React.useState(EMPTY);
  const [saving, setSaving]   = React.useState(false);
  const [editId, setEditId]   = React.useState(null);
  const [editForm, setEditForm] = React.useState(EMPTY);
  const [delId, setDelId]     = React.useState(null);
  const [show2FA, setShow2FA] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const data = await api.auth.rootListAdmins();
      setAdmins(data.admins || []);
      setPending(data.pending || []);
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.email.trim()) { toast({ type: 'error', msg: 'El email es requerido.' }); return; }
    setSaving(true);
    try {
      const res = await api.auth.rootCreateAdmin({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        dni: form.dni.trim(),
        email: form.email.trim().toLowerCase(),
      });
      toast({ msg: res.message });
      setCreateOpen(false);
      setForm(EMPTY);
      await load();
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (a) => {
    setEditId(a.id);
    setEditForm({ first_name: a.first_name || '', last_name: a.last_name || '', dni: a.dni || '', email: a.email });
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await api.auth.rootUpdateAdmin(editId, {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        dni: editForm.dni.trim(),
      });
      toast({ msg: 'Admin actualizado' });
      setEditId(null);
      await load();
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setSaving(true);
    try {
      await api.auth.rootDeleteAdmin(id);
      toast({ msg: 'Admin eliminado' });
      setDelId(null);
      await load();
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const cancelPending = async (pid) => {
    try {
      await api.auth.rootCancelPending(String(pid).replace(/^p/, ''));
      toast({ msg: 'Alta pendiente cancelada' });
      await load();
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 px-4 sm:px-7 py-4 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-900/40 to-zinc-950 border border-amber-700/40 grid place-items-center shrink-0">
            <Icon name="shield" size={16} className="text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="font-mono text-sm font-bold text-zinc-100 leading-none">Consola ROOT</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-zinc-600 mt-1 truncate">{user?.email}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" icon="shield" onClick={() => setShow2FA(true)}>2FA</Button>
          <Button variant="ghost" size="sm" icon="log-out" onClick={onLogout}>Salir</Button>
        </div>
      </header>

      <div className="px-4 sm:px-7 py-5 max-w-[1100px] mx-auto space-y-5">
        <div className="rounded-lg border border-amber-700/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-300/90">
          Acceso de emergencia. El usuario root solo gestiona <strong>admins de sistema</strong> (superusuarios con acceso al nodo Usuarios). Cada alta requiere confirmación por email a <span className="font-mono">{user?.email}</span> (válida 1 hora).
        </div>

        <Card>
          <CardHeader
            actions={<Button onClick={() => { setForm(EMPTY); setCreateOpen(true); }} icon="user-plus" accent="amber" size="sm">Nuevo admin</Button>}
          >
            <CardTitle hint={admins.length}>Admins de sistema</CardTitle>
          </CardHeader>
          {loading ? (
            <div className="px-4 py-10 text-zinc-500 text-sm">Cargando...</div>
          ) : admins.length === 0 ? (
            <EmptyState icon="shield" msg="Sin admins de sistema" hint="Creá el primero con “Nuevo admin”" />
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {admins.map(a => (
                <div key={a.id} className="px-4 py-3">
                  {editId === a.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Field label="Nombre"><Input value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} /></Field>
                        <Field label="Apellido"><Input value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} /></Field>
                        <Field label="DNI"><Input value={editForm.dni} onChange={e => setEditForm({ ...editForm, dni: e.target.value })} /></Field>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleUpdate} disabled={saving} accent="amber" size="sm" icon="check">{saving ? 'Guardando...' : 'Guardar'}</Button>
                        <Button onClick={() => setEditId(null)} variant="ghost" size="sm">Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/25 grid place-items-center shrink-0">
                          <span className="font-mono text-[11px] font-bold text-amber-400">{(a.first_name || a.email || '?')[0].toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate">{a.first_name} {a.last_name}</p>
                          <p className="text-xs text-zinc-500 truncate">{a.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge accent={a.is_active ? 'emerald' : 'zinc'} dot>{a.is_active ? 'Activo' : 'Pendiente'}</Badge>
                        <Badge accent={a.totp_enabled ? 'emerald' : 'amber'} dot>2FA {a.totp_enabled ? 'on' : 'off'}</Badge>
                        <button onClick={() => startEdit(a)} className="w-8 h-8 grid place-items-center rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors" title="Editar">
                          <Icon name="edit" size={14} />
                        </button>
                        {delId === a.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(a.id)} disabled={saving} className="text-[11px] px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white">Confirmar</button>
                            <button onClick={() => setDelId(null)} className="text-[11px] px-2 py-1 rounded border border-zinc-700 text-zinc-400">No</button>
                          </div>
                        ) : (
                          <button onClick={() => setDelId(a.id)} className="w-8 h-8 grid place-items-center rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Eliminar">
                            <Icon name="trash" size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {pending.length > 0 && (
          <Card>
            <CardHeader><CardTitle hint={pending.length}>Altas pendientes de confirmación</CardTitle></CardHeader>
            <div className="divide-y divide-zinc-800/60">
              {pending.map(p => (
                <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-300 truncate">{p.first_name} {p.last_name}</p>
                    <p className="text-xs text-zinc-500 truncate">{p.email}</p>
                  </div>
                  <button onClick={() => cancelPending(p.id)} className="text-[11px] px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors">
                    Cancelar
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo admin de sistema" size="md">
        <div className="p-5 space-y-4">
          <p className="text-xs text-zinc-500 leading-relaxed">
            Se enviará un email de confirmación a <span className="font-mono text-zinc-400">{user?.email}</span>. El admin se creará al confirmar (link válido 1 hora) y recibirá su propio email de activación.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nombre"><Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="Juan" /></Field>
            <Field label="Apellido"><Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="García" /></Field>
          </div>
          <Field label="DNI"><Input value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })} placeholder="12345678" /></Field>
          <Field label="Email" required><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@empresa.com" /></Field>
        </div>
        <div className="border-t border-zinc-800 px-5 py-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreate} accent="amber" icon="mail" disabled={saving}>
            {saving ? 'Enviando...' : 'Enviar confirmación'}
          </Button>
        </div>
      </Dialog>

      <TwoFASetupDialog
        user={user}
        open={show2FA}
        onClose={() => setShow2FA(false)}
        onUpdated={() => { onRefreshUser?.(); }}
      />
    </div>
  );
}
