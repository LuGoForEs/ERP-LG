import React from 'react';
import { ToastProvider, Sidebar, ShortcutsDialog, useGlobalShortcuts, SidebarToggleProvider, CommandPalette, useCommandPaletteShortcut, ConfirmProvider } from './components/primitives';
import { V2_MODULES } from './data/mock';
import { ArticulosProvider } from './contexts/ArticulosContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PermissionsProvider, usePermissions } from './contexts/PermissionsContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import LoginPage from './components/LoginPage';
import TwoFASetupDialog from './components/TwoFASetupDialog';
import ContactSoporteDialog from './components/ContactSoporteDialog';
import ActivationPage from './components/ActivationPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import CredentialChangePage from './components/CredentialChangePage';
import TokenConfirmPage from './components/TokenConfirmPage';
import Forced2FAGate from './components/Forced2FAGate';
import RootConsole from './components/RootConsole';
import ComercialPanel from './components/ComercialPanel';
import AdminPanel from './components/AdminPanel';
import DesarrolloPanel from './components/DesarrolloPanel';
import ComprasPanel from './components/ComprasPanel';
import PanolPanel from './components/PanolPanel';
import ProduccionPanel from './components/ProduccionPanel';
import LogisticaPanel from './components/LogisticaPanel';
import UsersPanel from './components/UsersPanel';
import SoportePanel from './components/SoportePanel';
import { api } from './api';

const PANELS = {
  comercial:      ComercialPanel,
  administracion: AdminPanel,
  desarrollo:     DesarrolloPanel,
  compras:        ComprasPanel,
  panol:          PanolPanel,
  produccion:     ProduccionPanel,
  logistica:      LogisticaPanel,
  usuarios:       UsersPanel,
  soporte:        SoportePanel,
};

function AppInner() {
  const _params       = new URLSearchParams(window.location.search);
  const activateToken = _params.get('activate');
  const resetToken    = _params.get('reset');
  const credConfirm   = _params.get('cred-confirm');
  const adminConfirm  = _params.get('admin-confirm');

  const { user, loading, partialToken, credChangePartial, logout, refreshUser } = useAuth();
  const { allowedPanels } = usePermissions();
  const [active, setActive] = React.useState('comercial');
  const [showShortcuts, setShowShortcuts] = React.useState(false);
  const [newSignal, setNewSignal] = React.useState(0);
  const [show2FA, setShow2FA] = React.useState(false);
  const [showContactSoporte, setShowContactSoporte] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState(user);

  const openSidebar = React.useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = React.useCallback(() => setSidebarOpen(false), []);

  React.useEffect(() => { setCurrentUser(user); }, [user]);

  // Reset to first accessible panel when permissions change
  React.useEffect(() => {
    if (allowedPanels.size > 0 && !allowedPanels.has(active)) {
      setActive([...allowedPanels][0]);
    }
  }, [allowedPanels]); // eslint-disable-line react-hooks/exhaustive-deps

  const safeSetActive = React.useCallback((id) => {
    if (!allowedPanels.size || allowedPanels.has(id)) setActive(id);
  }, [allowedPanels]);

  useGlobalShortcuts(safeSetActive, () => setShowShortcuts(true), () => setNewSignal(s => s + 1), allowedPanels);
  useCommandPaletteShortcut(() => setPaletteOpen(true));

  // Comandos del palette generados dinámicamente desde paneles permitidos + acciones globales
  const paletteCommands = React.useMemo(() => {
    const list = [];
    V2_MODULES.forEach(m => {
      if (allowedPanels.has(m.id)) {
        list.push({
          id: `nav:${m.id}`, label: `Ir a ${m.name}`, hint: `Atajo: G + ${m.shortcut.toUpperCase()}`,
          group: 'Navegación', icon: 'chevron-right', keywords: [m.id, m.name],
          shortcut: m.shortcut.toUpperCase(), onRun: () => safeSetActive(m.id),
        });
      }
    });
    list.push(
      { id: 'act:new', label: 'Nuevo en panel actual', hint: 'Abre el diálogo de creación', group: 'Acciones',
        icon: 'plus', shortcut: 'N', onRun: () => setNewSignal(s => s + 1) },
      { id: 'act:shortcuts', label: 'Ver atajos de teclado', group: 'Acciones',
        icon: 'keyboard', shortcut: '?', onRun: () => setShowShortcuts(true) },
      { id: 'act:soporte', label: 'Contactar a soporte', group: 'Acciones',
        icon: 'mail', onRun: () => setShowContactSoporte(true) },
      { id: 'act:2fa', label: currentUser?.totp_enabled ? 'Gestionar 2FA' : 'Activar 2FA', group: 'Acciones',
        icon: 'shield', onRun: () => setShow2FA(true) },
      { id: 'act:logout', label: 'Cerrar sesión', group: 'Acciones',
        icon: 'log-out', onRun: () => logout() },
    );
    return list;
  }, [allowedPanels, safeSetActive, currentUser, logout]);

  const handleUpdated2FA = async () => {
    try { const u = await api.auth.me(); setCurrentUser(u); } catch { /* ignore */ }
  };

  if (activateToken) {
    return <ActivationPage token={activateToken} />;
  }

  if (resetToken) {
    return <ResetPasswordPage token={resetToken} />;
  }

  if (credConfirm) {
    return <TokenConfirmPage kind="cred" token={credConfirm} />;
  }

  if (adminConfirm) {
    return <TokenConfirmPage kind="admin" token={adminConfirm} />;
  }

  if (credChangePartial) {
    return <CredentialChangePage />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-600">
          <div className="w-4 h-4 rounded-full border-2 border-zinc-700 border-t-zinc-400 animate-spin" />
          <span className="font-mono text-sm">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!user || partialToken) {
    return <LoginPage />;
  }

  // 2FA obligatorio (root tras rotar credenciales; admins de sistema en su 1er ingreso)
  if (user.must_enable_2fa && !user.totp_enabled) {
    return <Forced2FAGate onDone={refreshUser} onLogout={logout} />;
  }

  // Consola aislada del root: no ve paneles operativos ni sidebar
  if (user.is_root) {
    return <RootConsole user={user} onLogout={logout} onRefreshUser={refreshUser} />;
  }

  const Panel = PANELS[active] || PANELS[([...allowedPanels][0])] || ComercialPanel;

  return (
    <ArticulosProvider>
      <SidebarToggleProvider value={openSidebar}>
      <div className="flex min-h-screen min-h-[100dvh] bg-zinc-950 text-zinc-100">
        <Sidebar
          active={active}
          onSelect={setActive}
          onShortcuts={() => setShowShortcuts(true)}
          user={currentUser}
          onLogout={logout}
          on2FASetup={() => setShow2FA(true)}
          onContactSoporte={() => setShowContactSoporte(true)}
          allowedPanels={allowedPanels}
          mobileOpen={sidebarOpen}
          onClose={closeSidebar}
        />
        <main className="flex-1 min-w-0 max-h-screen max-h-[100dvh] overflow-y-auto">
          <div className="w-full max-w-[1600px] mx-auto">
            <Panel openNewSignal={newSignal} />
          </div>
        </main>
        <ShortcutsDialog open={showShortcuts} onClose={() => setShowShortcuts(false)} allowedPanels={allowedPanels} />
        <TwoFASetupDialog
          user={currentUser}
          open={show2FA}
          onClose={() => setShow2FA(false)}
          onUpdated={handleUpdated2FA}
        />
        <ContactSoporteDialog
          open={showContactSoporte}
          onClose={() => setShowContactSoporte(false)}
        />
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          commands={paletteCommands}
        />
      </div>
      </SidebarToggleProvider>
    </ArticulosProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <ToastProvider>
          <ConfirmProvider>
            <NotificationsProvider>
              <AppInner />
            </NotificationsProvider>
          </ConfirmProvider>
        </ToastProvider>
      </PermissionsProvider>
    </AuthProvider>
  );
}
