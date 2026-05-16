import React from 'react';
import { api } from '../api';

export default function Forced2FAGate({ onDone, onLogout }) {
  const [qrData, setQrData] = React.useState(null);
  const [code, setCode]     = React.useState('');
  const [error, setError]   = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.auth.setup2fa();
        if (alive) setQrData(data);
      } catch (e) {
        if (alive) setError(e.message);
      }
    })();
    return () => { alive = false; };
  }, []);

  const confirm = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.auth.enable2fa({ code });
      await onDone();
    } catch (err) {
      setError(err.message);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-zinc-950 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-mono text-xs font-semibold tracking-[0.2em] uppercase text-zinc-500">ERP-LG · SIBOTEC</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-1">Activación obligatoria de 2FA</h2>
            <p className="text-sm text-zinc-400">
              Por seguridad, debés activar la autenticación en dos pasos antes de continuar.
            </p>
          </div>

          {error && (
            <div className="px-3 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-sm text-rose-400">
              {error}
            </div>
          )}

          {!qrData ? (
            <p className="text-sm text-zinc-500 py-6 text-center">Generando código QR...</p>
          ) : (
            <>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Escaneá este QR con <strong className="text-zinc-200">Google Authenticator</strong> o <strong className="text-zinc-200">Authy</strong>, luego ingresá el código de 6 dígitos.
              </p>
              <div className="flex justify-center">
                <img src={qrData.qr_code} alt="QR 2FA" className="w-44 h-44 rounded-lg border border-zinc-700 bg-white p-1" />
              </div>
              <div className="rounded-md bg-zinc-950/60 border border-zinc-800 px-3 py-2 text-center">
                <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Código manual</p>
                <p className="font-mono text-sm text-zinc-300 tracking-[0.2em] break-all">{qrData.secret}</p>
              </div>
              <form onSubmit={confirm} className="space-y-3">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  autoFocus
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full h-11 rounded-md border border-zinc-700 bg-zinc-950 text-2xl font-mono font-bold text-zinc-100 text-center tracking-[0.5em] placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full h-10 rounded-md bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Activando...' : 'Confirmar y activar 2FA'}
                </button>
              </form>
            </>
          )}

          <button
            onClick={onLogout}
            className="w-full text-xs text-zinc-600 hover:text-zinc-400 transition-colors pt-1"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
