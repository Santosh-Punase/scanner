const { getNseSymbols } = require('../data/symbols');
const { getHistorical } = require('../data/ohlc');
const { getStrategy } = require('../strategies');

/**
 * Run a strategy against many NSE symbols.
 *
 * @param {object} opts
 * @param {string} opts.strategy   key from strategies registry
 * @param {object} opts.params     strategy-specific params
 * @param {number} opts.limit      max symbols to scan (for speed during dev)
 * @param {number} opts.concurrency parallel history fetches
 * @param {string[]} opts.symbols  optional explicit symbol list (NSE codes, no .NS)
 * @returns {Promise<{ scanned, matched, results, errors }>}
 */
async function runScan({
  strategy,
  params = {},
  limit = 100,
  concurrency = 8,
  symbols,
} = {}) {
  const s = getStrategy(strategy);
  if (!s) throw new Error(`Unknown strategy: ${strategy}`);

  const merged = { ...s.defaults, ...params };
  const days = s.minHistoryDays(merged);

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
        const period1 = new Date(period2.getTime() - days * 2 * 24 * 60 * 60 * 1000);
        const candles = await getHistorical(sym.yahoo, {
          period1,
          period2,
          interval: '1d',
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
    scanned: universe.length,
    matched: results.length,
    errored: errors.length,
    results,
    errors,
  };
}

module.exports = { runScan };
