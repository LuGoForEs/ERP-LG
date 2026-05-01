import { useState, useEffect } from 'react'
import AdminPanel from './components/AdminPanel.jsx'
import DesarrolloPanel from './components/DesarrolloPanel.jsx'
import ComprasPanel from './components/ComprasPanel.jsx'
import ComercialPanel from './components/ComercialPanel.jsx'
import DashboardPanel from './components/DashboardPanel.jsx'
import GenericModuleTester from './components/GenericModuleTester.jsx'
import LetterGlitch from './components/LetterGlitch.jsx'
import { 
  LayoutGrid, 
  Shield, 
  ShoppingCart, 
  Code, 
  Package, 
  Truck, 
  Zap, 
  Box, 
  Activity,
  Search,
  Notifications,
  HelpCircle,
  Settings,
  Menu,
  LogOut,
  User,
  ExternalLink
} from 'lucide-react'

const MODULES = [
  { id: 'dashboard', name: 'Dashboard', icon: <LayoutGrid size={20} />, iconName: 'dashboard' },
  { id: 'comercial', name: 'Comercial', icon: <ShoppingCart size={20} />, iconName: 'payments' },
  { id: 'administracion', name: 'Administración', icon: <Shield size={20} />, iconName: 'admin_panel_settings' },
  { id: 'compras', name: 'Compras', icon: <Package size={20} />, iconName: 'shopping_bag' },
  { id: 'desarrollo', name: 'Desarrollo', icon: <Code size={20} />, iconName: 'developer_board' },
  { id: 'panol', name: 'Pañol', icon: <Box size={20} />, iconName: 'inventory_2' },
  { id: 'produccion', name: 'Producción', icon: <Activity size={20} />, iconName: 'factory' },
  { id: 'logistica', name: 'Logística', icon: <Truck size={20} />, iconName: 'local_shipping' },
]

function App() {
  const [activeModule, setActiveModule] = useState('dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background text-on-surface font-plus-jakarta overflow-hidden">
      {/* Background Effect (Softened) */}
      <div className="fixed inset-0 z-0 opacity-10 pointer-events-none">
        <LetterGlitch
          glitchSpeed={50}
          centerVignette={true}
          outerVignette={false}
          smooth={true}
        />
      </div>

      {/* Sidebar - Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-surface-container border-r border-outline-variant transition-transform duration-300 transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:static lg:inset-0`}>
        <div className="flex flex-col h-full py-6">
          <div className="px-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center shadow-lg shadow-primary/10">
                <Zap className="text-on-primary-container" size={24} fill="currentColor" />
              </div>
              <div>
                <h1 className="text-lg font-black text-white tracking-tight leading-none">ERP-LG</h1>
                <p className="text-[10px] text-outline uppercase tracking-[0.2em] font-bold mt-1">Industrial Hub</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
            {MODULES.map((mod) => (
              <button
                key={mod.id}
                onClick={() => {
                  setActiveModule(mod.id)
                  setIsSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  activeModule === mod.id
                    ? 'bg-primary-container/10 text-primary border border-primary/20 shadow-sm'
                    : 'text-outline hover:text-on-surface hover:bg-surface-variant/50'
                }`}
              >
                <span className={`material-symbols-outlined transition-transform group-hover:scale-110 ${activeModule === mod.id ? 'text-primary' : 'text-outline'}`} style={{ fontVariationSettings: activeModule === mod.id ? "'FILL' 1" : "'FILL' 0" }}>
                  {mod.iconName}
                </span>
                {mod.name}
              </button>
            ))}
          </nav>

          <div className="px-3 mt-6 pt-6 border-t border-outline-variant space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-outline hover:text-on-surface hover:bg-surface-variant/50 transition-all">
              <span className="material-symbols-outlined">help</span>
              Soporte
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-error hover:bg-error/10 transition-all">
              <span className="material-symbols-outlined">logout</span>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {/* Top Header */}
        <header className="h-16 bg-background/80 backdrop-blur-md border-b border-outline-variant flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-outline hover:text-white"
            >
              <Menu size={20} />
            </button>
            
            <div className="hidden md:flex items-center gap-2 text-outline font-label-sm uppercase tracking-widest text-[10px]">
              <span>Sistema</span>
              <ChevronRight size={10} />
              <span className="text-primary font-bold">{MODULES.find(m => m.id === activeModule)?.name}</span>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md w-full ml-4 hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
              <input 
                type="text" 
                placeholder="Buscar en el sistema..." 
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-1.5 pl-10 pr-4 text-xs focus:outline-none focus:border-primary transition-all text-on-surface"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <HeaderAction icon={<Notifications size={18} />} hasBadge />
            <HeaderAction icon={<Settings size={18} />} />
            
            <div className="h-8 w-px bg-outline-variant mx-2 hidden sm:block" />
            
            <div className="flex items-center gap-3 pl-2">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-on-surface">Admin Terminal</span>
                <span className="text-[9px] text-secondary font-black uppercase tracking-widest">Online</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-outline-variant flex items-center justify-center overflow-hidden hover:border-primary transition-colors cursor-pointer">
                <img 
                  src="https://ui-avatars.com/api/?name=Admin+ERP&background=b8c4ff&color=001453" 
                  alt="User Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Main Canvas */}
        <main className="flex-1 overflow-y-auto p-gutter custom-scrollbar bg-background">
          <div className="max-w-container-max mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
            {activeModule === 'dashboard' && <DashboardPanel />}
            {activeModule === 'comercial' && <ComercialPanel />}
            {activeModule === 'administracion' && <AdminPanel />}
            {activeModule === 'desarrollo' && <DesarrolloPanel />}
            {activeModule === 'compras' && <ComprasPanel />}
            
            {(activeModule === 'panol' || activeModule === 'produccion' || activeModule === 'logistica') && (
              <GenericModuleTester moduleId={activeModule} />
            )}
            
            {!['dashboard', 'comercial', 'administracion', 'desarrollo', 'compras', 'panol', 'produccion', 'logistica'].includes(activeModule) && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-outline border-2 border-dashed border-outline-variant rounded-3xl">
                <LayoutGrid size={48} className="mb-4 opacity-10" />
                <p className="text-lg font-bold">Módulo {activeModule} en desarrollo</p>
                <button className="mt-4 text-primary text-xs font-bold hover:underline flex items-center gap-2">
                  <ExternalLink size={14} /> Solicitar Acceso
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  )
}

function HeaderAction({ icon, hasBadge }) {
  return (
    <button className="relative p-2 text-outline hover:text-primary hover:bg-primary/10 rounded-full transition-all active:scale-90">
      {icon}
      {hasBadge && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-background" />}
    </button>
  )
}

function ChevronRight({ size = 16, className = "" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export default App
