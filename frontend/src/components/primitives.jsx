import React from 'react';
import { V2_MODULES, V2_MODULE_ICONS, V2_ESTADO } from '../data/mock';

// ─── CLASS MERGE ──────────────────────────────────────────────────────────────
export function cx(...args) {
  return args.filter(Boolean).join(' ');
}

// ─── RESPONSIVE ───────────────────────────────────────────────────────────────
export function useMediaQuery(query) {
  const get = () => typeof window !== 'undefined' && window.matchMedia(query).matches;
  const [matches, setMatches] = React.useState(get);
  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = () => setMatches(mql.matches);
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

// true en tablet/móvil (< lg = 1024px) — usado para drawer + hamburguesa
export const useIsMobile = () => useMediaQuery('(max-width: 1023px)');
// true solo en teléfono (< md = 768px) — layout de columna única / detalle full-screen
export const useIsPhone  = () => useMediaQuery('(max-width: 767px)');
// true en dispositivos sin puntero fino (touch) — atajos de teclado inútiles
export const useIsTouch  = () => useMediaQuery('(pointer: coarse)');

// Permite que ModuleHeader abra el drawer sin prop-drilling por los 9 paneles
const SidebarToggleContext = React.createContext(null);
export function SidebarToggleProvider({ value, children }) {
  return <SidebarToggleContext.Provider value={value}>{children}</SidebarToggleContext.Provider>;
}
export function useSidebarToggle() {
  return React.useContext(SidebarToggleContext);
}

// ─── ICON ─────────────────────────────────────────────────────────────────────
export function Icon({ name, size = 16, className = '', strokeWidth = 1.75 }) {
  const paths = {
    'briefcase':   <><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><path d="M22 13a18 18 0 0 1-20 0"/></>,
    'wallet':      <><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></>,
    'compass':     <><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/><circle cx="12" cy="12" r="10"/></>,
    'shopping':    <><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></>,
    'package':     <><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"/><path d="m7.5 4.27 9 5.15"/></>,
    'factory':     <><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></>,
    'truck':       <><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></>,
    'plus':        <><path d="M5 12h14"/><path d="M12 5v14"/></>,
    'x':           <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>,
    'menu':        <><path d="M4 12h16"/><path d="M4 6h16"/><path d="M4 18h16"/></>,
    'arrow-left':  <><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></>,
    'check':       <><path d="M20 6 9 17l-5-5"/></>,
    'check-circle':<><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></>,
    'alert':       <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></>,
    'chevron-down':<><path d="m6 9 6 6 6-6"/></>,
    'chevron-up':  <><path d="m18 15-6-6-6 6"/></>,
    'chevron-right': <><path d="m9 18 6-6-6-6"/></>,
    'arrow-up':    <><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></>,
    'arrow-down':  <><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></>,
    'search':      <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
    'file-text':   <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></>,
    'upload':      <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
    'trash':       <><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
    'keyboard':    <><path d="M10 8h.01"/><path d="M12 12h.01"/><path d="M14 8h.01"/><path d="M16 12h.01"/><path d="M18 8h.01"/><path d="M6 8h.01"/><path d="M7 16h10"/><path d="M8 12h.01"/><rect width="20" height="16" x="2" y="4" rx="2"/></>,
    'command':     <><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/></>,
    'circle-dot':  <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1" fill="currentColor"/></>,
    'shield':      <><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></>,
    'log-out':     <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    'users':       <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    'user-plus':   <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></>,
    'edit':        <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    'mail':        <><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></>,
    'bell':        <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
    'inbox':       <><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></>,
    'circle':      <><circle cx="12" cy="12" r="10"/></>,
  };
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >{paths[name] || null}</svg>
  );
}

// ─── BUTTON ───────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'default', size = 'md', accent = 'blue', className = '', icon, iconAfter, ...props }) {
  const isTouch = useIsTouch();
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.97] active:transition-none';
  // En pantallas táctiles agrandamos los tamaños chicos para alcanzar ~40px de área de toque.
  const sizes = isTouch ? {
    xs: 'h-9 px-3 text-xs',
    sm: 'h-9 px-3.5 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-sm',
    icon: 'h-10 w-10 p-0',
  } : {
    xs: 'h-7 px-2.5 text-xs',
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 text-sm',
    lg: 'h-10 px-5 text-sm',
    icon: 'h-8 w-8 p-0',
  };
  const accentRing = `focus-visible:ring-${accent}-500/60`;
  const variants = {
    default: `bg-${accent}-500 hover:bg-${accent}-400 text-white border border-${accent}-400/40 ${accentRing}`,
    outline: `border border-zinc-800 hover:border-${accent}-500/60 hover:bg-${accent}-500/5 text-zinc-200 hover:text-${accent}-300 ${accentRing}`,
    ghost: `text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 ${accentRing}`,
    danger: `bg-rose-500 hover:bg-rose-400 text-white border border-rose-400/40 focus-visible:ring-rose-500/60`,
    success: `bg-emerald-500 hover:bg-emerald-400 text-white border border-emerald-400/40 focus-visible:ring-emerald-500/60`,
  };
  return (
    <button {...props} className={cx(base, sizes[size], variants[variant], className)}>
      {icon && <Icon name={icon} size={size === 'lg' ? 16 : 14} />}
      {children}
      {iconAfter && <Icon name={iconAfter} size={size === 'lg' ? 16 : 14} />}
    </button>
  );
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
export const Input = React.forwardRef(function Input({ className = '', error, ...props }, ref) {
  return (
    <input
      ref={ref}
      {...props}
      className={cx(
        'h-9 w-full rounded-md bg-zinc-950/50 border px-3 text-sm text-zinc-100 placeholder:text-zinc-600',
        'focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors',
        error
          ? 'border-rose-500/60 focus:ring-rose-500/40 focus:border-rose-500'
          : 'border-zinc-800 hover:border-zinc-700 focus:ring-blue-500/40 focus:border-blue-500',
        className,
      )}
    />
  );
});

// ─── TEXTAREA ─────────────────────────────────────────────────────────────────
export const Textarea = React.forwardRef(function Textarea({ className = '', error, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      {...props}
      className={cx(
        'min-h-[72px] w-full rounded-md bg-zinc-950/50 border px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600',
        'focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors resize-y',
        error
          ? 'border-rose-500/60 focus:ring-rose-500/40 focus:border-rose-500'
          : 'border-zinc-800 hover:border-zinc-700 focus:ring-blue-500/40 focus:border-blue-500',
        className,
      )}
    />
  );
});

// ─── SELECT ───────────────────────────────────────────────────────────────────
export function Select({ value, onChange, options, className = '', placeholder, ...props }) {
  return (
    <div className={cx('relative', className)}>
      <select
        value={value}
        onChange={onChange}
        {...props}
        className={cx(
          'block appearance-none h-9 w-full rounded-md bg-zinc-950/50 border border-zinc-800 pl-3 pr-8 text-sm text-zinc-100',
          'hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500',
          'cursor-pointer transition-colors',
        )}
        style={{ backgroundImage: 'none' }}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-zinc-900">{o.label}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-zinc-500">
        <Icon name="chevron-down" size={14} />
      </div>
    </div>
  );
}

// ─── LABEL / FIELD ────────────────────────────────────────────────────────────
export function Label({ children, htmlFor, className = '', required }) {
  return (
    <label
      htmlFor={htmlFor}
      className={cx(
        'block font-mono text-[10px] uppercase tracking-[0.08em] text-zinc-500 mb-1.5',
        className,
      )}
    >
      {children}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
  );
}

export function Field({ label, required, error, hint, children, className = '' }) {
  return (
    <div className={cx('space-y-1', className)}>
      {label && <Label required={required}>{label}</Label>}
      {children}
      {error && <p className="text-[11px] text-rose-400 font-mono">{error}</p>}
      {hint && !error && <p className="text-[11px] text-zinc-600">{hint}</p>}
    </div>
  );
}

// ─── BADGE ────────────────────────────────────────────────────────────────────
export function Badge({ children, accent = 'slate', dot = false, className = '' }) {
  const colors = {
    slate:   'bg-zinc-800/60 text-zinc-400 border-zinc-800/60',
    blue:    'bg-blue-500/10 text-blue-400 border-blue-500/30',
    violet:  'bg-violet-500/10 text-violet-400 border-violet-500/30',
    cyan:    'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    amber:   'bg-amber-500/10 text-amber-400 border-amber-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    rose:    'bg-rose-500/10 text-rose-400 border-rose-500/30',
    orange:  'bg-orange-500/10 text-orange-400 border-orange-500/30',
  };
  const dotColors = {
    slate: 'bg-zinc-400', blue: 'bg-blue-400', violet: 'bg-violet-400', cyan: 'bg-cyan-400',
    amber: 'bg-amber-400', emerald: 'bg-emerald-400', rose: 'bg-rose-400', orange: 'bg-orange-400',
  };
  return (
    <span className={cx(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[10px] font-semibold uppercase tracking-wider border',
      colors[accent] || colors.slate,
      className,
    )}>
      {dot && <span className={cx('w-1.5 h-1.5 rounded-full', dotColors[accent] || dotColors.slate)} />}
      {children}
    </span>
  );
}

export function EstadoBadge({ estado }) {
  const cfg = V2_ESTADO[estado] || { label: estado, accent: 'slate' };
  return <Badge accent={cfg.accent}>{cfg.label}</Badge>;
}

// ─── CARD ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', ...props }) {
  return (
    <div {...props} className={cx('rounded-lg border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm overflow-hidden', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', actions }) {
  return (
    <div className={cx('flex items-center justify-between gap-2 px-4 py-3 border-b border-zinc-800', className)}>
      <div className="flex items-center gap-2 min-w-0">{children}</div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function CardTitle({ children, hint }) {
  return (
    <div className="flex items-baseline gap-2 min-w-0">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-zinc-500 font-semibold truncate">{children}</h3>
      {hint != null && <span className="font-mono text-[11px] text-zinc-600 shrink-0">{hint}</span>}
    </div>
  );
}

// ─── METRIC ───────────────────────────────────────────────────────────────────
export function Metric({ label, value, sub, accent = 'slate', icon, onClick }) {
  const accentCls = {
    blue: 'border-t-blue-500/60', violet: 'border-t-violet-500/60', cyan: 'border-t-cyan-500/60',
    amber: 'border-t-amber-500/60', emerald: 'border-t-emerald-500/60', rose: 'border-t-rose-500/60',
    orange: 'border-t-orange-500/60', slate: 'border-t-zinc-800',
  };
  const iconCls = {
    blue: 'text-blue-400 bg-blue-500/10', violet: 'text-violet-400 bg-violet-500/10',
    cyan: 'text-cyan-400 bg-cyan-500/10', amber: 'text-amber-400 bg-amber-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10', rose: 'text-rose-400 bg-rose-500/10',
    orange: 'text-orange-400 bg-orange-500/10', slate: 'text-zinc-400 bg-zinc-800',
  };
  return (
    <div
      onClick={onClick}
      className={cx(
        'flex-1 min-w-0 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 border-t-2 backdrop-blur-sm',
        accentCls[accent] || accentCls.slate,
        onClick && 'cursor-pointer hover:bg-zinc-800/60 transition-colors',
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-zinc-500 font-semibold">{label}</span>
        {icon && (
          <span className={cx('w-7 h-7 rounded grid place-items-center', iconCls[accent] || iconCls.slate)}>
            <Icon name={icon} size={14} />
          </span>
        )}
      </div>
      <div className="font-mono text-2xl font-bold text-zinc-100 leading-none tracking-tight">{value}</div>
      {sub && <div className="text-[11px] text-zinc-500 mt-1.5">{sub}</div>}
    </div>
  );
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
const ToastContext = React.createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);
  const push = React.useCallback((toast) => {
    const id = Math.random().toString(36).slice(2);
    // toasts con action (ej. Undo) duran más para dar tiempo al usuario.
    const ttl = toast.action ? 7000 : 3500;
    setToasts(prev => [...prev, { id, type: 'success', ...toast }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, ttl);
  }, []);
  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] inset-x-3 sm:inset-x-auto sm:right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            role="status"
            className={cx(
              'pointer-events-auto w-full sm:w-auto sm:min-w-[260px] sm:max-w-sm rounded-lg border bg-zinc-900 backdrop-blur-md',
              'shadow-lg flex items-center gap-3 px-3.5 py-3 animate-in slide-in-from-right',
              t.type === 'success' && 'border-emerald-500/40 border-l-4 border-l-emerald-500',
              t.type === 'error'   && 'border-rose-500/40 border-l-4 border-l-rose-500',
              t.type === 'info'    && 'border-blue-500/40 border-l-4 border-l-blue-500',
            )}
          >
            <span className={cx(
              'shrink-0 w-6 h-6 rounded-full grid place-items-center',
              t.type === 'success' && 'bg-emerald-500/20 text-emerald-400',
              t.type === 'error'   && 'bg-rose-500/20 text-rose-400',
              t.type === 'info'    && 'bg-blue-500/20 text-blue-400',
            )}>
              <Icon name={t.type === 'success' ? 'check' : t.type === 'error' ? 'x' : 'circle-dot'} size={12} strokeWidth={3} />
            </span>
            <p className="text-sm text-zinc-100 flex-1">{t.msg}</p>
            {t.action && (
              <button
                onClick={() => { dismiss(t.id); t.action.onClick?.(); }}
                className="shrink-0 px-2.5 h-7 text-xs font-mono uppercase tracking-wider rounded border border-zinc-700 text-zinc-200 hover:bg-zinc-800"
              >
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismiss(t.id)} className="shrink-0 grid place-items-center w-9 h-9 -mr-2 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800">
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return React.useContext(ToastContext);
}

// ─── DIALOG ───────────────────────────────────────────────────────────────────
export function Dialog({ open, onClose, title, children, size = 'md' }) {
  const dialogRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    // Guardamos el elemento que tenía focus para devolvérselo al cerrar.
    const prevActive = document.activeElement;

    // Autofocus el primer input/button enfocable del modal.
    const node = dialogRef.current;
    const focusFirst = () => {
      if (!node) return;
      const focusable = node.querySelector('input, textarea, select, [role="switch"], button:not([data-dialog-close])');
      if (focusable) focusable.focus();
    };
    setTimeout(focusFirst, 30);

    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      // Focus trap simple — Tab cicla dentro del dialog.
      if (e.key === 'Tab' && node) {
        const focusables = node.querySelectorAll(
          'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      // Devolver focus al disparador
      if (prevActive && prevActive.focus) { try { prevActive.focus(); } catch { /* ignore */ } }
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      <div ref={dialogRef} className={cx(
        'relative w-full bg-zinc-900 border-0 sm:border border-zinc-800 rounded-none sm:rounded-lg shadow-2xl',
        'animate-in zoom-in-95 flex flex-col max-h-full sm:max-h-[90vh] pb-[env(safe-area-inset-bottom)] sm:pb-0',
        sizes[size],
      )}>
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
            <h2 className="font-semibold text-zinc-100">{title}</h2>
            <button onClick={onClose} className="shrink-0 grid place-items-center w-10 h-10 -mr-2 text-zinc-500 hover:text-zinc-200 rounded hover:bg-zinc-800">
              <Icon name="x" size={18} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ─── CONFIRM DIALOG ───────────────────────────────────────────────────────────
// Reemplaza window.confirm con UI consistente. variant controla accent:
//  - 'danger' (rose): para destructivo irreversible.
//  - 'warning' (amber): para acciones serias pero reversibles.
//  - 'default' (blue): confirmaciones normales.
export function ConfirmDialog({
  open, onCancel, onConfirm,
  title = 'Confirmar acción',
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  busy = false,
}) {
  const accent = { danger: 'danger', warning: 'default', default: 'default' }[variant] || 'default';
  const iconAccent = { danger: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
                       warning: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
                       default: 'text-blue-400 bg-blue-500/10 border-blue-500/30' }[variant];
  const iconName = { danger: 'alert', warning: 'alert', default: 'circle-dot' }[variant];

  return (
    <Dialog open={open} onClose={busy ? undefined : onCancel} size="sm">
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <span className={cx('w-9 h-9 rounded-md border grid place-items-center shrink-0', iconAccent)}>
            <Icon name={iconName} size={16} />
          </span>
          <div className="flex-1 min-w-0 pt-0.5">
            <h2 className="font-semibold text-zinc-100 leading-snug">{title}</h2>
            {description && (
              <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed whitespace-pre-wrap">{description}</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy} data-dialog-close>{cancelLabel}</Button>
          <Button
            variant={accent === 'danger' ? 'danger' : 'default'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Procesando...' : confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// Hook práctico para usar ConfirmDialog sin manejar estado en cada lugar.
// Uso: const confirm = useConfirm();
//      const ok = await confirm({ title, description, variant: 'danger' });
//      if (ok) ...
const ConfirmContext = React.createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = React.useState(null);
  const resolver = React.useRef(null);

  const confirm = React.useCallback((opts) => {
    return new Promise((resolve) => {
      resolver.current = resolve;
      setState({ ...opts });
    });
  }, []);

  const handleCancel = () => { resolver.current?.(false); setState(null); };
  const handleConfirm = () => { resolver.current?.(true); setState(null); };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={!!state}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        title={state?.title}
        description={state?.description}
        confirmLabel={state?.confirmLabel}
        cancelLabel={state?.cancelLabel}
        variant={state?.variant}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const fn = React.useContext(ConfirmContext);
  if (!fn) {
    // Fallback al confirm nativo si no hay provider — degradación suave.
    return async (opts) => window.confirm(opts.description || opts.title || '¿Confirmás?');
  }
  return fn;
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
export function Tabs({ value, onChange, items, accent = 'cyan', className = '' }) {
  return (
    <div className={cx('inline-flex max-w-full overflow-x-auto bg-zinc-900 border border-zinc-800 rounded-lg p-1', className)} role="tablist">
      {items.map(t => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cx(
              'px-3.5 h-7 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0',
              active
                ? `bg-${accent}-500/15 text-${accent}-300 shadow-sm`
                : 'text-zinc-500 hover:text-zinc-300',
            )}
          >
            {t.label}
            {t.count != null && (
              <span className={cx('ml-1.5 font-mono text-[10px]', active ? `text-${accent}-400/80` : 'text-zinc-600')}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── LIST KEYBOARD NAV ────────────────────────────────────────────────────────
// Navegación con flechas ↑/↓ y Enter sobre una lista en foco. Devuelve el índice
// activo + handlers para spreadear en el contenedor (focusable con tabIndex=0).
//   const { activeIdx, listProps } = useListKeyboardNav(items, { onSelect, wrap });
//   <ul tabIndex={0} {...listProps}>...
export function useListKeyboardNav(items, { onSelect, wrap = false } = {}) {
  const [activeIdx, setActiveIdx] = React.useState(0);

  React.useEffect(() => {
    if (activeIdx >= items.length) setActiveIdx(Math.max(0, items.length - 1));
  }, [items.length, activeIdx]);

  const onKeyDown = (e) => {
    if (items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => {
        if (i + 1 >= items.length) return wrap ? 0 : i;
        return i + 1;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => {
        if (i - 1 < 0) return wrap ? items.length - 1 : 0;
        return i - 1;
      });
    } else if (e.key === 'Home') {
      e.preventDefault(); setActiveIdx(0);
    } else if (e.key === 'End') {
      e.preventDefault(); setActiveIdx(items.length - 1);
    } else if (e.key === 'Enter' && onSelect) {
      e.preventDefault();
      onSelect(items[activeIdx], activeIdx);
    }
  };

  return { activeIdx, setActiveIdx, listProps: { tabIndex: 0, onKeyDown } };
}

// ─── FILE DROP ────────────────────────────────────────────────────────────────
// Hook para convertir un contenedor en drop zone de archivos. Devuelve
// `dragActive` (bool) y `dropProps` (handlers para spreadear en el div).
// El contador interno evita el parpadeo clásico de dragEnter/dragLeave con
// elementos hijos. Filtra drags que no traen archivos (texto, urls).
export function useFileDrop(onFiles, { disabled = false } = {}) {
  const [dragActive, setDragActive] = React.useState(false);
  const counterRef = React.useRef(0);

  // Si dejamos de ser válidos (disabled toggleó a true) reseteamos.
  React.useEffect(() => {
    if (disabled) { counterRef.current = 0; setDragActive(false); }
  }, [disabled]);

  const hasFiles = (e) => {
    const types = e.dataTransfer?.types;
    if (!types) return false;
    return Array.from(types).includes('Files');
  };

  const onDragEnter = (e) => {
    if (disabled) return;
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    counterRef.current += 1;
    if (counterRef.current === 1) setDragActive(true);
  };

  const onDragOver = (e) => {
    if (disabled) return;
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  };

  const onDragLeave = (e) => {
    if (disabled) return;
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    counterRef.current = Math.max(0, counterRef.current - 1);
    if (counterRef.current === 0) setDragActive(false);
  };

  const onDrop = (e) => {
    if (disabled) return;
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    counterRef.current = 0;
    setDragActive(false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length > 0) onFiles?.(files);
  };

  return {
    dragActive: dragActive && !disabled,
    dropProps: { onDragEnter, onDragOver, onDragLeave, onDrop },
  };
}

// ─── TOGGLE ───────────────────────────────────────────────────────────────────
// Switch deslizable estilo iOS. Si onChange no se provee → modo read-only
// (se ve igual pero no responde a clicks ni focus).
export function Toggle({ checked, onChange, label, hint, accent = 'emerald', disabled = false }) {
  const readOnly = !onChange;
  const interactive = !readOnly && !disabled;
  const accentBg = {
    emerald: 'bg-emerald-500', rose: 'bg-rose-500', blue: 'bg-blue-500',
    amber: 'bg-amber-500', cyan: 'bg-cyan-500', violet: 'bg-violet-500',
  }[accent] || 'bg-emerald-500';
  return (
    <label className={cx(
      'flex items-center gap-3 rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 transition-colors',
      interactive ? 'hover:border-zinc-700 cursor-pointer' : 'opacity-90',
      disabled && 'opacity-50 cursor-not-allowed',
    )}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-zinc-100">{label}</div>
        {hint && <div className="text-[11px] text-zinc-500 mt-0.5">{hint}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-readonly={readOnly}
        disabled={!interactive}
        onClick={interactive ? () => onChange(!checked) : undefined}
        className={cx(
          'relative w-11 h-6 rounded-full transition-colors shrink-0',
          checked ? accentBg : 'bg-zinc-800',
          interactive ? 'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:ring-blue-500/60' : '',
        )}
      >
        <span className={cx(
          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-5',
        )} />
      </button>
    </label>
  );
}

// ─── KBD ──────────────────────────────────────────────────────────────────────
export function Kbd({ children }) {
  const isTouch = useIsTouch();
  if (isTouch) return null;
  return (
    <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded border border-zinc-800 bg-zinc-900 font-mono text-[10px] text-zinc-400 shadow-[0_2px_0_0_rgb(15_23_42)]">
      {children}
    </kbd>
  );
}

// ─── SECTION LABEL ────────────────────────────────────────────────────────────
export function SectionLabel({ children, className = '' }) {
  return (
    <div className={cx('font-mono text-[10px] uppercase tracking-[0.1em] text-zinc-500 font-semibold mb-2.5', className)}>
      {children}
    </div>
  );
}

export function EmptyState({ icon = 'circle-dot', msg, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
      <span className="w-12 h-12 rounded-full bg-zinc-800/60 grid place-items-center text-zinc-600">
        <Icon name={icon} size={20} />
      </span>
      <p className="text-sm text-zinc-400">{msg}</p>
      {hint && <p className="text-xs text-zinc-600">{hint}</p>}
      {action && (
        <div className="mt-3">
          <Button onClick={action.onClick} icon={action.icon} size="sm">{action.label}</Button>
        </div>
      )}
    </div>
  );
}

// ─── TOOLTIP ──────────────────────────────────────────────────────────────────
// Pequeño tooltip con delay. Solo se renderiza hover (no touch). Para forzar
// aparición en focus también, se activa con focus-within del wrapper.
export function Tooltip({ label, children, side = 'top', delay = 400 }) {
  const isTouch = useIsTouch();
  const [visible, setVisible] = React.useState(false);
  const timer = React.useRef(null);

  if (isTouch || !label) return children;

  const show = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(true), delay);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setVisible(false);
  };

  const pos = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left:   'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right:  'left-full top-1/2 -translate-y-1/2 ml-1.5',
  }[side];

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span className={cx(
          'absolute z-50 whitespace-nowrap px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider',
          'bg-zinc-100 text-zinc-900 shadow-lg pointer-events-none',
          'animate-in fade-in zoom-in-95 duration-100',
          pos,
        )}>
          {label}
        </span>
      )}
    </span>
  );
}

// ─── BREADCRUMB ───────────────────────────────────────────────────────────────
// Navegación contextual. items: [{ label, onClick? }]. El último item se
// renderiza sin onClick (es la posición actual).
export function Breadcrumb({ items = [], className = '' }) {
  return (
    <nav className={cx('flex items-center gap-1.5 text-xs text-zinc-500 min-w-0', className)} aria-label="Breadcrumb">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && <Icon name="chevron-right" size={11} className="text-zinc-700 shrink-0" />}
            {last || !it.onClick ? (
              <span className={cx('truncate', last ? 'text-zinc-300 font-medium' : 'text-zinc-500')}>{it.label}</span>
            ) : (
              <button
                type="button"
                onClick={it.onClick}
                className="truncate hover:text-zinc-200 transition-colors"
              >
                {it.label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────
// Bloques placeholder con shimmer sutil. Communica estructura de los datos que
// vienen — perceived performance (Doherty Threshold).
export function Skeleton({ variant = 'line', count = 1, className = '' }) {
  const items = Array.from({ length: count });
  const base = 'animate-pulse bg-zinc-800/60 rounded';

  if (variant === 'line') {
    return (
      <div className={cx('space-y-2', className)}>
        {items.map((_, i) => (
          <div key={i} className={cx(base, 'h-3', i === count - 1 ? 'w-4/6' : 'w-full')} />
        ))}
      </div>
    );
  }
  if (variant === 'metric') {
    return (
      <div className={cx('rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-3', className)}>
        <div className={cx(base, 'h-3 w-2/5')} />
        <div className={cx(base, 'h-7 w-3/5')} />
        <div className={cx(base, 'h-2 w-1/3')} />
      </div>
    );
  }
  if (variant === 'row') {
    return (
      <div className={cx('space-y-1.5', className)}>
        {items.map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-zinc-800/60 bg-zinc-900/30">
            <div className={cx(base, 'h-4 w-12 shrink-0')} />
            <div className={cx(base, 'h-3 flex-1')} />
            <div className={cx(base, 'h-4 w-16 shrink-0')} />
            <div className={cx(base, 'h-4 w-20 shrink-0')} />
          </div>
        ))}
      </div>
    );
  }
  if (variant === 'card') {
    return (
      <div className={cx('rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-3', className)}>
        <div className={cx(base, 'h-4 w-1/3')} />
        <div className="space-y-2">
          <div className={cx(base, 'h-3 w-full')} />
          <div className={cx(base, 'h-3 w-5/6')} />
          <div className={cx(base, 'h-3 w-4/6')} />
        </div>
      </div>
    );
  }
  return <div className={cx(base, 'h-4 w-full', className)} />;
}

// ─── DATA TABLE ───────────────────────────────────────────────────────────────
export function DataTable({ columns, data, density = 'normal', emptyMsg = 'Sin registros', onRowClick, selectedId, renderExpanded, pageSize = 0 }) {
  const [sortKey, setSortKey] = React.useState(null);
  const [sortDir, setSortDir] = React.useState('asc');
  const [page, setPage] = React.useState(0);

  const sorted = React.useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find(c => c.key === sortKey);
    if (!col?.sortable) return data;
    const accessor = col.accessor || ((r) => r[sortKey]);
    return [...data].sort((a, b) => {
      const av = accessor(a); const bv = accessor(b);
      if (av == null) return 1; if (bv == null) return -1;
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [data, sortKey, sortDir, columns]);

  // Paginación opcional — solo aplica si pageSize > 0 y hay más datos.
  const paginated = React.useMemo(() => {
    if (!pageSize || sorted.length <= pageSize) return sorted;
    const start = page * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  // Reset de página cuando cambian datos o sort
  React.useEffect(() => { setPage(0); }, [data.length, sortKey, sortDir]);

  const totalPages = pageSize ? Math.ceil(sorted.length / pageSize) : 1;

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const cellPad = density === 'compact' ? 'px-2.5 py-1.5' : 'px-3 py-2.5';

  // Tarjetas solo en teléfono (<768). En tablet+ el layout es de 2 paneles
  // con espacio suficiente para la tabla real.
  const isPhone = useIsPhone();

  const renderPagination = () => {
    if (!pageSize || sorted.length <= pageSize) return null;
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-zinc-800/60 text-[11px] font-mono text-zinc-500">
        <span>
          {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} de {sorted.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="grid place-items-center w-7 h-7 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Página anterior"
          ><Icon name="arrow-left" size={12} /></button>
          <span className="px-2">{page + 1} / {totalPages}</span>
          <button
            type="button" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="grid place-items-center w-7 h-7 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Página siguiente"
          ><Icon name="chevron-right" size={12} /></button>
        </div>
      </div>
    );
  };

  if (isPhone) {
    if (sorted.length === 0) {
      return <div className="py-10 text-center text-zinc-500 text-sm italic">{emptyMsg}</div>;
    }
    return (
      <div>
      <div className="flex flex-col gap-2 p-3">
        {paginated.map((row, idx) => (
          <div key={row.id ?? idx}>
            <div
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cx(
                'rounded-lg border p-3 flex flex-col gap-1.5 transition-colors',
                onRowClick && 'cursor-pointer active:bg-zinc-800/60',
                row.id === selectedId
                  ? 'border-orange-500/60 bg-orange-500/10'
                  : 'border-zinc-800 bg-zinc-900/40',
              )}
            >
              {columns.map(c => {
                const val = c.cell ? c.cell(row) : (c.accessor ? c.accessor(row) : row[c.key]);
                if (val == null || val === '') return null;
                return (
                  <div key={c.key} className="flex items-start justify-between gap-3 text-sm">
                    <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-zinc-500 shrink-0 pt-0.5">
                      {c.label}
                    </span>
                    <span className={cx('text-zinc-300 text-right min-w-0 break-words', c.mono && 'font-mono text-xs')}>
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>
            {renderExpanded && row.id === selectedId && (
              <div className="mt-1">{renderExpanded(row)}</div>
            )}
          </div>
        ))}
      </div>
      {renderPagination()}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-zinc-900/60 border-b border-zinc-800">
            {columns.map(c => (
              <th
                key={c.key}
                onClick={c.sortable ? () => toggleSort(c.key) : undefined}
                style={c.width ? { width: c.width } : undefined}
                className={cx(
                  'font-mono text-[10px] uppercase tracking-[0.05em] text-zinc-500 font-semibold text-left',
                  cellPad,
                  c.sortable && 'cursor-pointer hover:text-zinc-300 select-none',
                  c.align === 'right' && 'text-right',
                  c.align === 'center' && 'text-center',
                )}
              >
                <span className="inline-flex items-center gap-1">
                  {c.label}
                  {c.sortable && sortKey === c.key && (
                    <Icon name={sortDir === 'asc' ? 'chevron-up' : 'chevron-down'} size={10} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr><td colSpan={columns.length} className="py-10 text-center text-zinc-500 text-sm italic">{emptyMsg}</td></tr>
          ) : paginated.map((row, idx) => (
            <React.Fragment key={row.id ?? idx}>
              <tr
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cx(
                  'border-b border-zinc-800/60 transition-colors',
                  onRowClick && 'cursor-pointer',
                  row.id === selectedId
                    ? 'bg-orange-500/10 border-l-2 border-l-orange-500'
                    : cx(idx % 2 === 0 ? 'bg-transparent' : 'bg-zinc-900/20', 'hover:bg-zinc-800/40'),
                )}
              >
                {columns.map(c => {
                  const val = c.cell ? c.cell(row) : (c.accessor ? c.accessor(row) : row[c.key]);
                  return (
                    <td key={c.key} className={cx(
                      'text-zinc-300',
                      cellPad,
                      c.align === 'right' && 'text-right',
                      c.align === 'center' && 'text-center',
                      c.mono && 'font-mono text-xs',
                    )}>{val}</td>
                  );
                })}
              </tr>
              {renderExpanded && row.id === selectedId && (
                <tr>
                  <td colSpan={columns.length} className="p-0">
                    {renderExpanded(row)}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {renderPagination()}
    </div>
  );
}

// ─── MASTER-DETAIL ────────────────────────────────────────────────────────────
// Tablet/Desktop (md+ = 768px): lista y detalle lado a lado (2 paneles).
// Teléfono (<md = 768px):
//   - stack=false (default): muestra la lista; al haber selección el detalle
//     ocupa toda la pantalla con una barra "volver" que llama onBack.
//   - stack=true: lista y panel lateral apilados verticalmente (ambos siempre
//     accesibles) — para layouts lista + formulario permanente.
export function MasterDetail({
  list, detail, hasSelection, onBack,
  listWidth = '340px', listSide = 'left', backLabel = 'Volver', stack = false,
}) {
  const isPhone = useIsPhone();

  if (isPhone) {
    if (stack) {
      return (
        <div className="flex flex-col gap-4 p-3">
          <div>{list}</div>
          <div>{detail}</div>
        </div>
      );
    }
    if (hasSelection) {
      return (
        <div className="flex flex-col">
          <button
            onClick={onBack}
            className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/60 text-sm text-zinc-300 hover:text-zinc-100"
          >
            <Icon name="arrow-left" size={16} />
            {backLabel}
          </button>
          <div className="p-3">{detail}</div>
        </div>
      );
    }
    return <div className="p-3">{list}</div>;
  }

  const cols = listSide === 'right'
    ? `minmax(0,1fr) ${listWidth}`
    : `${listWidth} minmax(0,1fr)`;
  const first  = listSide === 'right' ? detail : list;
  const second = listSide === 'right' ? list : detail;

  return (
    <div className="grid gap-4 items-start" style={{ gridTemplateColumns: cols }}>
      <div className="min-w-0">{first}</div>
      <div className="min-w-0">{second}</div>
    </div>
  );
}

// ─── COMMAND PALETTE ──────────────────────────────────────────────────────────
// Modal de "command bar" estilo Linear/Notion. Búsqueda fuzzy (substring lower)
// con navegación por teclado (↑/↓/Enter/Esc).
//
// commands: [{ id, label, hint?, icon?, keywords?, group?, onRun }]
// open / onClose controla visibilidad. Atajo global Cmd+K / Ctrl+K se registra
// con `useCommandPaletteShortcut(onOpen)` en App.
export function CommandPalette({ open, onClose, commands = [], placeholder = 'Buscá un panel, ticket, OF, acción...' }) {
  const [q, setQ] = React.useState('');
  const [activeIdx, setActiveIdx] = React.useState(0);
  const inputRef = React.useRef(null);
  const listRef = React.useRef(null);

  React.useEffect(() => {
    if (open) {
      setQ(''); setActiveIdx(0);
      // autofocus en el input al abrir
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Filtro fuzzy simple
  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter(c => {
      const hay = [c.label, c.hint, c.group, ...(c.keywords || [])].filter(Boolean).join(' ').toLowerCase();
      return needle.split(/\s+/).every(w => hay.includes(w));
    });
  }, [q, commands]);

  // Agrupar por `group` preservando orden
  const grouped = React.useMemo(() => {
    const out = []; const idxMap = new Map();
    filtered.forEach(c => {
      const g = c.group || 'General';
      if (!idxMap.has(g)) { idxMap.set(g, out.length); out.push({ group: g, items: [] }); }
      out[idxMap.get(g)].items.push(c);
    });
    return out;
  }, [filtered]);

  React.useEffect(() => { setActiveIdx(0); }, [q]);

  React.useEffect(() => {
    if (activeIdx >= filtered.length) setActiveIdx(Math.max(0, filtered.length - 1));
  }, [filtered, activeIdx]);

  // Scroll auto al item activo
  React.useEffect(() => {
    const el = listRef.current?.querySelector(`[data-cmd-idx="${activeIdx}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (!open) return null;

  const handleKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose?.(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(filtered.length - 1, i + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(0, i - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[activeIdx];
      if (cmd && cmd.onRun) { onClose?.(); cmd.onRun(); }
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-3.5 border-b border-zinc-800/80">
          <Icon name="search" size={16} className="text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={handleKey}
            placeholder={placeholder}
            className="flex-1 bg-transparent h-11 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-zinc-500 text-sm">Sin resultados</div>
          ) : (
            grouped.map((g) => (
              <div key={g.group} className="py-1">
                <div className="px-3 pt-1.5 pb-1 font-mono text-[10px] uppercase tracking-wider text-zinc-600">{g.group}</div>
                {g.items.map((c) => {
                  const i = filtered.indexOf(c);
                  const active = i === activeIdx;
                  return (
                    <button
                      key={c.id}
                      data-cmd-idx={i}
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => { onClose?.(); c.onRun?.(); }}
                      onKeyDown={handleKey}
                      className={cx(
                        'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                        active ? 'bg-blue-500/10 text-zinc-100' : 'text-zinc-300 hover:bg-zinc-900/60',
                      )}
                    >
                      {c.icon && (
                        <span className={cx('w-7 h-7 rounded-md grid place-items-center shrink-0',
                          active ? 'bg-blue-500/20 text-blue-300' : 'bg-zinc-900 text-zinc-500')}>
                          <Icon name={c.icon} size={14} />
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{c.label}</div>
                        {c.hint && <div className="text-[11px] text-zinc-500 truncate">{c.hint}</div>}
                      </div>
                      {c.shortcut && <Kbd>{c.shortcut}</Kbd>}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="px-3 py-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-600 font-mono">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navegar</span>
            <span className="flex items-center gap-1"><Kbd>Enter</Kbd> seleccionar</span>
          </div>
          <span className="flex items-center gap-1"><Kbd>Esc</Kbd> cerrar</span>
        </div>
      </div>
    </div>
  );
}

// Hook que registra el atajo global Cmd+K / Ctrl+K.
export function useCommandPaletteShortcut(onOpen) {
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        onOpen();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onOpen]);
}

// ─── NOTIFICATIONS BELL ───────────────────────────────────────────────────────
// Campana en header con badge de no-leídas + drawer/popover con últimas N.
// El "no leído" se calcula contra un cursor en localStorage (no-server-side por simplicidad).
const NODE_LABELS_BELL = {
  comercial: 'Comercial', administracion: 'Administración', desarrollo: 'Desarrollo',
  compras: 'Compras', panol: 'Pañol', produccion: 'Producción', logistica: 'Logística',
  soporte: 'Soporte',
};
const NODE_ACCENT_BELL = {
  comercial: 'blue', administracion: 'violet', desarrollo: 'cyan',
  compras: 'amber', panol: 'emerald', produccion: 'rose', logistica: 'orange',
  soporte: 'rose',
};

export function NotificationsBell({ onNavigate }) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [lastSeen, setLastSeen] = React.useState(() => {
    try { return Number(localStorage.getItem('notif:last-seen') || 0); } catch { return 0; }
  });
  const ref = React.useRef(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const { api } = await import('../api');
      const data = await api.events.recent(50);
      setItems(data || []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  // Click afuera para cerrar + escape
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const unread = items.filter(n => n.id > lastSeen).length;

  const handleOpen = () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    refresh();
    // Marcar todos como vistos cuando abre
    if (items.length > 0) {
      const top = items[0].id;
      try { localStorage.setItem('notif:last-seen', String(top)); } catch { /* ignore */ }
      setLastSeen(top);
    }
  };

  const fmtTimeAgo = (iso) => {
    const d = new Date(iso);
    const sec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (sec < 60) return 'recién';
    if (sec < 3600) return `${Math.floor(sec / 60)}m`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
    return `${Math.floor(sec / 86400)}d`;
  };

  const handleItemClick = (n) => {
    setOpen(false);
    if (onNavigate) onNavigate(n);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notificaciones"
        aria-expanded={open}
        className="relative grid place-items-center w-9 h-9 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
      >
        <Icon name="bell" size={16} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[9px] font-bold text-white grid place-items-center font-mono">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden z-50">
          <div className="px-3 py-2.5 border-b border-zinc-800/60 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-200 uppercase tracking-wider font-mono">Notificaciones</span>
            <button
              type="button"
              onClick={refresh}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono uppercase tracking-wider"
            >
              Recargar
            </button>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="p-3"><Skeleton variant="row" count={4} /></div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center text-zinc-500 text-xs">
                Sin notificaciones recientes
              </div>
            ) : (
              <ul className="divide-y divide-zinc-800/60">
                {items.map(n => {
                  const isNew = n.id > lastSeen;
                  const accent = NODE_ACCENT_BELL[n.source] || 'slate';
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => handleItemClick(n)}
                        className={cx(
                          'w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-zinc-900/60 transition-colors',
                          isNew && 'bg-blue-500/[0.03]',
                        )}
                      >
                        <div className="mt-1 shrink-0">
                          <Badge accent={accent} dot>{NODE_LABELS_BELL[n.source] || n.source}</Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-xs text-zinc-200 leading-snug">{n.message}</p>
                            <span className="font-mono text-[10px] text-zinc-500 shrink-0">{fmtTimeAgo(n.created_at)}</span>
                          </div>
                          {n.ref_type && n.ref_id && (
                            <p className="font-mono text-[10px] text-zinc-600 mt-0.5">{n.ref_type} #{n.ref_id}</p>
                          )}
                        </div>
                        {isNew && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
export function Sidebar({ active, onSelect, onShortcuts, user, onLogout, on2FASetup, onContactSoporte, allowedPanels, mobileOpen = false, onClose }) {
  const handleSelect = (id) => { onSelect(id); onClose?.(); };
  const isTouch = useIsTouch();
  const [helpOpen, setHelpOpen] = React.useState(false);
  const helpRef = React.useRef(null);
  // Layout especial para usuarios de soporte: el nodo Soporte queda fijo arriba
  // y el resto se agrupa en una sección colapsable "Nodos". El estado de apertura
  // persiste en localStorage para que no se reinicie entre navegaciones.
  const [nodosOpen, setNodosOpen] = React.useState(() => {
    try { return localStorage.getItem('sidebar:nodos-open') !== '0'; } catch { return true; }
  });
  React.useEffect(() => {
    try { localStorage.setItem('sidebar:nodos-open', nodosOpen ? '1' : '0'); } catch { /* ignore */ }
  }, [nodosOpen]);
  React.useEffect(() => {
    if (!helpOpen) return;
    const onDown = (e) => { if (helpRef.current && !helpRef.current.contains(e.target)) setHelpOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setHelpOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [helpOpen]);
  const activeClasses = {
    blue:    'bg-blue-500/10 border-blue-500 text-zinc-100 font-medium',
    violet:  'bg-violet-500/10 border-violet-500 text-zinc-100 font-medium',
    cyan:    'bg-cyan-500/10 border-cyan-500 text-zinc-100 font-medium',
    amber:   'bg-amber-500/10 border-amber-500 text-zinc-100 font-medium',
    emerald: 'bg-emerald-500/10 border-emerald-500 text-zinc-100 font-medium',
    rose:    'bg-rose-500/10 border-rose-500 text-zinc-100 font-medium',
    orange:  'bg-orange-500/10 border-orange-500 text-zinc-100 font-medium',
    indigo:  'bg-indigo-500/10 border-indigo-500 text-zinc-100 font-medium',
  };
  const iconActiveClasses = {
    blue: 'text-blue-400', violet: 'text-violet-400', cyan: 'text-cyan-400',
    amber: 'text-amber-400', emerald: 'text-emerald-400', rose: 'text-rose-400',
    orange: 'text-orange-400', indigo: 'text-indigo-400',
  };
  const visibleModules = allowedPanels
    ? V2_MODULES.filter(m => allowedPanels.has(m.id))
    : V2_MODULES;

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
        />
      )}
      <aside className={cx(
        'w-[228px] shrink-0 bg-zinc-950 border-r border-zinc-800/60 flex flex-col',
        'fixed inset-y-0 left-0 z-50 h-screen h-[100dvh] transform transition-transform duration-200',
        'lg:static lg:translate-x-0 lg:sticky lg:top-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}>
      <div className="px-5 pt-5 pb-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-800 grid place-items-center">
            <span className="font-mono text-xs font-bold text-zinc-200">L</span>
          </div>
          <div className="flex-1">
            <div className="font-mono text-sm font-bold text-zinc-100 tracking-tight leading-none">ERP—LG</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-zinc-600 mt-1">Sistema industrial</div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden grid place-items-center w-10 h-10 -mr-2 text-zinc-500 hover:text-zinc-200"
            aria-label="Cerrar menú"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto" role="navigation">
        {(() => {
          const soporteMod = visibleModules.find(m => m.id === 'soporte');
          const otherMods  = visibleModules.filter(m => m.id !== 'soporte');
          const renderModuleButton = (m) => {
            const isActive = active === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleSelect(m.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cx(
                  'w-full flex items-center gap-3 px-4 py-2.5 sm:py-2 text-sm transition-all border-l-2',
                  isActive
                    ? activeClasses[m.accent]
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900',
                )}
              >
                <span className={cx(isActive ? iconActiveClasses[m.accent] : 'text-zinc-600')}>
                  <Icon name={V2_MODULE_ICONS[m.id]} size={15} />
                </span>
                <span className="flex-1 text-left">{m.name}</span>
                <Kbd>{m.shortcut.toUpperCase()}</Kbd>
              </button>
            );
          };

          if (soporteMod) {
            return (
              <>
                <div className="px-4 mb-2 font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600 font-semibold">Soporte de sistemas</div>
                {renderModuleButton(soporteMod)}

                {otherMods.length > 0 && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setNodosOpen(o => !o)}
                      aria-expanded={nodosOpen}
                      className="w-full flex items-center gap-2 px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-500 hover:text-zinc-300 font-semibold transition-colors"
                    >
                      <Icon name={nodosOpen ? 'chevron-down' : 'chevron-right'} size={11} />
                      <span className="flex-1 text-left">Nodos</span>
                      <span className="text-zinc-600 normal-case tracking-normal">{otherMods.length}</span>
                    </button>
                    {nodosOpen && (
                      <div className="mt-1">
                        {otherMods.map(renderModuleButton)}
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          }

          return (
            <>
              <div className="px-4 mb-2 font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600 font-semibold">Módulos</div>
              {visibleModules.map(renderModuleButton)}
            </>
          );
        })()}
      </nav>

      <div className="border-t border-zinc-800/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-1">
        {user && (
          <>
            <div className="border-t border-zinc-800/60 pt-2 mt-1">
              <div className="px-2 py-1.5 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 grid place-items-center shrink-0">
                  <span className="font-mono text-[10px] font-bold text-blue-400">
                    {(user.full_name || user.username || '?')[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-300 truncate">{user.full_name || user.username}</p>
                  <p className="font-mono text-[10px] text-zinc-600 truncate">{user.email}</p>
                </div>
              </div>
              {(onShortcuts || on2FASetup || onContactSoporte) && (
                <div ref={helpRef} className="relative">
                  <button
                    onClick={() => setHelpOpen(o => !o)}
                    aria-haspopup="menu"
                    aria-expanded={helpOpen}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-rose-500 hover:text-rose-400 hover:bg-rose-500/5 transition-colors"
                  >
                    <Icon name="alert" size={13} />
                    <span className="flex-1 text-left">Ayuda</span>
                    <Icon name="chevron-right" size={12} />
                  </button>
                  {helpOpen && (
                    <div
                      role="menu"
                      className="absolute left-full bottom-0 ml-2 min-w-[200px] rounded-md border border-zinc-800 bg-zinc-950 shadow-lg overflow-hidden z-50"
                    >
                      {onShortcuts && (
                        <button
                          role="menuitem"
                          onClick={() => { setHelpOpen(false); onShortcuts(); }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
                        >
                          <Icon name="keyboard" size={13} />
                          <span className="flex-1 text-left">Atajos</span>
                          {!isTouch && <Kbd>?</Kbd>}
                        </button>
                      )}
                      {on2FASetup && (
                        <button
                          role="menuitem"
                          disabled={import.meta.env.DEV}
                          onClick={() => {
                            if (import.meta.env.DEV) return;
                            setHelpOpen(false);
                            on2FASetup();
                          }}
                          className={cx(
                            "w-full flex items-center gap-2 px-2 py-1.5 text-xs transition-colors",
                            import.meta.env.DEV
                              ? "opacity-40 cursor-not-allowed text-zinc-500"
                              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                          )}
                          title={import.meta.env.DEV ? "Deshabilitado en desarrollo" : undefined}
                        >
                          <Icon name="shield" size={13} />
                          <span className="flex-1 text-left">{user.totp_enabled ? 'Gestionar 2FA' : 'Activar 2FA'}</span>
                          {user.totp_enabled && <span className="text-[10px] font-mono text-emerald-500">activo</span>}
                        </button>
                      )}
                      {onContactSoporte && (
                        <button
                          role="menuitem"
                          disabled={import.meta.env.DEV}
                          onClick={() => {
                            if (import.meta.env.DEV) return;
                            setHelpOpen(false);
                            onContactSoporte();
                          }}
                          className={cx(
                            "w-full flex items-center gap-2 px-2 py-1.5 text-xs transition-colors border-t border-zinc-800/60",
                            import.meta.env.DEV
                              ? "opacity-40 cursor-not-allowed text-zinc-500"
                              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                          )}
                          title={import.meta.env.DEV ? "Deshabilitado en desarrollo" : undefined}
                        >
                          <Icon name="mail" size={13} />
                          <span className="flex-1 text-left">Contactar a soporte</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5 transition-colors"
                >
                  <Icon name="log-out" size={13} />
                  <span>Cerrar sesión</span>
                </button>
              )}
            </div>
          </>
        )}

        <div className="px-2 pt-1 flex items-center justify-between font-mono text-[10px] text-zinc-600">
          <span>v0.2.0</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            connected
          </span>
        </div>
      </div>
      </aside>
    </>
  );
}

// ─── MODULE HEADER ────────────────────────────────────────────────────────────
export function ModuleHeader({ module, subtitle, actions }) {
  const mod = V2_MODULES.find(m => m.id === module) || {};
  const openSidebar = useSidebarToggle();
  const accentText = {
    blue: 'text-blue-400', violet: 'text-violet-400', cyan: 'text-cyan-400',
    amber: 'text-amber-400', emerald: 'text-emerald-400', rose: 'text-rose-400', orange: 'text-orange-400',
  };
  return (
    <header className={cx(
      'sticky top-0 z-20 px-4 sm:px-7 py-4 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/60',
      // En teléfono: dos filas (identidad arriba, acciones a ancho completo abajo).
      // En sm+: una sola fila con acciones alineadas a la derecha.
      'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
    )}>
      <div className="flex items-center gap-3 min-w-0">
        {openSidebar && (
          <button
            onClick={openSidebar}
            className="lg:hidden shrink-0 grid place-items-center w-10 h-10 -ml-2 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
            aria-label="Abrir menú"
          >
            <Icon name="menu" size={20} />
          </button>
        )}
        <span className={cx('shrink-0', accentText[mod.accent] || 'text-zinc-400')}>
          <Icon name={V2_MODULE_ICONS[module]} size={18} />
        </span>
        <div className="min-w-0">
          <h1 className={cx('font-mono text-xs uppercase tracking-[0.12em] font-semibold leading-none', accentText[mod.accent] || 'text-zinc-400')}>
            {mod.name}
          </h1>
          {subtitle && <p className="hidden sm:block text-xs text-zinc-500 mt-1 truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex w-full items-center gap-2 min-w-0 sm:w-auto sm:ml-auto [&>*:not(.shrink-0)]:min-w-0">
        {actions}
        <NotificationsBell />
      </div>
    </header>
  );
}

// ─── SHORTCUTS DIALOG ─────────────────────────────────────────────────────────
export function ShortcutsDialog({ open, onClose, allowedPanels }) {
  const canSee = (id) => !allowedPanels || allowedPanels.has(id);

  const navItems = V2_MODULES
    .filter(m => canSee(m.id))
    .map(m => ({ keys: ['G', m.shortcut.toUpperCase()], desc: `Ir a ${m.name}` }));

  const sections = [
    {
      title: 'Navegación global',
      items: navItems,
    },
    {
      title: 'Acciones universales',
      items: [
        { keys: ['N'], desc: 'Nueva entrada (abre formulario)' },
        { keys: ['/'], desc: 'Enfocar búsqueda del panel activo' },
        { keys: ['Esc'], desc: 'Limpiar búsqueda / cerrar detalle / cerrar diálogo' },
        { keys: ['?'], desc: 'Mostrar este panel de atajos' },
      ],
    },
    ...(canSee('administracion') ? [{
      title: 'Administración',
      items: [
        { keys: ['1'], desc: 'Tab → Anticipos' },
        { keys: ['2'], desc: 'Tab → Despachos' },
      ],
    }] : []),
    ...(canSee('desarrollo') ? [{
      title: 'Desarrollo',
      items: [
        { keys: ['P'], desc: 'Tab → Pedido de material (OF seleccionada)' },
        { keys: ['L'], desc: 'Tab → Plano de producción (OF seleccionada)' },
      ],
    }] : []),
    ...(canSee('panol') ? [{
      title: 'Pañol',
      items: [
        { keys: ['1'], desc: 'Tab → Stock & movimientos' },
        { keys: ['2'], desc: 'Tab → Catálogo' },
        { keys: ['I'], desc: 'Modo → Ingreso de materiales' },
        { keys: ['D'], desc: 'Modo → Despacho a producción' },
      ],
    }] : []),
  ];

  return (
    <Dialog open={open} onClose={onClose} title="Atajos de teclado" size="lg">
      <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
        {sections.map((sec, si) => (
          <div key={si}>
            <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mb-2">{sec.title}</p>
            <div className="space-y-0.5">
              {sec.items.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded hover:bg-zinc-800/40">
                  <span className="text-sm text-zinc-300">{s.desc}</span>
                  <span className="flex items-center gap-1">
                    {s.keys.map((k, j) => (
                      <React.Fragment key={j}>
                        {j > 0 && <span className="text-zinc-600 text-xs mx-1">entonces</span>}
                        <Kbd>{k}</Kbd>
                      </React.Fragment>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-800 px-5 py-3 bg-zinc-900/40 rounded-b-lg">
        <p className="text-[11px] text-zinc-500">
          Los atajos de módulo usan secuencia: presioná <Kbd>G</Kbd>, soltá, luego la letra (1 segundo de margen).
          Los atajos de panel solo funcionan cuando no hay un input enfocado.
        </p>
      </div>
    </Dialog>
  );
}

// ─── SEARCH SHORTCUT HOOK ─────────────────────────────────────────────────────
export function useSearchShortcut(inputRef, onClear) {
  React.useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        onClear?.();
        inputRef.current?.blur();
        return;
      }
      const tag = e.target.tagName?.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) return;
      if (e.key === '/') { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [inputRef, onClear]);
}

// ─── KEYBOARD HOOK ────────────────────────────────────────────────────────────
export function useGlobalShortcuts(onModule, onShowShortcuts, onNew, allowedPanels) {
  const gPressed = React.useRef(false);
  const gTimeout = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName?.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '?') { e.preventDefault(); onShowShortcuts(); return; }
      if (e.key === 'n' && !gPressed.current) { e.preventDefault(); onNew?.(); return; }

      if (e.key === 'g') {
        gPressed.current = true;
        clearTimeout(gTimeout.current);
        gTimeout.current = setTimeout(() => { gPressed.current = false; }, 1000);
        return;
      }
      if (gPressed.current) {
        const modules = allowedPanels
          ? V2_MODULES.filter(m => allowedPanels.has(m.id))
          : V2_MODULES;
        const mod = modules.find(m => m.shortcut === e.key.toLowerCase());
        if (mod) { e.preventDefault(); onModule(mod.id); }
        gPressed.current = false;
        clearTimeout(gTimeout.current);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onModule, onShowShortcuts, onNew, allowedPanels]);
}
