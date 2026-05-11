import React from 'react';
import { useAuth } from './AuthContext';

const PermissionsContext = React.createContext(null);

const ALL_PANELS = ['comercial', 'administracion', 'desarrollo', 'compras', 'panol', 'produccion', 'logistica'];

export function PermissionsProvider({ children }) {
  const { user } = useAuth();

  const { allowedPanels, panelPerms } = React.useMemo(() => {
    if (!user) return { allowedPanels: new Set(), panelPerms: new Map() };

    if (user.is_superuser) {
      const all = [...ALL_PANELS, 'usuarios'];
      return {
        allowedPanels: new Set(all),
        panelPerms: new Map(all.map(p => [p, 'rw'])),
      };
    }

    const perms = new Map();
    for (const r of (user.roles || [])) {
      if (r.role === 'gerencia') {
        ALL_PANELS.forEach(p => { if (!perms.has(p)) perms.set(p, r.perm); });
      } else {
        perms.set(r.role, r.perm);
      }
    }

    return { allowedPanels: new Set(perms.keys()), panelPerms: perms };
  }, [user]);

  const canAccess  = React.useCallback(p => allowedPanels.has(p), [allowedPanels]);
  const isReadonly = React.useCallback(p => panelPerms.get(p) === 'r', [panelPerms]);

  return (
    <PermissionsContext.Provider value={{ canAccess, isReadonly, allowedPanels }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return React.useContext(PermissionsContext);
}
