import React from 'react';
import { api } from '../api';
import {
  cx, Icon, Button, Input, Field, Select,
  Badge, Card, CardHeader, CardTitle,
  useToast, Dialog, ModuleHeader, EmptyState,
} from './primitives';

const ROLE_LABELS = {
  comercial: 'Comercial', administracion: 'Administración', desarrollo: 'Desarrollo',
  compras: 'Compras', panol: 'Pañol', produccion: 'Producción',
  logistica: 'Logística', gerencia: 'Gerencia',
};
const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));
const PERM_OPTIONS = [{ value: 'rw', label: 'Lectura/Escritura' }, { value: 'r', label: 'Solo lectura' }];
const ROLE_ACCENT = {
  comercial: 'blue', administracion: 'violet', desarrollo: 'cyan',
  compras: 'amber', panol: 'emerald', produccion: 'rose',
  logistica: 'orange', gerencia: 'indigo',
};

const EMPTY_FORM = {
  first_name: '', last_name: '', dni: '', email: '',
  roles: [{ role: 'comercial', permission: 'rw' }],
  has_expiration: false, expiration_date: '',
};

function RolesRepeater({ roles, onChange }) {
  const addRole = () => onChange([...roles, { role: 'comercial', permission: 'rw' }]);
  const removeRole = (i) => onChange(roles.filter((_, idx) => idx !== i));
  const updateRole = (i, key, val) => {
    const next = roles.map((r, idx) => idx === i ? { ...r, [key]: val } : r);
    onChange(next);
  };
  return (
    <div className="space-y-2.5">
      {roles.map((r, i) => (
        <div key={i} className="flex items-center gap-2 group">
          <div className="flex-1 flex items-center bg-zinc-950/40 border border-zinc-800/80 rounded-md focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
            <div className="flex-1 relative border-r border-zinc-800/60">
              <select
                value={r.role}
                onChange={e => updateRole(i, 'role', e.target.value)}
                className="appearance-none block w-full h-8 bg-transparent border-none text-sm text-zinc-200 focus:ring-0 pl-3 pr-8 py-0 cursor-pointer"
                style={{ backgroundImage: 'none' }}
              >
                {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-zinc-900">{o.label}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-zinc-500">
                <Icon name="chevron-down" size={13} />
              </div>
            </div>
            <div className="w-[140px] relative bg-zinc-900/20 rounded-r-md">
              <select
                value={r.permission}
                onChange={e => updateRole(i, 'permission', e.target.value)}
                className="appearance-none block w-full h-8 bg-transparent border-none text-[11px] font-medium text-zinc-400 focus:ring-0 pl-3 pr-8 py-0 cursor-pointer"
                style={{ backgroundImage: 'none' }}
              >
                {PERM_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-zinc-900">{o.label}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-zinc-500">
                <Icon name="chevron-down" size={13} />
              </div>
            </div>
          </div>
          <button
            onClick={() => removeRole(i)}
            disabled={roles.length <= 1}
            className="w-7 h-8 shrink-0 rounded text-zinc-600 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-20 transition-colors flex items-center justify-center"
            title="Eliminar rol"
          >
            <Icon name="trash" size={13} />
          </button>
        </div>
      ))}
      <button
        onClick={addRole}
        className="w-full h-8 mt-1 flex items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-800 text-xs text-zinc-500 hover:border-indigo-500/40 hover:text-indigo-400 hover:bg-indigo-500/5 transition-colors"
      >
        <Icon name="plus" size={12} /> Añadir rol
      </button>
    </div>
  );
}

function UserFormFields({ form, setForm, errors = {} }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre" required>
          <Input
            value={form.first_name}
            onChange={e => setForm({ ...form, first_name: e.target.value })}
            placeholder="Juan"
            error={errors.first_name}
          />
        </Field>
        <Field label="Apellido" required>
          <Input
            value={form.last_name}
            onChange={e => setForm({ ...form, last_name: e.target.value })}
            placeholder="García"
            error={errors.last_name}
          />
        </Field>
      </div>
      <Field label="DNI">
        <Input
          value={form.dni}
          onChange={e => setForm({ ...form, dni: e.target.value })}
          placeholder="12345678"
        />
      </Field>
      <Field label="Email" required>
        <Input
          type="email"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
          placeholder="usuario@empresa.com"
          error={errors.email}
        />
      </Field>
      <Field label="Roles" required>
        <RolesRepeater roles={form.roles} onChange={roles => setForm({ ...form, roles })} />
      </Field>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setForm({ ...form, has_expiration: !form.has_expiration })}
          className={cx('relative w-10 h-5 rounded-full transition-colors p-0.5 shrink-0', form.has_expiration ? 'bg-indigo-500' : 'bg-zinc-700')}
        >
          <div className={cx('w-4 h-4 rounded-full bg-white shadow transition-transform', form.has_expiration ? 'translate-x-5' : 'translate-x-0')} />
        </button>
        <span className="text-xs text-zinc-400">Cuenta con fecha de vencimiento</span>
      </div>
      {form.has_expiration && (
        <Field label="Fecha de vencimiento">
          <Input
            type="date"
            value={form.expiration_date}
            onChange={e => setForm({ ...form, expiration_date: e.target.value })}
          />
        </Field>
      )}
    </div>
  );
}

export default function UsersPanel() {
  const toast = useToast();
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [editForm, setEditForm] = React.useState(null);
  const [errors, setErrors] = React.useState({});
  const [saving, setSaving] = React.useState(false);
  const [delConfirm, setDelConfirm] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const data = await api.auth.listUsers();
      setUsers(data);
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = 'Requerido';
    if (!form.last_name.trim()) errs.last_name = 'Requerido';
    if (!form.email.trim()) errs.email = 'Requerido';
    if (setErrors(errs), Object.keys(errs).length) return;

    setSaving(true);
    try {
      await api.auth.createUser({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        dni: form.dni.trim(),
        email: form.email.trim().toLowerCase(),
        roles: form.roles,
        has_expiration: form.has_expiration,
        expiration_date: form.has_expiration ? form.expiration_date : null,
      });
      toast({ msg: `Invitación enviada a ${form.email}` });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      setErrors({});
      await load();
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editForm || !selected) return;
    setSaving(true);
    try {
      const updated = await api.auth.updateUser(selected.id, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        dni: editForm.dni,
        roles: editForm.roles,
        has_expiration: editForm.has_expiration,
        expiration_date: editForm.has_expiration ? editForm.expiration_date : null,
      });
      toast({ msg: 'Usuario actualizado' });
      setSelected(updated);
      setEditForm(null);
      await load();
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.auth.deleteUser(selected.id);
      toast({ msg: `Usuario eliminado` });
      setSelected(null);
      setDelConfirm(false);
      await load();
    } catch (e) {
      toast({ type: 'error', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const selectUser = (u) => {
    setSelected(u);
    setEditForm({
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      dni: u.dni || '',
      roles: u.roles.length ? u.roles.map(r => ({ role: r.role, permission: r.permission })) : [{ role: 'comercial', permission: 'rw' }],
      has_expiration: !!u.expiration_date,
      expiration_date: u.expiration_date || '',
    });
    setDelConfirm(false);
  };

  return (
    <div>
      <ModuleHeader
        module="usuarios"
        subtitle="Gestión de cuentas y permisos"
        actions={
          <Button onClick={() => { setCreateOpen(true); setForm(EMPTY_FORM); setErrors({}); }} icon="user-plus" accent="indigo">
            Nuevo usuario
          </Button>
        }
      />

      {loading ? (
        <div className="px-7 py-10 text-zinc-500 text-sm">Cargando usuarios...</div>
      ) : (
        <div className={cx('px-7 py-5 grid gap-4', selected ? 'grid-cols-[1fr_380px]' : 'grid-cols-1')}>
          <Card>
            <CardHeader><CardTitle hint={users.length}>Usuarios del sistema</CardTitle></CardHeader>
            {users.length === 0 ? (
              <EmptyState icon="users" msg="Sin usuarios" hint="Creá el primer usuario del sistema" />
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => selected?.id === u.id ? setSelected(null) : selectUser(u)}
                    className={cx(
                      'w-full text-left px-4 py-3 transition-colors border-l-2 hover:bg-zinc-800/40',
                      selected?.id === u.id ? 'bg-indigo-500/5 border-l-indigo-500' : 'border-l-transparent',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/15 border border-indigo-500/25 grid place-items-center shrink-0">
                          <span className="font-mono text-[11px] font-bold text-indigo-400">
                            {(u.first_name || u.username || '?')[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate">
                            {u.first_name} {u.last_name}
                            {u.is_superuser && <span className="ml-2 text-[10px] font-mono text-amber-400">SUPERUSER</span>}
                          </p>
                          <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                          {u.roles.slice(0, 3).map((r, i) => (
                            <Badge key={i} accent={ROLE_ACCENT[r.role] || 'zinc'} dot>
                              {ROLE_LABELS[r.role] || r.role}
                              {r.permission === 'r' && <span className="ml-1 opacity-60">R</span>}
                            </Badge>
                          ))}
                          {u.roles.length > 3 && (
                            <Badge accent="zinc">+{u.roles.length - 3}</Badge>
                          )}
                        </div>
                        <span className={cx(
                          'shrink-0 w-2 h-2 rounded-full',
                          u.is_active ? 'bg-emerald-400' : 'bg-zinc-600',
                        )} title={u.is_active ? 'Activo' : 'Inactivo'} />
                      </div>
                    </div>
                    {u.expiration_date && (
                      <p className="text-[11px] text-zinc-600 mt-1 ml-11">
                        Vence: <span className="font-mono">{u.expiration_date}</span>
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </Card>

          {selected && editForm && (
            <Card className="sticky top-[88px]">
              <CardHeader
                actions={
                  <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                    <Icon name="x" size={16} />
                  </button>
                }
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/15 border border-indigo-500/25 grid place-items-center shrink-0">
                    <span className="font-mono text-[10px] font-bold text-indigo-400">
                      {(selected.first_name || selected.username || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold text-zinc-100 truncate">
                    {selected.first_name} {selected.last_name}
                  </span>
                </div>
              </CardHeader>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nombre">
                    <Input value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} />
                  </Field>
                  <Field label="Apellido">
                    <Input value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} />
                  </Field>
                </div>
                <Field label="DNI">
                  <Input value={editForm.dni} onChange={e => setEditForm({ ...editForm, dni: e.target.value })} />
                </Field>
                <Field label="Email">
                  <p className="text-sm text-zinc-400 font-mono px-1">{selected.email}</p>
                </Field>
                <Field label="Estado">
                  <p className={cx('text-sm font-mono px-1', selected.is_active ? 'text-emerald-400' : 'text-zinc-500')}>
                    {selected.is_active ? 'Activo' : 'Pendiente de activación'}
                  </p>
                </Field>
                <Field label="Roles">
                  {selected.is_superuser ? (
                    <p className="text-xs text-amber-400 font-mono px-1">SuperUser — acceso total</p>
                  ) : (
                    <RolesRepeater roles={editForm.roles} onChange={roles => setEditForm({ ...editForm, roles })} />
                  )}
                </Field>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setEditForm({ ...editForm, has_expiration: !editForm.has_expiration })}
                    className={cx('relative w-10 h-5 rounded-full transition-colors p-0.5 shrink-0', editForm.has_expiration ? 'bg-indigo-500' : 'bg-zinc-700')}
                  >
                    <div className={cx('w-4 h-4 rounded-full bg-white shadow transition-transform', editForm.has_expiration ? 'translate-x-5' : 'translate-x-0')} />
                  </button>
                  <span className="text-xs text-zinc-400">Cuenta con vencimiento</span>
                </div>
                {editForm.has_expiration && (
                  <Field label="Fecha de vencimiento">
                    <Input
                      type="date"
                      value={editForm.expiration_date}
                      onChange={e => setEditForm({ ...editForm, expiration_date: e.target.value })}
                    />
                  </Field>
                )}
                <div className="pt-2 border-t border-zinc-800 flex flex-col gap-2">
                  <Button onClick={handleUpdate} disabled={saving} accent="indigo" icon="check" className="w-full">
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                  {!delConfirm ? (
                    <Button onClick={() => setDelConfirm(true)} variant="danger" icon="trash" className="w-full">
                      Eliminar usuario
                    </Button>
                  ) : (
                    <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3 space-y-2">
                      <p className="text-xs text-rose-400">¿Confirmar eliminación? Esta acción no se puede deshacer.</p>
                      <div className="flex gap-2">
                        <Button onClick={handleDelete} disabled={saving} variant="danger" size="sm" className="flex-1">
                          {saving ? 'Eliminando...' : 'Sí, eliminar'}
                        </Button>
                        <Button onClick={() => setDelConfirm(false)} variant="ghost" size="sm" className="flex-1">
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); setErrors({}); }} title="Nuevo usuario" size="md">
        <div className="p-5 space-y-4">
          <p className="text-xs text-zinc-500 leading-relaxed">
            Se enviará un email de activación al usuario para que establezca su contraseña.
          </p>
          <UserFormFields form={form} setForm={setForm} errors={errors} />
        </div>
        <div className="border-t border-zinc-800 px-5 py-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => { setCreateOpen(false); setErrors({}); }}>Cancelar</Button>
          <Button onClick={handleCreate} accent="indigo" icon="user-plus" disabled={saving}>
            {saving ? 'Enviando...' : 'Crear y enviar invitación'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
