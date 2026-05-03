const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({
  suppressNotices: ['ripHistorical', 'yahooSurvey'],
});

/**
 * Fetch a recent quote (price, volume, day high/low, etc.) for a Yahoo symbol.
 * NSE symbols look like "RELIANCE.NS".
 */
async function getQuote(yahooSymbol) {
  return yahooFinance.quote(yahooSymbol);
}

/**
 * Fetch quotes for many symbols (Yahoo allows batched calls).
 */
async function getQuotes(yahooSymbols) {
  if (!yahooSymbols || yahooSymbols.length === 0) return [];
  // yahoo-finance2 accepts string or array; chunk to avoid overly long URLs.
  const CHUNK = 50;
  const out = [];
  for (let i = 0; i < yahooSymbols.length; i += CHUNK) {
    const chunk = yahooSymbols.slice(i, i + CHUNK);
    try {
      const res = await yahooFinance.quote(chunk);
      out.push(...(Array.isArray(res) ? res : [res]));
    } catch (err) {
      console.warn(`[ohlc] quote chunk failed: ${err.message}`);
    }
  }
  return out;
}

/**
 * Fetch historical daily OHLCV candles between two dates.
 * @param {string} yahooSymbol e.g. "RELIANCE.NS"
 * @param {object} opts { period1, period2, interval }
 */
async function getHistorical(yahooSymbol, opts = {}) {
  const period2 = opts.period2 || new Date();
  const period1 =
    opts.period1 ||
    new Date(period2.getTime() - 200 * 24 * 60 * 60 * 1000); // ~200 trading days
  const interval = opts.interval || '1d';

  // chart() is the modern replacement for historical()
  const result = await yahooFinance.chart(yahooSymbol, {
    period1,
    period2,
    interval,
  });

  return (result.quotes || []).map((q) => ({
    date: q.date,
    open: q.open,
    high: q.high,
    low: q.low,
    close: q.close,
    volume: q.volume,
  }));
}

module.exports = { getQuote, getQuotes, getHistorical };
