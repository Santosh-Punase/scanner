const crypto = require('crypto');

const SECRET = process.env.AUTH_SECRET || 'dev-insecure-change-me';
const ACCESS_CODE = process.env.ACCESS_CODE || ''; // empty = auth disabled
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const ADMIN_NAMES = (process.env.ADMIN_NAMES || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromB64url(str) {
  return Buffer.from(
    str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4),
    'base64'
  );
}

function sign(payload) {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(crypto.createHmac('sha256', SECRET).update(body).digest());
  return `${body}.${sig}`;
}

function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = b64url(crypto.createHmac('sha256', SECRET).update(body).digest());
  // timing-safe compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(fromB64url(body).toString('utf8'));
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function isAuthEnabled() {
  return !!ACCESS_CODE;
}

function login(name, code) {
  if (!isAuthEnabled()) {
    // Auth disabled: any name works.
    return { ok: true, token: sign({ name: name || 'guest', iat: Date.now(), exp: Date.now() + TOKEN_TTL_MS }) };
  }
  if (!name || !name.trim()) return { ok: false, error: 'Name is required' };
  if (!code) return { ok: false, error: 'Access code is required' };
  // timing-safe comparison
  const a = Buffer.from(String(code));
  const b = Buffer.from(ACCESS_CODE);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: 'Invalid access code' };
  }
  const payload = {
    name: name.trim().slice(0, 60),
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS,
  };
  return { ok: true, token: sign(payload), user: payload };
}

function authMiddleware(req, res, next) {
  if (!isAuthEnabled()) {
    req.user = { name: 'guest' };
    return next();
  }
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verify(token);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });
  req.user = payload;
  next();
}

function isAdmin(user) {
  if (!user) return false;
  if (!ADMIN_NAMES.length) return false;
  return ADMIN_NAMES.includes(String(user.name || '').toLowerCase());
}

function adminMiddleware(req, res, next) {
  if (!isAdmin(req.user)) return res.status(403).json({ error: 'Forbidden' });
  next();
}

module.exports = {
  isAuthEnabled,
  login,
  authMiddleware,
  adminMiddleware,
  isAdmin,
};
