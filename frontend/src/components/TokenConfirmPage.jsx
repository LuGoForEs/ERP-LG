import React from 'react';
import { api } from '../api';

const CONFIG = {
  cred: {
    title: 'Confirmar nuevas credenciales',
    intro: 'Vas a confirmar el cambio de email y contraseña de la cuenta root. Recién al confirmar se aplicarán.',
    button: 'Confirmar credenciales',
    call: token => api.auth.rootCredConfirm({ token }),
  },
  admin: {
    title: 'Autorizar alta de admin de sistema',
    intro: 'Vas a confirmar el alta de un nuevo admin de sistema. Al confirmar se creará la cuenta y se le enviará su email de activación.',
    button: 'Autorizar alta',
    call: token => api.auth.rootConfirmAdmin({ token }),
  },
};

export default function TokenConfirmPage({ kind, token }) {
  const cfg = CONFIG[kind];
  const [status, setStatus] = React.useState('idle'); // idle | loading | success | error
  const [msg, setMsg] = React.useState('');

  const submit = async () => {
    setStatus('loading');
    try {
      const res = await cfg.call(token);
      setMsg(res?.message || 'Confirmado correctamente.');
      setStatus('success');
    } catch (err) {
      setMsg(err.message || 'No se pudo confirmar. El enlace puede haber expirado.');
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
          {status === 'success' ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-zinc-100 mb-2">Confirmado</h2>
              <p className="text-sm text-zinc-400 mb-6">{msg}</p>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
              >
                Ir al inicio de sesión
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-zinc-100 mb-1">{cfg.title}</h2>
              <p className="text-sm text-zinc-400 mb-6">{cfg.intro}</p>

              {status === 'error' && (
                <div className="mb-4 px-3 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-sm text-rose-400">
                  {msg}
                </div>
              )}

              <button
                onClick={submit}
                disabled={status === 'loading'}
                className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
              >
                {status === 'loading' ? 'Confirmando...' : cfg.button}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
