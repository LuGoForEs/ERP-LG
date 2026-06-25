import React from 'react';
import {
  cx, Icon, Button, Card, CardHeader, CardTitle, Metric, Badge,
  ModuleHeader, EmptyState, Skeleton, useToast,
} from './primitives';
import { api } from '../api';


function fmtCurrency(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `$ ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$ ${(n / 1_000).toFixed(0)}k`;
  return `$ ${n.toLocaleString('es-AR')}`;
}


export default function DashboardPanel() {
  const toast = useToast();
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/administracion/stats', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setStats(await res.json());
    } catch (e) {
      toast({ type: 'error', msg: e.message || 'No se pudo cargar el dashboard' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <>
        <ModuleHeader module="comercial" subtitle="Vista general" />
        <div className="px-4 sm:px-7 py-5 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="metric" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2"><Skeleton variant="card" /></div>
            <Skeleton variant="card" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ModuleHeader
        module="comercial"
        subtitle="Pulso en tiempo real del nodo industrial"
        actions={
          <div className="flex items-center gap-2">
            <Badge accent="emerald" dot>Sistema nominal</Badge>
            <Button variant="ghost" size="sm" icon="search" onClick={load}>Recargar</Button>
          </div>
        }
      />

      <div className="px-4 sm:px-7 py-5 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Metric
            label="Usuarios activos"
            value={stats?.active_users ?? '—'}
            sub="+3 hoy"
            accent="blue"
            icon="users"
          />
          <Metric
            label="Carga de trabajo"
            value={stats?.workload ?? '—'}
            sub="OFs pendientes"
            accent="amber"
            icon="briefcase"
          />
          <Metric
            label="Anticipos validados"
            value={stats?.financial_total != null ? fmtCurrency(stats.financial_total) : '—'}
            sub="+12% Q2"
            accent="emerald"
            icon="wallet"
          />
          <Metric
            label="Salud del sistema"
            value={stats?.system_health ?? '—'}
            sub="99.9% uptime"
            accent="violet"
            icon="shield"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader
              actions={<Button variant="ghost" size="sm" iconAfter="chevron-right">Ver historial</Button>}
            >
              <CardTitle>Pulso de operaciones</CardTitle>
            </CardHeader>
            <div className="p-4 space-y-3">
              <PulseItem accent="blue" icon="factory" title="Producción en curso" time="hace 5 min"
                desc="Línea de ensamblaje OF-124 operando a capacidad nominal." />
              <PulseItem accent="emerald" icon="package" title="Ingreso a Pañol" time="hace 20 min"
                desc="Confirmado ingreso de Insumo #882: Chapas de acero inoxidable." />
              <PulseItem accent="amber" icon="alert" title="Anticipo pendiente" time="hace 1 h"
                desc="La OF-128 requiere validación de administración para avanzar." />
              <PulseItem accent="cyan" icon="check-circle" title="Despacho completado" time="hace 2 h"
                desc="Logística confirmó la entrega final para Cliente AceroMex." />
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Acciones rápidas</CardTitle></CardHeader>
              <div className="p-3 space-y-1.5">
                <QuickAction icon="briefcase" label="Nueva OF" accent="blue" />
                <QuickAction icon="users" label="Gestionar equipo" accent="indigo" />
                <QuickAction icon="shield" label="Ajustes del sistema" accent="violet" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}


function PulseItem({ accent, icon, title, time, desc }) {
  const iconColor = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
  }[accent] || 'text-zinc-400 bg-zinc-800 border-zinc-700';
  return (
    <div className="flex gap-3">
      <div className={cx('w-9 h-9 rounded-md border grid place-items-center shrink-0', iconColor)}>
        <Icon name={icon} size={16} />
      </div>
      <div className="flex-1 min-w-0 rounded-md border border-zinc-800/60 bg-zinc-950/40 px-3 py-2">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <span className="text-sm font-medium text-zinc-200 truncate">{title}</span>
          <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider shrink-0">{time}</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}


function QuickAction({ icon, label, accent = 'blue' }) {
  const accentClasses = {
    blue: 'text-blue-300 hover:bg-blue-500/10 hover:border-blue-500/30',
    indigo: 'text-indigo-300 hover:bg-indigo-500/10 hover:border-indigo-500/30',
    violet: 'text-violet-300 hover:bg-violet-500/10 hover:border-violet-500/30',
    emerald: 'text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/30',
  }[accent] || 'text-zinc-300';
  return (
    <button
      type="button"
      className={cx(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-transparent text-sm font-medium transition-colors text-left',
        accentClasses,
      )}
    >
      <Icon name={icon} size={15} />
      <span className="flex-1">{label}</span>
      <Icon name="chevron-right" size={13} className="text-zinc-600" />
    </button>
  );
}
