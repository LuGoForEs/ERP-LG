import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api';
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

  // 'login' | '2fa' | 'activate' | 'activate-sent' | 'reset' | 'reset-sent'
  const [view, setView] = React.useState('login');

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [turnstileToken, setTurnstileToken] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [code, setCode] = React.useState('');

  const [activateEmail, setActivateEmail] = React.useState('');
  const [activateError, setActivateError] = React.useState('');

  const ALL_ROLES = [
    { value: 'comercial',      label: 'Comercial' },
    { value: 'administracion', label: 'Administración' },
    { value: 'desarrollo',     label: 'Desarrollo' },
    { value: 'compras',        label: 'Compras' },
    { value: 'panol',          label: 'Pañol' },
    { value: 'produccion',     label: 'Producción' },
    { value: 'logistica',      label: 'Logística' },
    { value: 'gerencia',       label: 'Gerencia' },
  ];
  const [resetEmail, setResetEmail] = React.useState('');
  const [resetDni, setResetDni] = React.useState('');
  const [resetRoles, setResetRoles] = React.useState([]);
  const [resetError, setResetError] = React.useState('');

  const toggleResetRole = (val) => {
    setResetRoles(prev => prev.includes(val) ? prev.filter(r => r !== val) : [...prev, val]);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim() || !resetDni.trim() || resetRoles.length === 0) return;
    setResetError('');
    setLoading(true);
    try {
      await api.auth.requestPasswordReset({
        email: resetEmail.trim().toLowerCase(),
        dni: resetDni.trim(),
        roles: resetRoles,
      });
      setView('reset-sent');
    } catch (err) {
      setResetError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const goToLoginFromReset = () => {
    setView('login');
    setResetEmail('');
    setResetDni('');
    setResetRoles([]);
    setResetError('');
  };

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
      if (result.requires_2fa) setView('2fa');
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

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!activateEmail.trim()) return;
    setActivateError('');
    setLoading(true);
    try {
      await api.auth.resendActivation({ email: activateEmail.trim().toLowerCase() });
      setView('activate-sent');
    } catch (err) {
      setActivateError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    setView('login');
    setActivateEmail('');
    setActivateError('');
    setError('');
  };

  const BackButton = ({ onClick }) => (
    <button type="button" onClick={onClick} className="text-zinc-600 hover:text-zinc-300 transition-colors">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
  );

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

          {/* ── Login ── */}
          {view === 'login' && (
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
                    loading ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white',
                  )}
                >
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-zinc-800 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setView('activate')}
                  className="text-xs text-zinc-500 hover:text-amber-400 transition-colors"
                >
                  ¿Tenés una cuenta nueva? Activar cuenta
                </button>
                <button
                  type="button"
                  onClick={() => setView('reset')}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </>
          )}

          {/* ── 2FA ── */}
          {view === '2fa' && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <BackButton onClick={() => { setView('login'); setError(''); }} />
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
                    loading || code.length !== 6 ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white',
                  )}
                >
                  {loading ? 'Verificando...' : 'Verificar código'}
                </button>
              </form>
            </>
          )}

          {/* ── Activar cuenta ── */}
          {view === 'activate' && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <BackButton onClick={goToLogin} />
                <h1 className="text-base font-semibold text-zinc-100">Activar cuenta</h1>
              </div>
              <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
                Si tu cuenta fue creada por un administrador y aún no la activaste, ingresá tu email para recibir el link de activación.
              </p>
              <form onSubmit={handleActivate} className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">Email</label>
                  <input
                    type="email"
                    autoFocus
                    autoComplete="email"
                    value={activateEmail}
                    onChange={e => setActivateEmail(e.target.value)}
                    required
                    placeholder="usuario@empresa.com"
                    className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-950 text-sm text-zinc-100 px-3 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors"
                  />
                </div>

                {activateError && <FieldError msg={activateError} />}

                <button
                  type="submit"
                  disabled={loading || !activateEmail.trim()}
                  className={cx(
                    'w-full h-9 rounded-md text-sm font-semibold transition-all',
                    loading || !activateEmail.trim() ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-400 text-zinc-950',
                  )}
                >
                  {loading ? 'Enviando...' : 'Enviar link de activación'}
                </button>
              </form>
            </>
          )}

          {/* ── Confirmación activación ── */}
          {view === 'activate-sent' && (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 grid place-items-center mx-auto">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber-400"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100 mb-1">Email enviado</p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Si <span className="text-zinc-300 font-mono">{activateEmail}</span> tiene una cuenta pendiente de activación, recibirás el link en unos momentos.
                </p>
                <p className="text-[10px] text-zinc-600 mt-2">El link es válido por 72 horas.</p>
              </div>
              <button
                type="button"
                onClick={goToLogin}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                ← Volver al inicio de sesión
              </button>
            </div>
          )}

          {/* ── Recuperar contraseña ── */}
          {view === 'reset' && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <BackButton onClick={goToLoginFromReset} />
                <h1 className="text-base font-semibold text-zinc-100">Recuperar contraseña</h1>
              </div>
              <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
                Ingresá tu email, DNI y al menos uno de tus roles para recibir el link de recuperación.
              </p>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">Email</label>
                  <input
                    type="email"
                    autoFocus
                    autoComplete="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    required
                    placeholder="usuario@empresa.com"
                    className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-950 text-sm text-zinc-100 px-3 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">DNI</label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={resetDni}
                    onChange={e => setResetDni(e.target.value)}
                    required
                    placeholder="12345678"
                    className="w-full h-9 rounded-md border border-zinc-700 bg-zinc-950 text-sm text-zinc-100 px-3 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Roles (seleccioná al menos uno)</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ALL_ROLES.map(r => (
                      <label key={r.value} className={cx(
                        'flex items-center gap-2 px-2.5 py-1.5 rounded-md border cursor-pointer transition-colors text-xs',
                        resetRoles.includes(r.value)
                          ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600',
                      )}>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={resetRoles.includes(r.value)}
                          onChange={() => toggleResetRole(r.value)}
                        />
                        <span className={cx(
                          'w-3.5 h-3.5 rounded shrink-0 border flex items-center justify-center',
                          resetRoles.includes(r.value) ? 'border-amber-500 bg-amber-500' : 'border-zinc-600',
                        )}>
                          {resetRoles.includes(r.value) && (
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-zinc-950"><polyline points="20 6 9 17 4 12"/></svg>
                          )}
                        </span>
                        {r.label}
                      </label>
                    ))}
                  </div>
                </div>

                {resetError && <FieldError msg={resetError} />}

                <button
                  type="submit"
                  disabled={loading || !resetEmail.trim() || !resetDni.trim() || resetRoles.length === 0}
                  className={cx(
                    'w-full h-9 rounded-md text-sm font-semibold transition-all',
                    loading || !resetEmail.trim() || !resetDni.trim() || resetRoles.length === 0
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-400 text-zinc-950',
                  )}
                >
                  {loading ? 'Enviando...' : 'Enviar link de recuperación'}
                </button>
              </form>
            </>
          )}

          {/* ── Confirmación recuperación ── */}
          {view === 'reset-sent' && (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 grid place-items-center mx-auto">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber-400"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100 mb-1">Email enviado</p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Si <span className="text-zinc-300 font-mono">{resetEmail}</span> coincide con una cuenta registrada, recibirás el link de recuperación en unos momentos.
                </p>
                <p className="text-[10px] text-zinc-600 mt-2">El link es válido por 72 horas.</p>
              </div>
              <button
                type="button"
                onClick={goToLoginFromReset}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                ← Volver al inicio de sesión
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
