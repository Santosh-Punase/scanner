const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'data');
const LOG_FILE = path.join(LOG_DIR, 'usage.jsonl');

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

/** Best-effort parse of a User-Agent string into {browser, os, device}. */
function parseUserAgent(ua) {
  if (!ua) return { browser: 'unknown', os: 'unknown', device: 'unknown' };

  const u = ua.toLowerCase();
  let device = 'desktop';
  if (/mobile|iphone|android.*mobile|windows phone/.test(u)) device = 'mobile';
  else if (/ipad|tablet|android(?!.*mobile)/.test(u)) device = 'tablet';

  let os = 'unknown';
  if (/windows nt 10/.test(u)) os = 'Windows 10/11';
  else if (/windows nt/.test(u)) os = 'Windows';
  else if (/mac os x/.test(u)) os = 'macOS';
  else if (/iphone|ipad|ios/.test(u)) os = 'iOS';
  else if (/android/.test(u)) os = 'Android';
  else if (/linux/.test(u)) os = 'Linux';

  let browser = 'unknown';
  if (/edg\//.test(u)) browser = 'Edge';
  else if (/opr\/|opera/.test(u)) browser = 'Opera';
  else if (/chrome\//.test(u) && !/edg\//.test(u)) browser = 'Chrome';
  else if (/firefox\//.test(u)) browser = 'Firefox';
  else if (/safari\//.test(u) && !/chrome\//.test(u)) browser = 'Safari';

  return { browser, os, device };
}

function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function log(entry) {
  try {
    ensureDir();
    fs.appendFile(LOG_FILE, JSON.stringify(entry) + '\n', (err) => {
      if (err) console.warn('[usage] log failed:', err.message);
    });
  } catch (e) {
    console.warn('[usage] log failed:', e.message);
  }
}

/**
 * Express middleware: logs every protected request after it completes.
 * Captures: time, user, ip, ua, route, strategy/params (for /api/scan),
 * status, duration ms.
 */
function logger(req, res, next) {
  const start = Date.now();
  const ua = parseUserAgent(req.headers['user-agent'] || '');

  res.on('finish', () => {
    const ms = Date.now() - start;
    const entry = {
      t: new Date().toISOString(),
      user: req.user?.name || 'anonymous',
      ip: clientIp(req),
      ua,
      uaRaw: req.headers['user-agent'] || '',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms,
    };

    // Enrich for scans
    if (req.path === '/api/scan') {
      const src = req.method === 'POST' ? req.body : req.query;
      entry.strategy = src?.strategy;
      entry.params = src?.params || {};
      entry.limit = src?.limit;
      // res.locals.scanResult set by scan handler so we can record matched count
      if (res.locals?.scanResult) {
        entry.matched = res.locals.scanResult.matched;
        entry.scanned = res.locals.scanResult.scanned;
      }
    }
    log(entry);
  });

  next();
}

/** Read last N entries (newest first). */
function readRecent(limit = 200) {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    const lines = fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(Boolean);
    const last = lines.slice(-limit).reverse();
    return last
      .map((l) => {
        try { return JSON.parse(l); } catch { return null; }
      })
      .filter(Boolean);
  } catch (e) {
    console.warn('[usage] read failed:', e.message);
    return [];
  }
}

module.exports = { logger, readRecent, parseUserAgent, clientIp };
