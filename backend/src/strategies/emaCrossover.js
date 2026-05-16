const { ema, lastCrossover } = require('./indicators');

/**
 * EMA Crossover strategy.
 *
 * Default: EMA(20) vs EMA(50). Faster than SMA crossovers and more responsive
 * to recent price action — good for swing/positional entries on liquid stocks.
 *
 * Optional trend filter: only signal when close is on the right side of a
 * long-term trend EMA (default 200) — avoids whipsaws in choppy markets.
 */
function emaCrossover(candles, params = {}) {
  const fastPeriod = params.fast ?? 20;
  const slowPeriod = params.slow ?? 50;
  const lookback = params.lookback ?? 3;
  const side = params.side ?? 'bullish';
  const trendFilter = params.trendFilter ?? true;
  const trendPeriod = params.trendPeriod ?? 200;

  const minBars = Math.max(slowPeriod, trendFilter ? trendPeriod : 0) + 2;
  if (!candles || candles.length < minBars) {
    return { match: false, reason: 'insufficient_history' };
  }

  const closes = candles.map((c) => c.close);
  const fast = ema(closes, fastPeriod);
  const slow = ema(closes, slowPeriod);
  const trend = trendFilter ? ema(closes, trendPeriod) : null;
  const cross = lastCrossover(fast, slow, lookback);

  const last = candles.length - 1;
  const close = closes[last];
  const trendVal = trend ? trend[last] : null;

  const details = {
    close,
    [`ema${fastPeriod}`]: fast[last],
    [`ema${slowPeriod}`]: slow[last],
    crossover: cross.type,
    barsAgo: cross.barsAgo,
  };
  if (trendFilter) details[`ema${trendPeriod}`] = trendVal;

  if (cross.type === 'none') return { match: false, ...details };
  if (side !== 'any' && side !== cross.type) return { match: false, ...details };

  if (trendFilter && trendVal != null) {
    if (cross.type === 'bullish' && close < trendVal) {
      return { match: false, reason: 'below_trend', ...details };
    }
    if (cross.type === 'bearish' && close > trendVal) {
      return { match: false, reason: 'above_trend', ...details };
    }
  }

  return { match: true, ...details };
}

module.exports = { emaCrossover };
