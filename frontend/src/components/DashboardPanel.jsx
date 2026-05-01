import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Briefcase, 
  DollarSign, 
  Activity, 
  RefreshCw, 
  TrendingUp, 
  AlertTriangle,
  ChevronRight,
  Package,
  Settings2,
  Cpu
} from 'lucide-react';

const DashboardPanel = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/administracion/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Vista General de Operaciones</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">Pulso en tiempo real del nodo industrial.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-label-sm text-label-sm text-outline px-3 py-1.5 bg-surface-container rounded-full border border-surface-variant">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span> 
            Sistema Nominal
          </div>
          <button 
            onClick={fetchStats}
            className="p-2 text-outline hover:text-primary transition-colors bg-surface-container rounded-full border border-surface-variant active:scale-95"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Metric Grid (Stitch Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Usuarios Activos" 
          value={stats?.active_users ?? '...'} 
          icon="group"
          color="text-primary"
          trend="+3 hoy"
          loading={loading}
        />
        <StatCard 
          title="Carga de Trabajo" 
          value={stats?.workload ?? '...'} 
          icon="pending_actions"
          color="text-tertiary"
          trend="Estable"
          loading={loading}
          subtitle="OFs pendientes"
        />
        <StatCard 
          title="Métricas Financieras" 
          value={stats ? `$${stats.financial_total.toLocaleString()}` : '...'} 
          icon="payments"
          color="text-secondary"
          trend="+12% Q2"
          loading={loading}
          subtitle="Anticipos validados"
        />
        <StatCard 
          title="Salud del Sistema" 
          value={stats?.system_health ?? '...'} 
          icon="activity_zone"
          color="text-error"
          trend="99.9% Uptime"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Pulse Panel (Timeline style) */}
        <div className="lg:col-span-2 bg-surface-container rounded-xl border border-outline-variant flex flex-col h-[450px] shadow-lg">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md text-on-surface">Pulso de Operaciones</h2>
            <button className="font-label-sm text-label-sm text-primary hover:underline flex items-center gap-1">
              Ver Historial <ChevronRight size={14} />
            </button>
          </div>
          <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar bg-background/20">
            <PulseItem 
              icon="conveyor_belt" 
              title="Producción en curso" 
              time="Hace 5 min" 
              desc="Línea de ensamblaje OF-124 operando a capacidad nominal." 
              type="primary"
            />
            <PulseItem 
              icon="inventory" 
              title="Ingreso a Pañol" 
              time="Hace 20 min" 
              desc="Confirmado ingreso de Insumo #882: Chapas de acero inoxidable." 
              type="secondary"
            />
            <PulseItem 
              icon="warning" 
              title="Anticipo Pendiente" 
              time="Hace 1 hora" 
              desc="La OF-128 requiere validación de administración para avanzar." 
              type="error"
            />
            <PulseItem 
              icon="check_circle" 
              title="Despacho Completado" 
              time="Hace 2 horas" 
              desc="Logística confirmó la entrega final para Cliente AceroMex." 
              type="success"
            />
          </div>
        </div>

        {/* Quick Actions / Insights */}
        <div className="space-y-6">
          <div className="bg-surface-container-high rounded-xl p-6 border border-outline-variant shadow-lg">
            <h3 className="font-label-md text-label-md text-outline mb-4 uppercase tracking-wider">Acciones Rápidas</h3>
            <div className="grid grid-cols-1 gap-3">
              <QuickAction icon={<Package size={16} />} label="Nueva Orden" color="bg-primary/20 text-primary" />
              <QuickAction icon={<Users size={16} />} label="Gestionar Equipo" color="bg-tertiary/20 text-tertiary" />
              <QuickAction icon={<Settings2 size={16} />} label="Ajustes Sistema" color="bg-surface-variant text-outline" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary-container/20 to-secondary-container/10 rounded-xl p-6 border border-primary/20 relative overflow-hidden group cursor-pointer shadow-lg">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
              <Cpu size={64} className="text-primary" />
            </div>
            <h3 className="font-headline-sm text-headline-sm text-primary mb-2">Optimización IA</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-4">
              Hemos detectado un posible cuello de botella en la Línea de Ensamblaje 3.
            </p>
            <button className="text-xs font-bold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
              Ver análisis predictivo <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, trend, loading, subtitle }) => (
  <div className="bg-surface-container-high rounded-xl p-6 border border-outline-variant hover:bg-surface-variant transition-all duration-300 relative overflow-hidden group shadow-lg shadow-black/20">
    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    <div className="flex justify-between items-start mb-4 relative z-10">
      <span className="font-label-md text-label-md text-outline uppercase tracking-wider">{title}</span>
      <span className={`material-symbols-outlined ${color} text-[24px]`}>{icon}</span>
    </div>
    <div className="relative z-10">
      <div className="font-headline-lg text-headline-lg text-on-surface mb-2">
        {loading ? (
          <div className="h-8 w-24 bg-surface-variant animate-pulse rounded" />
        ) : value}
      </div>
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1 font-label-sm text-label-sm ${trend.includes('+') ? 'text-secondary' : 'text-outline'}`}>
          {trend.includes('+') && <TrendingUp size={12} />}
          {trend}
        </div>
        {subtitle && <span className="text-[10px] text-outline font-medium uppercase tracking-tighter opacity-50">{subtitle}</span>}
      </div>
    </div>
  </div>
);

const PulseItem = ({ icon, title, time, desc, type }) => {
  const colors = {
    primary: "bg-primary/10 border-primary/20 text-primary",
    secondary: "bg-secondary/10 border-secondary/20 text-secondary",
    error: "bg-error/10 border-error/20 text-error",
    success: "bg-green-500/10 border-green-500/20 text-green-500"
  };

  return (
    <div className="flex gap-4 group">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center z-10 transition-transform group-hover:scale-110 ${colors[type]}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
        <div className="w-px h-full bg-outline-variant mt-2 group-last:hidden opacity-30"></div>
      </div>
      <div className="bg-surface-container-high rounded-2xl p-4 border border-outline-variant flex-1 shadow-sm group-hover:border-outline/50 transition-colors">
        <div className="flex justify-between mb-1">
          <span className="font-bold text-sm text-on-surface">{title}</span>
          <span className="text-[10px] font-medium text-outline uppercase tracking-widest">{time}</span>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant text-xs leading-relaxed">{desc}</p>
      </div>
    </div>
  );
};

const QuickAction = ({ icon, label, color }) => (
  <button className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border border-transparent hover:border-outline/20 active:scale-95 ${color}`}>
    {icon}
    {label}
  </button>
);

export default DashboardPanel;
