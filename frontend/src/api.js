// In dev, leave VITE_API_BASE unset → relative URLs go through the Vite proxy.
// In prod, set VITE_API_BASE to your backend URL (e.g. https://scanner-backend.onrender.com).
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

async function http(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  health: () => http('/api/health'),
  strategies: () => http('/api/strategies'),
  scan: (body) =>
    http('/api/scan', { method: 'POST', body: JSON.stringify(body) }),
};
