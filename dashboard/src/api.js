const API_BASE = '/api';

let token = localStorage.getItem('dashboard_token');

export function setToken(t) {
  token = t;
  localStorage.setItem('dashboard_token', t);
}

export function clearToken() {
  token = null;
  localStorage.removeItem('dashboard_token');
}

export function getToken() {
  return token;
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }

  return res.json();
}

// Auth
export const login = (email, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

// Reports
export const getReportsNearby = (lat, lng, radius = 50) =>
  request(`/reports/missing/nearby?latitude=${lat}&longitude=${lng}&radius_km=${radius}`);

// Analytics
export const getStats = () => request('/analytics/stats');
export const getHeatmap = (days = 30) => request(`/analytics/heatmap?days=${days}`);
export const getTrending = (days = 7) => request(`/analytics/trending?days=${days}`);

// Moderation
export const getFlags = (page = 1) => request(`/moderation/flags?page=${page}`);
export const updateFlag = (id, data) =>
  request(`/moderation/flags/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const takeFlagAction = (id, data) =>
  request(`/moderation/flags/${id}/action`, { method: 'POST', body: JSON.stringify(data) });

// Search
export const searchReports = (q, type = 'all') =>
  request(`/search?q=${encodeURIComponent(q)}&type=${type}`);

// Users
export const getProfile = () => request('/users/me');
