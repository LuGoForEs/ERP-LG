import React from 'react';
import { V2_MODULES, V2_MODULE_ICONS, V2_ESTADO } from '../data/mock';

// ─── CLASS MERGE ──────────────────────────────────────────────────────────────
export function cx(...args) {
  return args.filter(Boolean).join(' ');
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
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 disabled:opacity-40 disabled:cursor-not-allowed select-none';
  const sizes = {
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
    <select
      value={value}
      onChange={onChange}
      {...props}
      className={cx(
        'h-9 w-full rounded-md bg-zinc-950/50 border border-zinc-800 px-3 text-sm text-zinc-100',
        'hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500',
        'cursor-pointer transition-colors',
        className,
      )}
    >
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map(o => (
        <option key={o.value} value={o.value} className="bg-zinc-900">{o.label}</option>
      ))}
    </select>
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
    <div {...props} className={cx('rounded-lg border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', actions }) {
  return (
    <div className={cx('flex items-center justify-between px-4 py-3 border-b border-zinc-800', className)}>
      <div className="flex items-center gap-2">{children}</div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardTitle({ children, hint }) {
  return (
    <div className="flex items-baseline gap-2">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-zinc-500 font-semibold">{children}</h3>
      {hint != null && <span className="font-mono text-[11px] text-zinc-600">{hint}</span>}
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
    setToasts(prev => [...prev, { id, type: 'success', ...toast }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);
  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            role="status"
            className={cx(
              'pointer-events-auto min-w-[260px] max-w-sm rounded-lg border bg-zinc-900 backdrop-blur-md',
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
            <button onClick={() => dismiss(t.id)} className="text-zinc-500 hover:text-zinc-200 -mr-1 p-1">
              <Icon name="x" size={14} />
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
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      <div className={cx(
        'relative w-full bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl',
        'animate-in zoom-in-95',
        sizes[size],
      )}>
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <h2 className="font-semibold text-zinc-100">{title}</h2>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 p-1 -mr-1 rounded hover:bg-zinc-800">
              <Icon name="x" size={16} />
            </button>
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
export function Tabs({ value, onChange, items, accent = 'cyan', className = '' }) {
  return (
    <div className={cx('inline-flex bg-zinc-900 border border-zinc-800 rounded-lg p-1', className)} role="tablist">
      {items.map(t => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cx(
              'px-3.5 h-7 text-xs font-medium rounded-md transition-all',
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

// ─── KBD ──────────────────────────────────────────────────────────────────────
export function Kbd({ children }) {
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

export function EmptyState({ icon = 'circle-dot', msg, hint }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
      <span className="w-12 h-12 rounded-full bg-zinc-800/60 grid place-items-center text-zinc-600">
        <Icon name={icon} size={20} />
      </span>
      <p className="text-sm text-zinc-400">{msg}</p>
      {hint && <p className="text-xs text-zinc-600">{hint}</p>}
    </div>
  );
}

// ─── DATA TABLE ───────────────────────────────────────────────────────────────
export function DataTable({ columns, data, density = 'normal', emptyMsg = 'Sin registros', onRowClick, selectedId, renderExpanded }) {
  const [sortKey, setSortKey] = React.useState(null);
  const [sortDir, setSortDir] = React.useState('asc');

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

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const cellPad = density === 'compact' ? 'px-2.5 py-1.5' : 'px-3 py-2.5';

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
          ) : sorted.map((row, idx) => (
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
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
export function Sidebar({ active, onSelect, onShortcuts, user, onLogout, on2FASetup, allowedPanels }) {
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
    <aside className="w-[228px] shrink-0 h-screen sticky top-0 bg-zinc-950 border-r border-zinc-800/60 flex flex-col">
      <div className="px-5 pt-5 pb-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-800 grid place-items-center">
            <span className="font-mono text-xs font-bold text-zinc-200">L</span>
          </div>
          <div>
            <div className="font-mono text-sm font-bold text-zinc-100 tracking-tight leading-none">ERP—LG</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-zinc-600 mt-1">Sistema industrial</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto" role="navigation">
        <div className="px-4 mb-2 font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600 font-semibold">Módulos</div>
        {visibleModules.map(m => {
          const isActive = active === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              aria-current={isActive ? 'page' : undefined}
              className={cx(
                'w-full flex items-center gap-3 px-4 py-2 text-sm transition-all border-l-2',
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
        })}
      </nav>

      <div className="border-t border-zinc-800/60 p-3 space-y-1">
        <button
          onClick={onShortcuts}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
        >
          <Icon name="keyboard" size={14} />
          <span className="flex-1 text-left">Atajos</span>
          <Kbd>?</Kbd>
        </button>

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
              {on2FASetup && (
                <button
                  onClick={on2FASetup}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
                >
                  <Icon name="shield" size={13} />
                  <span>{user.totp_enabled ? 'Gestionar 2FA' : 'Activar 2FA'}</span>
                  {user.totp_enabled && <span className="ml-auto text-[10px] font-mono text-emerald-500">activo</span>}
                </button>
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
  );
}

// ─── MODULE HEADER ────────────────────────────────────────────────────────────
export function ModuleHeader({ module, subtitle, actions }) {
  const mod = V2_MODULES.find(m => m.id === module) || {};
  const accentText = {
    blue: 'text-blue-400', violet: 'text-violet-400', cyan: 'text-cyan-400',
    amber: 'text-amber-400', emerald: 'text-emerald-400', rose: 'text-rose-400', orange: 'text-orange-400',
  };
  return (
    <header className={cx(
      'sticky top-0 z-20 px-7 py-4 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/60',
      'flex items-center justify-between',
    )}>
      <div className="flex items-center gap-3">
        <span className={accentText[mod.accent] || 'text-zinc-400'}>
          <Icon name={V2_MODULE_ICONS[module]} size={18} />
        </span>
        <div>
          <h1 className={cx('font-mono text-xs uppercase tracking-[0.12em] font-semibold leading-none', accentText[mod.accent] || 'text-zinc-400')}>
            {mod.name}
          </h1>
          {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </header>
  );
}

// ─── SHORTCUTS DIALOG ─────────────────────────────────────────────────────────
export function ShortcutsDialog({ open, onClose }) {
  const sections = [
    {
      title: 'Navegación global',
      items: [
        { keys: ['G', 'C'], desc: 'Ir a Comercial' },
        { keys: ['G', 'A'], desc: 'Ir a Administración' },
        { keys: ['G', 'D'], desc: 'Ir a Desarrollo' },
        { keys: ['G', 'P'], desc: 'Ir a Compras' },
        { keys: ['G', 'N'], desc: 'Ir a Pañol' },
        { keys: ['G', 'R'], desc: 'Ir a Producción' },
        { keys: ['G', 'L'], desc: 'Ir a Logística' },
      ],
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
    {
      title: 'Administración',
      items: [
        { keys: ['1'], desc: 'Tab → Anticipos' },
        { keys: ['2'], desc: 'Tab → Despachos' },
      ],
    },
    {
      title: 'Desarrollo',
      items: [
        { keys: ['P'], desc: 'Tab → Pedido de material (OF seleccionada)' },
        { keys: ['L'], desc: 'Tab → Plano de producción (OF seleccionada)' },
      ],
    },
    {
      title: 'Pañol',
      items: [
        { keys: ['1'], desc: 'Tab → Stock & movimientos' },
        { keys: ['2'], desc: 'Tab → Catálogo' },
        { keys: ['I'], desc: 'Modo → Ingreso de materiales' },
        { keys: ['D'], desc: 'Modo → Despacho a producción' },
      ],
    },
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
export function useGlobalShortcuts(onModule, onShowShortcuts, onNew) {
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
        const mod = V2_MODULES.find(m => m.shortcut === e.key.toLowerCase());
        if (mod) { e.preventDefault(); onModule(mod.id); }
        gPressed.current = false;
        clearTimeout(gTimeout.current);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onModule, onShowShortcuts, onNew]);
}
