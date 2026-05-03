const { rsi, rollingMaxPrior } = require('./indicators');

/**
 * RSI Breakout strategy.
 *
 * Two breakout conditions, both must be true on the latest bar:
 *
 *  1. RSI(period) crossed above `rsiThreshold` within the last `lookback` bars.
 *     - Default 50 detects momentum kicking in after a consolidation.
 *     - Set to 30 for "exiting oversold" reversal setups.
 *     - Set to 70 for "entering strength zone" setups.
 *
 *  2. Latest close > rolling N-day high of the prior bars (price breakout).
 *     N is `priceBreakoutPeriod`. Set to 0 to disable price-breakout filter.
 *
 * Optional filter: minimum price (skip penny stocks).
 */
function rsiBreakout(candles, params = {}) {
  const period = params.period ?? 14;
  const rsiThreshold = params.rsiThreshold ?? 50;
  const lookback = params.lookback ?? 3;
  const priceBreakoutPeriod = params.priceBreakoutPeriod ?? 20;
  const minPrice = params.minPrice ?? 0;

  const minBars = Math.max(period + 5, priceBreakoutPeriod + 2);
  if (!candles || candles.length < minBars) {
    return { match: false, reason: 'insufficient_history' };
  }

  const closes = candles.map((c) => c.close);
  const rsiSeries = rsi(closes, period);
  const last = candles.length - 1;
  const rsiNow = rsiSeries[last];
  const rsiPrev = rsiSeries[last - 1];

  // Detect RSI cross above threshold within lookback window.
  let rsiCrossBarsAgo = null;
  for (let i = last; i >= Math.max(1, last - lookback + 1); i--) {
    const cur = rsiSeries[i];
    const prev = rsiSeries[i - 1];
    if (cur == null || prev == null) continue;
    if (prev <= rsiThreshold && cur > rsiThreshold) {
      rsiCrossBarsAgo = last - i;
      break;
    }
  }

  // Price breakout: close > max(close) over prior priceBreakoutPeriod bars.
  let priorHigh = null;
  let priceBreakout = true;
  if (priceBreakoutPeriod > 0) {
    const priorHighs = rollingMaxPrior(closes, priceBreakoutPeriod);
    priorHigh = priorHighs[last];
    priceBreakout = priorHigh != null && closes[last] > priorHigh;
  }

  const details = {
    close: closes[last],
    rsi: rsiNow,
    rsiPrev,
    rsiThreshold,
    rsiCrossBarsAgo,
    priorHigh,
    priceBreakout,
  };

  if (closes[last] < minPrice) return { match: false, ...details };
  if (rsiCrossBarsAgo == null) return { match: false, ...details };
  if (priceBreakoutPeriod > 0 && !priceBreakout) return { match: false, ...details };

  return { match: true, ...details };
}

module.exports = { rsiBreakout };
