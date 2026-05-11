import React from 'react';
import { api } from '../api';

export default function ActivationPage({ token }) {
  const [password, setPassword]     = React.useState('');
  const [confirm, setConfirm]       = React.useState('');
  const [status, setStatus]         = React.useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg]     = React.useState('');

  const valid = password.length >= 8 && password === confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setStatus('loading');
    try {
      await api.auth.activate({ token, password });
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.message || 'Error al activar la cuenta.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-mono text-xs font-semibold tracking-[0.2em] uppercase text-zinc-500">ERP-LG · SIBOTEC</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          {status === 'success' ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-zinc-100 mb-2">Cuenta activada</h2>
              <p className="text-sm text-zinc-400 mb-6">Tu cuenta fue activada correctamente. Ya podés iniciar sesión.</p>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
              >
                Ir al inicio de sesión
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-zinc-100 mb-1">Activar cuenta</h2>
              <p className="text-sm text-zinc-400 mb-6">Establecé tu contraseña para comenzar a usar el sistema.</p>

              {status === 'error' && (
                <div className="mb-4 px-3 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-sm text-rose-400">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                    required
                    minLength={8}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repetí la contraseña"
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                    required
                  />
                  {confirm && password !== confirm && (
                    <p className="mt-1 text-xs text-rose-400">Las contraseñas no coinciden.</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!valid || status === 'loading'}
                  className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors mt-2"
                >
                  {status === 'loading' ? 'Activando...' : 'Activar cuenta'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
