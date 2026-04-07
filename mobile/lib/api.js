import * as SecureStore from 'expo-secure-store';
import { CONFIG } from './config';

const API_URL = CONFIG.API_URL;

let accessToken = null;

export async function getToken() {
  if (accessToken) return accessToken;
  accessToken = await SecureStore.getItemAsync('token');
  return accessToken;
}

export async function setTokens(token, refreshToken) {
  accessToken = token;
  await SecureStore.setItemAsync('token', token);
  await SecureStore.setItemAsync('refreshToken', refreshToken);
}

export async function clearTokens() {
  accessToken = null;
  await SecureStore.deleteItemAsync('token');
  await SecureStore.deleteItemAsync('refreshToken');
}

async function refreshAccessToken() {
  const refreshToken = await SecureStore.getItemAsync('refreshToken');
  if (!refreshToken) throw new Error('No refresh token');

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    await clearTokens();
    throw new Error('Session expired');
  }

  const data = await res.json();
  await setTokens(data.token, data.refreshToken);
  return data.token;
}

export async function api(path, options = {}) {
  const token = await getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && token) {
    try {
      const newToken = await refreshAccessToken();
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
    } catch {
      throw new Error('Session expired');
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || 'Request failed');
  }

  return res.json();
}

// --- Upload ---
export async function uploadPhoto(uri) {
  const token = await getToken();
  const filename = uri.split('/').pop();
  const ext = filename.split('.').pop().toLowerCase();
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', { uri, name: filename, type: mimeType });

  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

// --- Auth ---
export const login = (email, password) =>
  api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const register = (data) =>
  api('/auth/register', { method: 'POST', body: JSON.stringify(data) });

// --- Reports ---
export const getNearbyAlerts = (lat, lng, radius = 10) =>
  api(`/reports/missing/nearby?latitude=${lat}&longitude=${lng}&radius_km=${radius}`);

export const createMissingReport = (data) =>
  api('/reports/missing', { method: 'POST', body: JSON.stringify(data) });

export const getReport = (id) => api(`/reports/missing/${id}`);

// --- Sightings ---
export const reportSighting = (data) =>
  api('/sightings', { method: 'POST', body: JSON.stringify(data) });

export const getSightings = (reportId) => api(`/sightings/${reportId}`);

// --- Lost & Found ---
export const reportLost = (data) =>
  api('/items/lost', { method: 'POST', body: JSON.stringify(data) });

export const reportFound = (data) =>
  api('/items/found', { method: 'POST', body: JSON.stringify(data) });

export const getNearbyLost = (lat, lng, radius = 5) =>
  api(`/items/lost/nearby?latitude=${lat}&longitude=${lng}&radius_km=${radius}`);

export const getNearbyFound = (lat, lng, radius = 5) =>
  api(`/items/found/nearby?latitude=${lat}&longitude=${lng}&radius_km=${radius}`);

// --- Intel ---
export const submitIntelReport = (data) =>
  api('/intel/report', { method: 'POST', body: JSON.stringify(data) });

// --- User ---
export const getProfile = () => api('/users/me');
export const updateLocation = (lat, lng) =>
  api('/users/me/location', { method: 'PUT', body: JSON.stringify({ latitude: lat, longitude: lng }) });
export const updateSettings = (settings) =>
  api('/users/me/settings', { method: 'PUT', body: JSON.stringify(settings) });
export const getMyReports = () => api('/users/me/reports');

// --- Notifications ---
export const registerFcmToken = (token, platform, language) =>
  api('/notifications/token', { method: 'PUT', body: JSON.stringify({ token, platform, language }) });
export const removeFcmToken = () => api('/notifications/token', { method: 'DELETE' });
export const getNotificationPrefs = () => api('/notifications/preferences');
export const updateNotificationPrefs = (prefs) =>
  api('/notifications/preferences', { method: 'PUT', body: JSON.stringify(prefs) });

// --- Verification ---
export const claimItem = (itemId) =>
  api(`/verification/items/${itemId}/claim`, { method: 'POST' });
export const submitVerification = (claimId, answers) =>
  api(`/verification/claims/${claimId}/verify`, { method: 'POST', body: JSON.stringify({ answers }) });

// --- Resolution ---
export const resolveReport = (reportId, data) =>
  api(`/reports/${reportId}/resolve`, { method: 'POST', body: JSON.stringify(data) });
export const getStories = (page = 1) => api(`/stories?page=${page}`);
export const celebrateStory = (storyId) =>
  api(`/stories/${storyId}/celebrate`, { method: 'POST' });
