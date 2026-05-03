const { rsi } = require('./indicators');

/**
 * Find local pivots (swing highs / lows) in a series.
 *
 * A bar at index i is a pivot HIGH if values[i] is the strict max of
 * values[i-strength .. i+strength]. Pivot LOW is the symmetric case.
 *
 * Returns array of { index, value, type: 'high' | 'low' } in chronological order.
 */
function findPivots(values, strength = 3) {
  const out = [];
  for (let i = strength; i < values.length - strength; i++) {
    const v = values[i];
    if (v == null) continue;
    let isHigh = true;
    let isLow = true;
    for (let k = 1; k <= strength; k++) {
      const a = values[i - k];
      const b = values[i + k];
      if (a == null || b == null) { isHigh = false; isLow = false; break; }
      if (!(v > a) || !(v > b)) isHigh = false;
      if (!(v < a) || !(v < b)) isLow = false;
    }
    if (isHigh) out.push({ index: i, value: v, type: 'high' });
    else if (isLow) out.push({ index: i, value: v, type: 'low' });
  }
  return out;
}

/**
 * RSI Divergence with Confirmation.
 *
 * Detects classic regular divergence between price and RSI on the most recent
 * two confirmed pivots within a lookback window, then requires a confirmation
 * candle to validate the signal.
 *
 * Bullish divergence:
 *   - Two most recent price pivot LOWs: price makes lower low.
 *   - RSI at those same indices: RSI makes higher low.
 *   - Confirmation: latest close > close at the most recent pivot low
 *     AND RSI(now) > RSI at that pivot.
 *
 * Bearish divergence:
 *   - Two most recent price pivot HIGHs: price makes higher high.
 *   - RSI at those indices: RSI makes lower high.
 *   - Confirmation: latest close < close at the most recent pivot high
 *     AND RSI(now) < RSI at that pivot.
 */
function rsiDivergence(candles, params = {}) {
  const period = params.period ?? 14;
  const pivotStrength = params.pivotStrength ?? 3;
  const lookback = params.lookback ?? 60;
  const minPivotGap = params.minPivotGap ?? 5;
  const side = params.side ?? 'bullish';
  const minPrice = params.minPrice ?? 0;

  const minBars = Math.max(period + 5, lookback + pivotStrength + 2);
  if (!candles || candles.length < minBars) {
    return { match: false, reason: 'insufficient_history' };
  }

  const closes = candles.map((c) => c.close);
  const rsiSeries = rsi(closes, period);
  const last = candles.length - 1;
  const windowStart = Math.max(0, last - lookback);

  // Pivots within the lookback window only (drop forward-incomplete pivots
  // near the right edge automatically because findPivots needs `strength`
  // bars on each side).
  const allPivots = findPivots(closes, pivotStrength).filter(
    (p) => p.index >= windowStart && p.index <= last - pivotStrength
  );

  const wantType = side === 'bearish' ? 'high' : 'low';
  const pivots = allPivots.filter((p) => p.type === wantType);
  if (pivots.length < 2) return { match: false, reason: 'not_enough_pivots' };

  // Take the two most recent pivots of the desired type, with minimum gap.
  let p2 = pivots[pivots.length - 1];
  let p1 = null;
  for (let i = pivots.length - 2; i >= 0; i--) {
    if (p2.index - pivots[i].index >= minPivotGap) {
      p1 = pivots[i];
      break;
    }
  }
  if (!p1) return { match: false, reason: 'pivots_too_close' };

  const priceA = p1.value;
  const priceB = p2.value;
  const rsiA = rsiSeries[p1.index];
  const rsiB = rsiSeries[p2.index];
  if (rsiA == null || rsiB == null) {
    return { match: false, reason: 'rsi_missing_at_pivot' };
  }

  const closeNow = closes[last];
  const rsiNow = rsiSeries[last];

  let divergence = false;
  let confirmed = false;
  if (side === 'bullish') {
    divergence = priceB < priceA && rsiB > rsiA;
    confirmed = divergence && closeNow > priceB && rsiNow > rsiB;
  } else if (side === 'bearish') {
    divergence = priceB > priceA && rsiB < rsiA;
    confirmed = divergence && closeNow < priceB && rsiNow < rsiB;
  } else {
    return { match: false, reason: 'invalid_side' };
  }

  const details = {
    side,
    close: closeNow,
    rsi: rsiNow,
    pivot1: { barsAgo: last - p1.index, price: priceA, rsi: rsiA },
    pivot2: { barsAgo: last - p2.index, price: priceB, rsi: rsiB },
    divergence,
    confirmed,
  };

  if (closeNow < minPrice) return { match: false, ...details };
  if (!divergence) return { match: false, ...details };
  if (!confirmed) return { match: false, ...details };

  return { match: true, ...details };
}

module.exports = { rsiDivergence };
