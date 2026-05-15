import React from 'react';
import { api, setAccessToken } from '../api';
import { useAuth } from './AuthContext';
import { useToast } from '../components/primitives';

const NotificationsContext = React.createContext(null);

const NODE_LABELS = {
  comercial: 'Comercial',
  administracion: 'Administración',
  desarrollo: 'Desarrollo',
  compras: 'Compras',
  panol: 'Pañol',
  produccion: 'Producción',
  logistica: 'Logística',
};

export function NotificationsProvider({ children }) {
  const { user, partialToken } = useAuth();
  const toast = useToast();

  // subscribers: Map<nodeId, Set<callback>> — los paneles se registran para recargar
  const subscribers = React.useRef(new Map());
  const lastIdRef = React.useRef(null);

  const subscribe = React.useCallback((nodeId, cb) => {
    let set = subscribers.current.get(nodeId);
    if (!set) { set = new Set(); subscribers.current.set(nodeId, set); }
    set.add(cb);
    return () => set.delete(cb);
  }, []);

  React.useEffect(() => {
    if (!user || partialToken) return;

    let es = null;
    let closed = false;
    let reconnectTimer = null;

    const connect = () => {
      if (closed) return;
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const params = new URLSearchParams({ token });
      if (lastIdRef.current) params.set('last_id', lastIdRef.current);
      es = new EventSource(`/api/v1/events/stream?${params.toString()}`);

      es.addEventListener('node-change', (e) => {
        let data;
        try { data = JSON.parse(e.data); } catch { return; }
        lastIdRef.current = data.id;

        toast({
          type: 'info',
          msg: `${NODE_LABELS[data.source] || data.source}: ${data.message}`,
        });

        const set = subscribers.current.get(data.target);
        if (set) set.forEach(cb => { try { cb(data); } catch { /* ignore */ } });
      });

      es.onerror = async () => {
        // EventSource entró en estado de fallo (token expirado o conexión
        // reciclada por el backend). Cerramos, refrescamos el token y
        // reconectamos — sin polling: sólo reaccionamos a la desconexión.
        if (es) { es.close(); es = null; }
        if (closed) return;
        try {
          const { access } = await api.auth.refresh();
          if (access) setAccessToken(access);
        } catch { /* el token viejo puede seguir siendo válido */ }
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (es) es.close();
    };
  }, [user, partialToken, toast]);

  return (
    <NotificationsContext.Provider value={{ subscribe }}>
      {children}
    </NotificationsContext.Provider>
  );
}

/** Un panel se suscribe a los cambios de su nodo; `onEvent` típicamente recarga datos. */
export function useNodeEvents(nodeId, onEvent) {
  const ctx = React.useContext(NotificationsContext);
  const cbRef = React.useRef(onEvent);
  cbRef.current = onEvent;

  React.useEffect(() => {
    if (!ctx || !nodeId) return;
    return ctx.subscribe(nodeId, (data) => cbRef.current?.(data));
  }, [ctx, nodeId]);
}
