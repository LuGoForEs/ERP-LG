import React from 'react';
import { ToastProvider, Sidebar, ShortcutsDialog, useGlobalShortcuts } from './components/primitives';
import { ArticulosProvider } from './contexts/ArticulosContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PermissionsProvider, usePermissions } from './contexts/PermissionsContext';
import LoginPage from './components/LoginPage';
import TwoFASetupDialog from './components/TwoFASetupDialog';
import ActivationPage from './components/ActivationPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import ComercialPanel from './components/ComercialPanel';
import AdminPanel from './components/AdminPanel';
import DesarrolloPanel from './components/DesarrolloPanel';
import ComprasPanel from './components/ComprasPanel';
import PanolPanel from './components/PanolPanel';
import ProduccionPanel from './components/ProduccionPanel';
import LogisticaPanel from './components/LogisticaPanel';
import UsersPanel from './components/UsersPanel';
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
};

function AppInner() {
  const activateToken = new URLSearchParams(window.location.search).get('activate');
  const resetToken    = new URLSearchParams(window.location.search).get('reset');

  const { user, loading, partialToken, logout } = useAuth();
  const { allowedPanels } = usePermissions();
  const [active, setActive] = React.useState('comercial');
  const [showShortcuts, setShowShortcuts] = React.useState(false);
  const [newSignal, setNewSignal] = React.useState(0);
  const [show2FA, setShow2FA] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState(user);

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

  const handleUpdated2FA = async () => {
    try { const u = await api.auth.me(); setCurrentUser(u); } catch { /* ignore */ }
  };

  if (activateToken) {
    return <ActivationPage token={activateToken} />;
  }

  if (resetToken) {
    return <ResetPasswordPage token={resetToken} />;
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

  const Panel = PANELS[active] || PANELS[([...allowedPanels][0])] || ComercialPanel;

  return (
    <ArticulosProvider>
      <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
        <Sidebar
          active={active}
          onSelect={setActive}
          onShortcuts={() => setShowShortcuts(true)}
          user={currentUser}
          onLogout={logout}
          on2FASetup={() => setShow2FA(true)}
          allowedPanels={allowedPanels}
        />
        <main className="flex-1 min-w-0 max-h-screen overflow-y-auto">
          <Panel openNewSignal={newSignal} />
        </main>
        <ShortcutsDialog open={showShortcuts} onClose={() => setShowShortcuts(false)} allowedPanels={allowedPanels} />
        <TwoFASetupDialog
          user={currentUser}
          open={show2FA}
          onClose={() => setShow2FA(false)}
          onUpdated={handleUpdated2FA}
        />
      </div>
    </ArticulosProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <ToastProvider>
          <AppInner />
        </ToastProvider>
      </PermissionsProvider>
    </AuthProvider>
  );
}
