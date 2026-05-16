require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { getNseSymbols } = require('./data/symbols');
const { getQuote, getQuotes, getHistorical } = require('./data/ohlc');
const { listStrategies } = require('./strategies');
const { runScan } = require('./services/scanner');
const { isAuthEnabled, login, authMiddleware, adminMiddleware, isAdmin } = require('./auth');
const { logger, readRecent } = require('./usage');

const app = express();
const PORT = process.env.PORT || 4000;

app.set('trust proxy', true); // honour X-Forwarded-For from Render/Vercel/etc.

// CORS: allow all by default; restrict by setting CORS_ORIGIN to a comma-separated list.
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
  : '*';
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// ---- Public endpoints (no auth) ----
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'scanner-backend',
    time: new Date().toISOString(),
    authRequired: isAuthEnabled(),
  });
});

// Login: returns a signed token for use in Authorization: Bearer <token>.
app.post('/api/auth/login', (req, res) => {
  const { name, code } = req.body || {};
  const r = login(name, code);
  if (!r.ok) return res.status(401).json({ error: r.error });
  res.json({ token: r.token, name: r.user?.name || name || 'guest', isAdmin: isAdmin(r.user) });
});

// Whoami: validates a token and reports admin status.
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ name: req.user.name, isAdmin: isAdmin(req.user) });
});

// ---- Protected endpoints below ----
app.use('/api', (req, res, next) => {
  // Skip auth for already-handled public routes
  const open = ['/health', '/auth/login', '/auth/me'];
  if (open.some((p) => req.path === p)) return next();
  return authMiddleware(req, res, next);
});
app.use('/api', logger);

// List all NSE equity symbols (cached for 24h, falls back to seed list).
app.get('/api/symbols', async (req, res) => {
  try {
    const force = req.query.refresh === '1';
    const symbols = await getNseSymbols({ forceRefresh: force });
    res.json({ count: symbols.length, symbols });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Latest quote for one symbol, e.g. /api/quote/RELIANCE
app.get('/api/quote/:symbol', async (req, res) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    const yahoo = sym.endsWith('.NS') ? sym : `${sym}.NS`;
    const q = await getQuote(yahoo);
    res.json(q);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batch quotes: /api/quotes?symbols=RELIANCE,TCS,INFY
app.get('/api/quotes', async (req, res) => {
  try {
    const list = (req.query.symbols || '')
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .map((s) => (s.endsWith('.NS') ? s : `${s}.NS`));
    const data = await getQuotes(list);
    res.json({ count: data.length, quotes: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Historical OHLC: /api/history/RELIANCE?days=120
app.get('/api/history/:symbol', async (req, res) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    const yahoo = sym.endsWith('.NS') ? sym : `${sym}.NS`;
    const days = Math.max(1, Math.min(2000, parseInt(req.query.days, 10) || 200));
    const period2 = new Date();
    const period1 = new Date(period2.getTime() - days * 24 * 60 * 60 * 1000);
    const candles = await getHistorical(yahoo, { period1, period2, interval: '1d' });
    res.json({ symbol: sym, count: candles.length, candles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('NSE Scanner Backend is running. Try GET /api/health');
});

// List available strategies and their default params.
app.get('/api/strategies', (req, res) => {
  res.json({ strategies: listStrategies() });
});

/**
 * Run a scan.
 * GET  /api/scan?strategy=ma_crossover&limit=50&fast=50&slow=200&side=bullish
 * POST /api/scan  body: { strategy, params, limit, concurrency, symbols }
 */
async function handleScan(req, res) {
  try {
    const src = req.method === 'POST' ? req.body : req.query;
    const strategy = src.strategy;
    if (!strategy) return res.status(400).json({ error: 'strategy is required' });

    // Pull params either from `params` object (POST) or remaining query keys (GET).
    let params = src.params || {};
    if (req.method === 'GET') {
      const reserved = new Set(['strategy', 'limit', 'concurrency', 'symbols', 'interval']);
      params = {};
      for (const [k, v] of Object.entries(src)) {
        if (reserved.has(k)) continue;
        // Coerce numeric-looking strings to numbers.
        const n = Number(v);
        params[k] = !Number.isNaN(n) && v !== '' ? n : v;
      }
    }

    const limit = src.limit != null ? Math.max(1, parseInt(src.limit, 10)) : 100;
    const concurrency = src.concurrency
      ? Math.max(1, Math.min(20, parseInt(src.concurrency, 10)))
      : 8;
    const interval = src.interval || '1d';

    let symbols;
    if (src.symbols) {
      symbols = Array.isArray(src.symbols)
        ? src.symbols
        : String(src.symbols).split(',').map((s) => s.trim()).filter(Boolean);
    }

    const result = await runScan({ strategy, params, limit, concurrency, symbols, interval });
    res.locals.scanResult = { matched: result.matched, scanned: result.scanned };
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

app.get('/api/scan', handleScan);
app.post('/api/scan', handleScan);

// ---- Admin: usage log viewer ----
app.get('/api/usage', adminMiddleware, (req, res) => {
  const limit = Math.max(1, Math.min(2000, parseInt(req.query.limit, 10) || 200));
  const entries = readRecent(limit);
  res.json({ count: entries.length, entries });
});

app.listen(PORT, () => {
  console.log(`Scanner backend listening on http://localhost:${PORT}`);
});
