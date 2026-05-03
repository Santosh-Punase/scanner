const { sma, lastCrossover } = require('./indicators');

/**
 * Moving-Average Crossover strategy.
 *
 * Default: SMA(50) vs SMA(200) — Golden Cross (bullish) / Death Cross (bearish).
 * A symbol matches when a crossover happened within the last `lookback` bars
 * AND its direction matches the requested `side` ('bullish' | 'bearish' | 'any').
 */
function maCrossover(candles, params = {}) {
  const fastPeriod = params.fast ?? 50;
  const slowPeriod = params.slow ?? 200;
  const lookback = params.lookback ?? 3;
  const side = params.side ?? 'bullish';

  if (!candles || candles.length < slowPeriod + 2) {
    return { match: false, reason: 'insufficient_history' };
  }

  const closes = candles.map((c) => c.close);
  const fast = sma(closes, fastPeriod);
  const slow = sma(closes, slowPeriod);
  const cross = lastCrossover(fast, slow, lookback);

  const last = candles.length - 1;
  const details = {
    close: closes[last],
    [`sma${fastPeriod}`]: fast[last],
    [`sma${slowPeriod}`]: slow[last],
    crossover: cross.type,
    barsAgo: cross.barsAgo,
  };

  if (cross.type === 'none') return { match: false, ...details };
  if (side !== 'any' && side !== cross.type) return { match: false, ...details };
  return { match: true, ...details };
}

module.exports = { maCrossover };
