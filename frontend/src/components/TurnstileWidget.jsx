import React from 'react';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '1x00000000000000000000AA';

/**
 * Widget de Cloudflare Turnstile. Se monta/desmonta con el ciclo de vida del
 * componente y permite que el padre lo resetee imperativamente vía ref.
 *
 * Uso:
 *   const wref = React.useRef(null);
 *   <TurnstileWidget ref={wref} onToken={setToken} onExpire={() => setToken('')} />
 *   // wref.current.reset() para forzar refresh del token.
 */
const TurnstileWidget = React.forwardRef(function TurnstileWidget(
  { onToken, onExpire, theme = 'dark', size = 'normal' },
  ref,
) {
  const containerRef = React.useRef(null);
  const widgetId = React.useRef(null);
  const callbacks = React.useRef({ onToken, onExpire });

  React.useEffect(() => {
    callbacks.current = { onToken, onExpire };
  }, [onToken, onExpire]);

  React.useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetId.current !== null && window.grecaptcha) {
        window.grecaptcha.reset(widgetId.current);
      }
    },
  }), []);

  React.useEffect(() => {
    let cancelled = false;
    let intervalId = null;

    const render = () => {
      if (cancelled || !containerRef.current || widgetId.current !== null) return;
      widgetId.current = window.grecaptcha.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme,
        size,
        callback:           (token) => callbacks.current.onToken && callbacks.current.onToken(token),
        'expired-callback': ()      => callbacks.current.onExpire && callbacks.current.onExpire(),
        'error-callback':   ()      => callbacks.current.onExpire && callbacks.current.onExpire(),
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
      if (widgetId.current !== null && window.grecaptcha) {
        try { window.grecaptcha.remove(widgetId.current); } catch { /* ignore */ }
        widgetId.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} />;
});

export default TurnstileWidget;
