import React from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function CredentialChangePage() {
  const { credChangePartial, clearCredChange } = useAuth();

  const [email, setEmail]     = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [status, setStatus]   = React.useState('idle'); // idle | loading | sent | error
  const [errorMsg, setErrorMsg] = React.useState('');

  const valid =
    /\S+@\S+\.\S+/.test(email) &&
    password.length >= 8 &&
    password === confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setStatus('loading');
    setErrorMsg('');
    try {
      await api.auth.rootCredChange({
        partial_token: credChangePartial,
        email: email.trim().toLowerCase(),
        password,
      });
      setStatus('sent');
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo iniciar el cambio de credenciales.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-zinc-950 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-mono text-xs font-semibold tracking-[0.2em] uppercase text-zinc-500">ERP-LG · SIBOTEC · ROOT</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          {status === 'sent' ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-zinc-100 mb-2">Revisá tu nuevo correo</h2>
              <p className="text-sm text-zinc-400 mb-2">
                Enviamos un enlace de confirmación a <span className="text-zinc-200 font-mono">{email}</span>.
              </p>
              <p className="text-xs text-zinc-500 mb-6">
                El cambio de email y contraseña <strong className="text-zinc-400">solo se aplicará</strong> cuando confirmes desde ese enlace (válido 1 hora). Luego iniciá sesión con las nuevas credenciales.
              </p>
              <button
                onClick={() => { clearCredChange(); window.location.href = '/'; }}
                className="w-full py-2.5 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-semibold transition-colors"
              >
                Volver al inicio de sesión
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-zinc-100 mb-1">Cambio obligatorio de credenciales</h2>
              <p className="text-sm text-zinc-400 mb-6">
                Es el primer ingreso del usuario root. Definí un nuevo email y contraseña. Se enviará un enlace de confirmación al nuevo email.
              </p>

              {status === 'error' && (
                <div className="mb-4 px-3 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-sm text-rose-400">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Nuevo email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="root@tuempresa.com"
                    autoFocus
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Nueva contraseña</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Confirmar contraseña</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repetí la contraseña"
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                    required
                  />
                  {confirm && password !== confirm && (
                    <p className="mt-1 text-xs text-rose-400">Las contraseñas no coinciden.</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!valid || status === 'loading'}
                  className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors mt-2"
                >
                  {status === 'loading' ? 'Enviando confirmación...' : 'Enviar confirmación al nuevo email'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
