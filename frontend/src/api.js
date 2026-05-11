const BASE = '/api/v1';

let _accessToken = localStorage.getItem('access_token');
let _refreshing = null;
let _onLogout = null;

export function setAccessToken(token) {
  _accessToken = token;
  if (token) localStorage.setItem('access_token', token);
  else localStorage.removeItem('access_token');
}

export function setLogoutHandler(fn) { _onLogout = fn; }

async function _tryRefresh() {
  if (_refreshing) return _refreshing;
  _refreshing = fetch(`${BASE}/auth/refresh/`, { method: 'POST', credentials: 'include' })
    .then(async r => {
      if (!r.ok) throw new Error('refresh failed');
      const { access } = await r.json();
      setAccessToken(access);
      return access;
    })
    .catch(() => {
      setAccessToken(null);
      if (_onLogout) _onLogout();
      return null;
    })
    .finally(() => { _refreshing = null; });
  return _refreshing;
}

async function request(method, path, body, isFormData = false) {
  const makeOpts = (token) => {
    const opts = { method, headers: {}, credentials: 'include' };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData && body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    } else if (body !== undefined) {
      opts.body = body;
    }
    return opts;
  };

  let res = await fetch(`${BASE}${path}`, makeOpts(_accessToken));

  if (res.status === 401 && path !== '/auth/login/' && path !== '/auth/refresh/') {
    const newToken = await _tryRefresh();
    if (newToken) {
      res = await fetch(`${BASE}${path}`, makeOpts(newToken));
    }
  }

  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const j = await res.json();
      msg = j.detail || j.message ||
        (j.non_field_errors && j.non_field_errors[0]) ||
        Object.values(j).find(v => typeof v === 'string') ||
        JSON.stringify(j);
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

const get  = path             => request('GET',    path);
const post = (path, b, f)     => request('POST',   path, b, f);
const put  = (path, b, f)     => request('PUT',    path, b, f);
const del  = path             => request('DELETE', path);

async function downloadBlob(path) {
  const makeOpts = (token) => ({
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  let res = await fetch(`${BASE}${path}`, makeOpts(_accessToken));
  if (res.status === 401) {
    const newToken = await _tryRefresh();
    if (newToken) res = await fetch(`${BASE}${path}`, makeOpts(newToken));
  }
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try { const j = await res.json(); msg = j.detail || j.message || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.blob();
}

export const api = {
  auth: {
    login:       body         => post('/auth/login/', body).then(r => r),
    refresh:     ()           => fetch(`${BASE}/auth/refresh/`, { method: 'POST', credentials: 'include' }).then(r => r.json()),
    logout:      ()           => post('/auth/logout/'),
    me:          ()           => get('/auth/me/'),
    setup2fa:    ()           => get('/auth/2fa/setup/'),
    enable2fa:   body         => post('/auth/2fa/enable/', body),
    disable2fa:  body         => post('/auth/2fa/disable/', body),
    verify2fa:   body         => post('/auth/2fa/verify/', body),
    // User management (SuperUser only)
    listUsers:         ()           => get('/auth/users/'),
    createUser:        body         => post('/auth/users/create/', body),
    updateUser:        (id, body)   => put(`/auth/users/${id}/`, body),
    deleteUser:        id           => del(`/auth/users/${id}/`),
    resendActivation:  body         => post('/auth/users/resend-activation/', body),
    getActivationLink: id           => post(`/auth/users/${id}/activation-link/`, {}),
    activate:              body     => post('/auth/activate/', body),
    requestPasswordReset:  body     => post('/auth/password-reset/', body),
    confirmPasswordReset:  body     => post('/auth/password-reset/confirm/', body),
  },

  comercial: {
    getOFs:   ()   => get('/comercial/ordenes-fabricacion').then(r => r.data),
    createOF: body => post('/comercial/ordenes-fabricacion', body).then(r => r.data.orden),
  },

  administracion: {
    getOrdenes:      ()         => get('/administracion/ordenes').then(r => r.data),
    validarAnticipo: (id, b, f) => put(`/administracion/anticipos/${id}/validar`, b, f).then(r => r.data),
    aprobarDespacho: (id, b, f) => put(`/administracion/despachos/${id}/aprobar`, b, f).then(r => r.data),
  },

  desarrollo: {
    getOFsDisponibles: ()   => get('/desarrollo/ordenes-disponibles').then(r => r.data),
    getPMs:            ()   => get('/desarrollo/pedidos-material').then(r => r.data),
    createPM:          body => post('/desarrollo/pedidos-material', body).then(r => r.data),
    getPlanos:         ()   => get('/desarrollo/planos').then(r => r.data),
    uploadPlano:       fd   => post('/desarrollo/planos', fd, true).then(r => r.data),
    downloadPlano:     (id) => downloadBlob(`/desarrollo/planos/${id}/archivo`),
  },

  compras: {
    getPMs:           ()   => get('/compras/pedidos-material').then(r => r.data),
    getInsumos:       q    => get(`/compras/insumos${q ? `?q=${encodeURIComponent(q)}` : ''}`).then(r => r.data),
    createInsumo:     body => post('/compras/insumos', body).then(r => r.data),
    getFacturas:         ()   => get('/compras/facturas').then(r => r.data),
    registrarFactura:    fd   => post('/compras/facturas', fd, true).then(r => r.data),
    downloadFacturaPdf:  (id) => downloadBlob(`/compras/facturas/${id}/pdf`),
  },

  panol: {
    getStock:            ()     => get('/panol/stock').then(r => r.data),
    getIngresos:         ()     => get('/panol/ingresos').then(r => r.data),
    registrarIngreso:    body   => post('/panol/ingresos', body).then(r => r.data),
    getMovimientos:      ()     => get('/panol/movimientos').then(r => r.data),
    despacharProduccion: body   => post('/panol/movimientos/produccion', body).then(r => r.data),
    getMaterialesOf:     (ofId) => get(`/panol/materiales-of/${ofId}`).then(r => r.data),
  },

  produccion: {
    getLotes:      ()         => get('/produccion/lotes-terminados').then(r => r.data),
    finalizarLote: body       => post('/produccion/lotes-terminados', body).then(r => r.data),
    avanzarEstado: (id, body) => post(`/produccion/lotes/${id}/avanzar`, body).then(r => r.data),
  },

  logistica: {
    getDespachos:          ()   => get('/logistica/despachos').then(r => r.data),
    createDespacho:        body => post('/logistica/despachos', body).then(r => r.data),
    solicitarAutorizacion: id   => post(`/logistica/despachos/${id}/solicitar-autorizacion`).then(r => r.data),
    ejecutar:              id   => post(`/logistica/despachos/${id}/ejecutar`).then(r => r.data),
  },
};
