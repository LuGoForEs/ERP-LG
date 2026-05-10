import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { cx } from './primitives';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '1x00000000000000000000AA';

function useTurnstile(onToken, onExpire) {
  const containerRef = React.useRef(null);
  const widgetId = React.useRef(null);

  const reset = React.useCallback(() => {
    if (widgetId.current !== null && window.grecaptcha) {
      window.grecaptcha.reset(widgetId.current);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    let intervalId = null;

    const render = () => {
      if (cancelled || !containerRef.current || widgetId.current !== null) return;
      widgetId.current = window.grecaptcha.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme: 'dark',
        size: 'normal',
        callback:           (token) => onToken(token),
        'expired-callback': ()      => onExpire(),
        'error-callback':   ()      => onExpire(),
      });
    };

    if (window.grecaptcha?.render) {
      render();
    } else {
      intervalId = setInterval(() => {
        if (window.grecaptcha?.render) { clearInterval(intervalId); render(); }
      }, 100);
    }

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { containerRef, reset };
}

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-xs text-rose-400 mt-1">{msg}</p>;
}

export default function LoginPage() {
  const { login, verify2fa } = useAuth();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [turnstileToken, setTurnstileToken] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [needs2fa, setNeeds2fa] = React.useState(false);
  const [code, setCode] = React.useState('');

  const { containerRef, reset: resetCaptcha } = useTurnstile(
    (token) => setTurnstileToken(token),
    ()      => setTurnstileToken(''),
  );

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!turnstileToken) { setError('Completá la verificación de seguridad.'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password, turnstileToken);
      if (result.requires_2fa) setNeeds2fa(true);
    } catch (err) {
      setError(err.message);
      resetCaptcha();
      setTurnstileToken('');
    } finally {
      setLoading(false);
    }
  };

  const handle2fa = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verify2fa(code);
    } catch (err) {
      setError(err.message);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
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
          {!needs2fa ? (
            <>
              <h1 className="text-base font-semibold text-zinc-100 mb-5">Iniciar sesión</h1>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">Email</label>
                  <input
                    type="email"
                    autoFocus
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="usuario@empresa.com"
                    className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-950 text-sm text-zinc-100 px-3 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-950 text-sm text-zinc-100 px-3 pr-9 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                    >
                      {showPassword
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>

                {/* Cloudflare Turnstile — compat=recaptcha mounts here */}
                <div>
                  <div ref={containerRef} />
                  {!turnstileToken && (
                    <p className="text-[10px] font-mono text-zinc-600 mt-1">Verificando seguridad...</p>
                  )}
                  {turnstileToken && (
                    <p className="text-[10px] font-mono text-emerald-600 mt-1">✓ Verificación completada</p>
                  )}
                </div>

                {error && <FieldError msg={error} />}

                <button
                  type="submit"
                  disabled={loading}
                  className={cx(
                    'w-full h-9 rounded-md text-sm font-semibold transition-all',
                    loading
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white',
                  )}
                >
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <button
                  type="button"
                  onClick={() => { setNeeds2fa(false); setError(''); }}
                  className="text-zinc-600 hover:text-zinc-300"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <h1 className="text-base font-semibold text-zinc-100">Verificación en dos pasos</h1>
              </div>
              <p className="text-xs text-zinc-500 mb-5">
                Ingresá el código de 6 dígitos de tu aplicación de autenticación (Google Authenticator, Authy, etc.).
              </p>
              <form onSubmit={handle2fa} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  autoFocus
                  autoComplete="one-time-code"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full h-12 rounded-md border border-zinc-700 bg-zinc-950 text-2xl font-mono font-bold text-zinc-100 text-center tracking-[0.5em] placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />
                {error && <FieldError msg={error} />}
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className={cx(
                    'w-full h-9 rounded-md text-sm font-semibold transition-all',
                    loading || code.length !== 6
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white',
                  )}
                >
                  {loading ? 'Verificando...' : 'Verificar código'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center font-mono text-[10px] text-zinc-700 mt-5">
          ERP-LG · Acceso restringido
        </p>
      </div>
    </div>
  );
}
