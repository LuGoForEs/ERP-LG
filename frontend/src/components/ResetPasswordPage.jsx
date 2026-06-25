import React from 'react';
import { api } from '../api';
import { cx } from './primitives';

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-xs text-rose-400 mt-1">{msg}</p>;
}

export default function ResetPasswordPage({ token }) {
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    if (password.length < 8)  { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.auth.confirmPasswordReset({ token, password });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = ({ open }) => open
    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;

  return (
    <div className="min-h-screen min-h-[100dvh] bg-zinc-950 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-sm">

        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700 grid place-items-center">
            <span className="font-mono text-base font-bold text-zinc-100">L</span>
          </div>
          <div>
            <div className="font-mono text-lg font-bold text-zinc-100 tracking-tight leading-none">ERP—LG</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-zinc-600 mt-0.5">Sistema industrial</div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl">
          {!done ? (
            <>
              <h1 className="text-base font-semibold text-zinc-100 mb-1">Nueva contraseña</h1>
              <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
                Elegí una contraseña nueva para tu cuenta.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoFocus
                      autoComplete="new-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="Mínimo 8 caracteres"
                      className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-950 text-sm text-zinc-100 px-3 pr-9 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors"
                    />
                    <button
                      type="button" tabIndex={-1}
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
                    Confirmar contraseña
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    placeholder="Repetí la contraseña"
                    className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-950 text-sm text-zinc-100 px-3 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors"
                  />
                </div>
                {error && <FieldError msg={error} />}
                <button
                  type="submit"
                  disabled={loading || !password || !confirm}
                  className={cx(
                    'w-full h-9 rounded-md text-sm font-semibold transition-all',
                    loading || !password || !confirm
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-400 text-zinc-950',
                  )}
                >
                  {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 grid place-items-center mx-auto">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100 mb-1">Contraseña actualizada</p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Tu contraseña fue cambiada exitosamente. Ya podés iniciar sesión.
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.location.href = '/'}
                className="w-full h-9 rounded-md text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all"
              >
                Ir al inicio de sesión
              </button>
            </div>
          )}
        </div>

        <p className="text-center font-mono text-[10px] text-zinc-700 mt-5">
          ERP-LG · Acceso restringido
        </p>
      </div>
    </div>
  );
}
