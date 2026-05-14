/**
 * API-клиент Wealth Hub.
 * Хранит JWT в localStorage, автоматически обновляет refresh-токен.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const TOKEN_KEY  = 'wh_access_token';
const REFRESH_KEY = 'wh_refresh_token';

export const tokens = {
  get access()    { return localStorage.getItem(TOKEN_KEY); },
  get refresh()   { return localStorage.getItem(REFRESH_KEY); },
  set(access, refresh) {
    if (access)  localStorage.setItem(TOKEN_KEY,  access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

async function rawFetch(path, options = {}, retry = true) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers = { ...(options.headers || {}) };

  const isFormData = options.body instanceof FormData;
  if (!isFormData && options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (tokens.access) {
    headers['Authorization'] = `Bearer ${tokens.access}`;
  }

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new ApiError('Не удалось подключиться к серверу. Проверьте, что backend запущен.', 0);
  }

  if (response.status === 401 && retry && tokens.refresh) {
    const refreshed = await tryRefresh();
    if (refreshed) return rawFetch(path, options, false);
  }

  if (!response.ok) {
    let detail = 'Ошибка запроса';
    try {
      const data = await response.json();
      detail = data.detail || JSON.stringify(data);
    } catch {}
    throw new ApiError(detail, response.status);
  }

  if (response.status === 204) return null;
  const ct = response.headers.get('Content-Type') || '';
  if (ct.includes('application/json')) return response.json();
  return response.text();
}

async function tryRefresh() {
  try {
    const r = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: tokens.refresh }),
    });
    if (!r.ok) return false;
    const data = await r.json();
    tokens.set(data.access, data.refresh);
    return true;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export const api = {
  get:    (path)        => rawFetch(path),
  post:   (path, body)  => rawFetch(path, { method: 'POST',  body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch:  (path, body)  => rawFetch(path, { method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put:    (path, body)  => rawFetch(path, { method: 'PUT',   body: body instanceof FormData ? body : JSON.stringify(body) }),
  delete: (path)        => rawFetch(path, { method: 'DELETE' }),
};

export const authApi = {
  register: (data)  => api.post('/api/auth/register/', data),
  login:    (data)  => api.post('/api/auth/login/',    data),
  esia:     (data)  => api.post('/api/auth/esia/',     data),
  me:       ()      => api.get ('/api/me/'),
  updateMe: (data)  => api.patch('/api/me/', data),
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return api.patch('/api/me/', fd);
  },
  verifyESIA:           ()         => api.post('/api/me/verify-esia/', {}),
  submitForVerification: ()        => api.post('/api/me/submit-verification/', {}),
  portfolio:            ()         => api.get('/api/me/portfolio/'),
  regenerateToken:      ()         => api.post('/api/me/regenerate-token/', {}),
};

export const projectsApi = {
  list:     (params)  => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get(`/api/projects/${qs}`);
  },
  get:      (id)      => api.get(`/api/projects/${id}/`),

  // Создание/редактирование с поддержкой FormData (если есть обложка)
  create:   (data)    => {
    const hasFile = data instanceof FormData;
    return api.post('/api/projects/', hasFile ? data : data);
  },
  update:   (id, d)   => api.patch(`/api/projects/${id}/`, d),
  delete:   (id)      => api.delete(`/api/projects/${id}/`),
  moderate: (id, d)   => api.post(`/api/projects/${id}/moderate/`, d),
  recommendation: (id) => api.get(`/api/projects/${id}/recommendation/`),
  investors:      (id) => api.get(`/api/projects/${id}/investors/`),
  listMine:       ()   => api.get('/api/projects/?mine=1&page_size=100'),
  updates:  (id)      => api.get(`/api/projects/${id}/updates/`),

  // Команда
  listTeam: (id)              => api.get(`/api/projects/${id}/team/`),
  addTeam:  (id, formData)    => api.post(`/api/projects/${id}/team/`, formData),
  updateTeam: (id, mid, data) => api.patch(`/api/projects/${id}/team/${mid}/`, data),
  deleteTeam: (id, mid)       => api.delete(`/api/projects/${id}/team/${mid}/`),

  // Документы
  listDocuments: (id)              => api.get(`/api/projects/${id}/documents/`),
  addDocument:   (id, formData)    => api.post(`/api/projects/${id}/documents/`, formData),
  deleteDocument: (id, did)        => api.delete(`/api/projects/${id}/documents/${did}/`),

  // Продвижение
  buyPromotion: (id, tier) => api.post(`/api/projects/${id}/promote/`, { tier }),
};

export const investApi = {
  list:    ()    => api.get('/api/investments/'),
  create:  (d)   => api.post('/api/investments/create/', d),
  dividends: () => api.get('/api/dividends/'),
  transactions: () => api.get('/api/transactions/'),
};

export const supportApi = {
  list:   ()         => api.get('/api/support/tickets/'),
  get:    (id)       => api.get(`/api/support/tickets/${id}/`),
  create: (d)        => api.post('/api/support/tickets/', d),
  reply:  (id, body) => api.post(`/api/support/tickets/${id}/reply/`, { body }),
  close:  (id)       => api.post(`/api/support/tickets/${id}/close/`, {}),
};

export const faqApi = {
  list: () => api.get('/api/faq/'),
};

export const notifApi = {
  list:        ()   => api.get('/api/notifications/'),
  unreadCount: ()   => api.get('/api/notifications/unread-count/'),
  markAllRead: ()   => api.post('/api/notifications/mark-all-read/', {}),
  markRead:    (id) => api.post(`/api/notifications/${id}/mark-read/`, {}),
};

export const adminApi = {
  users:           (q)   => {
    const qs = q ? '?' + new URLSearchParams(q).toString() : '';
    return api.get(`/api/admin/users/${qs}`);
  },
  makeAdmin:       (id) => api.post(`/api/admin/users/${id}/make-admin/`, {}),
  revokeAdmin:     (id) => api.post(`/api/admin/users/${id}/revoke-admin/`, {}),
  verifyUser:      (id, method = 'manual') => api.post(`/api/admin/users/${id}/verify/`, { method }),
  rejectVerification: (id) => api.post(`/api/admin/users/${id}/reject-verification/`, {}),
};

export const promotionApi = {
  tiers: () => api.get('/api/promotion/tiers/'),
};

export function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}
