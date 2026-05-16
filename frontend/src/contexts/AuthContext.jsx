import React from 'react';
import { api, setAccessToken, setLogoutHandler } from '../api';

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [partialToken, setPartialToken] = React.useState(null);
  const [credChangePartial, setCredChangePartial] = React.useState(null);

  const logout = React.useCallback(async () => {
    try { await api.auth.logout(); } catch { /* ignore */ }
    setAccessToken(null);
    setUser(null);
    setPartialToken(null);
    setCredChangePartial(null);
  }, []);

  const refreshUser = React.useCallback(async () => {
    const u = await api.auth.me();
    setUser(u);
    return u;
  }, []);

  React.useEffect(() => {
    setLogoutHandler(logout);
  }, [logout]);

  React.useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    // Check expiry without a library
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 > Date.now()) {
        api.auth.me()
          .then(u => { setUser(u); setLoading(false); })
          .catch(() => tryRefreshAndLoad());
      } else {
        tryRefreshAndLoad();
      }
    } catch {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tryRefreshAndLoad = async () => {
    try {
      const r = await fetch('/api/v1/auth/refresh/', { method: 'POST', credentials: 'include' });
      if (!r.ok) throw new Error();
      const { access } = await r.json();
      setAccessToken(access);
      const u = await api.auth.me();
      setUser(u);
    } catch {
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, turnstileToken) => {
    const data = await api.auth.login({ email, password, turnstile_token: turnstileToken });
    if (data.requires_cred_change) {
      setCredChangePartial(data.partial_token);
      return { requires_cred_change: true };
    }
    if (data.requires_2fa) {
      setPartialToken(data.partial_token);
      return { requires_2fa: true };
    }
    setAccessToken(data.access);
    setUser(data.user);
    setPartialToken(null);
    setCredChangePartial(null);
    return { requires_2fa: false };
  };

  const verify2fa = async (code) => {
    const data = await api.auth.verify2fa({ code, partial_token: partialToken });
    setAccessToken(data.access);
    setUser(data.user);
    setPartialToken(null);
  };

  return (
    <AuthContext.Provider value={{
      user, loading, partialToken, credChangePartial,
      login, logout, verify2fa, refreshUser,
      clearCredChange: () => setCredChangePartial(null),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => React.useContext(AuthContext);
