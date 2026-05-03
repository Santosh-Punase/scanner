// In dev, leave VITE_API_BASE unset → relative URLs go through the Vite proxy.
// In prod, set VITE_API_BASE to your backend URL (e.g. https://scanner-backend.onrender.com).
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

import { getToken, clearSession } from './session';

async function http(path, opts = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    clearSession();
    // Force a reload so the login screen shows.
    if (typeof window !== 'undefined') window.location.reload();
  }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  health: () => http('/api/health'),
  strategies: () => http('/api/strategies'),
  scan: (body) =>
    http('/api/scan', { method: 'POST', body: JSON.stringify(body) }),
  login: (name, code) =>
    http('/api/auth/login', { method: 'POST', body: JSON.stringify({ name, code }) }),
  me: () => http('/api/auth/me'),
  usage: (limit = 200) => http(`/api/usage?limit=${limit}`),
};
