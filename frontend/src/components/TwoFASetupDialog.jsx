import React from 'react';
import { api } from '../api';
import { cx, Icon } from './primitives';

export default function TwoFASetupDialog({ user, open, onClose, onUpdated }) {
  const [step, setStep] = React.useState('idle'); // idle | setup | disable
  const [qrData, setQrData] = React.useState(null);
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState('');

  React.useEffect(() => {
    if (!open) { setStep('idle'); setCode(''); setError(''); setSuccess(''); setQrData(null); }
  }, [open]);

  const startSetup = async () => {
    setLoading(true); setError('');
    try {
      const data = await api.auth.setup2fa();
      setQrData(data);
      setStep('setup');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const confirmEnable = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.auth.enable2fa({ code });
      setSuccess('2FA activado correctamente.');
      setStep('idle');
      onUpdated?.();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const confirmDisable = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.auth.disable2fa({ code });
      setSuccess('2FA desactivado.');
      setStep('idle');
      onUpdated?.();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Icon name="shield" size={15} className="text-blue-400" />
            <h2 className="font-semibold text-zinc-100 text-sm">Autenticación en dos pasos (2FA)</h2>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300">
            <Icon name="x" size={15} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {success && (
            <div className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-400">{success}</div>
          )}
          {error && (
            <div className="rounded-md bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-sm text-rose-400">{error}</div>
          )}

          {step === 'idle' && (
            <>
              <div className={cx(
                'rounded-md border px-3 py-2.5 text-sm',
                user?.totp_enabled
                  ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
                  : 'border-zinc-700 text-zinc-400',
              )}>
                {user?.totp_enabled
                  ? '2FA está activo. Tu cuenta está protegida con un código adicional al iniciar sesión.'
                  : '2FA no está activo. Activalo para proteger tu cuenta con Google Authenticator o Authy.'}
              </div>

              {!user?.totp_enabled ? (
                <button
                  onClick={startSetup}
                  disabled={loading}
                  className="w-full h-9 rounded-md bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                >
                  {loading ? 'Generando QR...' : 'Activar 2FA'}
                </button>
              ) : (
                <button
                  onClick={() => { setStep('disable'); setCode(''); setError(''); }}
                  className="w-full h-9 rounded-md border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-sm font-medium transition-colors"
                >
                  Desactivar 2FA
                </button>
              )}
            </>
          )}

          {step === 'setup' && qrData && (
            <>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Escaneá este QR con <strong className="text-zinc-200">Google Authenticator</strong> o <strong className="text-zinc-200">Authy</strong>, luego ingresá el código de 6 dígitos para confirmar.
              </p>
              <div className="flex justify-center">
                <img src={qrData.qr_code} alt="QR 2FA" className="w-44 h-44 rounded-lg border border-zinc-700 bg-white p-1" />
              </div>
              <div className="rounded-md bg-zinc-950/60 border border-zinc-800 px-3 py-2 text-center">
                <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Código manual</p>
                <p className="font-mono text-sm text-zinc-300 tracking-[0.2em]">{qrData.secret}</p>
              </div>
              <form onSubmit={confirmEnable} className="space-y-3">
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
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep('idle')} className="flex-1 h-9 rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm transition-colors">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="flex-1 h-9 rounded-md bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Activando...' : 'Confirmar y activar'}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === 'disable' && (
            <>
              <p className="text-xs text-zinc-400">Ingresá tu código actual para confirmar que querés desactivar 2FA.</p>
              <form onSubmit={confirmDisable} className="space-y-3">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  autoFocus
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full h-11 rounded-md border border-zinc-700 bg-zinc-950 text-2xl font-mono font-bold text-zinc-100 text-center tracking-[0.5em] placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep('idle')} className="flex-1 h-9 rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm transition-colors">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="flex-1 h-9 rounded-md bg-rose-600 hover:bg-rose-500 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Desactivando...' : 'Desactivar 2FA'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
