const { sma } = require('./indicators');

/**
 * Volume Surge strategy.
 *
 * Matches when the latest bar's volume is at least `multiplier` x the
 * `avgPeriod`-day average volume. Optionally requires a positive close
 * (close > open) to filter for bullish surges.
 */
function volumeSurge(candles, params = {}) {
  const avgPeriod = params.avgPeriod ?? 20;
  const multiplier = params.multiplier ?? 2;
  const requirePositiveClose = params.requirePositiveClose ?? true;
  const minPrice = params.minPrice ?? 0;

  if (!candles || candles.length < avgPeriod + 1) {
    return { match: false, reason: 'insufficient_history' };
  }

  const last = candles[candles.length - 1];
  if (!last || last.volume == null || last.close == null) {
    return { match: false, reason: 'missing_data' };
  }

  const volumes = candles.map((c) => c.volume || 0);
  const avgVolSeries = sma(volumes, avgPeriod);
  // Use average over the prior `avgPeriod` bars (excluding today) to avoid
  // diluting the surge with today's volume itself.
  const avgVol = avgVolSeries[candles.length - 2];
  if (!avgVol) return { match: false, reason: 'no_avg' };

  const ratio = last.volume / avgVol;
  const positiveClose = last.close > last.open;

  const details = {
    close: last.close,
    open: last.open,
    volume: last.volume,
    avgVolume: avgVol,
    ratio,
    positiveClose,
  };

  if (last.close < minPrice) return { match: false, ...details };
  if (ratio < multiplier) return { match: false, ...details };
  if (requirePositiveClose && !positiveClose) return { match: false, ...details };

  return { match: true, ...details };
}

module.exports = { volumeSurge };
