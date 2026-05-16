const { getNseSymbols } = require('../data/symbols');
const { getHistorical } = require('../data/ohlc');
const { getStrategy } = require('../strategies');

// Supported intervals — restricted to what Yahoo serves reliably for free.
// Keys are values accepted by yahoo-finance2 chart() interval option.
const INTERVALS = {
  // intraday (limited history on Yahoo)
  '15m': { tradingBarsPerDay: 25, maxCalendarDays: 60 },   // 6.25h * 4
  '30m': { tradingBarsPerDay: 13, maxCalendarDays: 60 },
  '60m': { tradingBarsPerDay: 7,  maxCalendarDays: 730 },
  '1h':  { tradingBarsPerDay: 7,  maxCalendarDays: 730 },
  // daily and above (effectively unlimited history for our uses)
  '1d':  { tradingBarsPerDay: 1,        maxCalendarDays: null },
  '1wk': { tradingBarsPerDay: 1 / 5,    maxCalendarDays: null },
  '1mo': { tradingBarsPerDay: 1 / 21,   maxCalendarDays: null },
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Convert a desired number of bars to a calendar-time window for Yahoo,
 * accounting for the chosen interval. Adds 50% headroom for holidays/gaps
 * and clamps to Yahoo's intraday history caps.
 */
function calendarWindowMs(barsNeeded, interval) {
  const cfg = INTERVALS[interval] || INTERVALS['1d'];
  const tradingDays = barsNeeded / cfg.tradingBarsPerDay;
  // ~5 trading days per 7 calendar days, +50% headroom
  const calendarDays = Math.ceil(tradingDays * (7 / 5) * 1.5);
  const capped = cfg.maxCalendarDays
    ? Math.min(calendarDays, cfg.maxCalendarDays)
    : calendarDays;
  return Math.max(capped, 5) * DAY_MS;
}

/**
 * Run a strategy against many NSE symbols.
 *
 * @param {object} opts
 * @param {string} opts.strategy   key from strategies registry
 * @param {object} opts.params     strategy-specific params
 * @param {number} opts.limit      max symbols to scan (for speed during dev)
 * @param {number} opts.concurrency parallel history fetches
 * @param {string[]} opts.symbols  optional explicit symbol list (NSE codes, no .NS)
 * @param {string} opts.interval   candle interval (1d, 1wk, 1mo, 60m, 30m, 15m)
 * @returns {Promise<{ scanned, matched, results, errors }>}
 */
async function runScan({
  strategy,
  params = {},
  limit = 100,
  concurrency = 8,
  symbols,
  interval = '1d',
} = {}) {
  const s = getStrategy(strategy);
  if (!s) throw new Error(`Unknown strategy: ${strategy}`);
  if (!INTERVALS[interval]) {
    throw new Error(`Unsupported interval: ${interval}. Allowed: ${Object.keys(INTERVALS).join(', ')}`);
  }

  const merged = { ...s.defaults, ...params };
  const barsNeeded = s.minHistoryDays(merged);
  const windowMs = calendarWindowMs(barsNeeded, interval);

  let universe;
  if (symbols && symbols.length) {
    universe = symbols.map((sym) => ({
      symbol: sym.toUpperCase(),
      yahoo: `${sym.toUpperCase()}.NS`,
    }));
  } else {
    universe = await getNseSymbols();
  }
  if (limit && limit > 0) universe = universe.slice(0, limit);

  const results = [];
  const errors = [];
  let cursor = 0;

  async function worker() {
    while (cursor < universe.length) {
      const idx = cursor++;
      const sym = universe[idx];
      try {
        const period2 = new Date();
        const period1 = new Date(period2.getTime() - windowMs);
        const candles = await getHistorical(sym.yahoo, {
          period1,
          period2,
          interval,
        });
        // Drop incomplete trailing bars (intraday candle with null close).
        const cleaned = candles.filter(
          (c) => c && c.close != null && c.open != null && c.volume != null
        );
        const out = s.run(cleaned, merged);
        if (out.match) {
          results.push({
            symbol: sym.symbol,
            name: sym.name,
            ...out,
          });
        }
      } catch (err) {
        errors.push({ symbol: sym.symbol, error: err.message });
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, worker);
  await Promise.all(workers);

  return {
    strategy,
    params: merged,
    interval,
    scanned: universe.length,
    matched: results.length,
    errored: errors.length,
    results,
    errors,
  };
}

module.exports = { runScan, INTERVALS };
