/**
 * Lightweight technical indicator helpers operating on plain number arrays.
 * All functions return arrays aligned with input length; positions where the
 * indicator is undefined contain `null`.
 */

function sma(values, period) {  const out = new Array(values.length).fill(null);
  if (period <= 0) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/**
 * Wilder's RSI. Returns array aligned with `closes`, with nulls before
 * `period` bars of warm-up.
 */
function rsi(closes, period = 14) {
  const out = new Array(closes.length).fill(null);
  if (closes.length <= period) return out;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gainSum += diff;
    else lossSum -= diff;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

/**
 * Rolling maximum of the prior `period` values (excluding the current bar).
 */
function rollingMaxPrior(values, period) {
  const out = new Array(values.length).fill(null);
  for (let i = period; i < values.length; i++) {
    let max = -Infinity;
    for (let j = i - period; j < i; j++) {
      if (values[j] != null && values[j] > max) max = values[j];
    }
    out[i] = max === -Infinity ? null : max;
  }
  return out;
}

/**
 * Detect the most recent crossover between two aligned series within the last
 * `lookback` bars. Returns { type: 'bullish'|'bearish'|'none', barsAgo }.
 *
 * Bullish: fast crossed from <= slow to > slow.
 * Bearish: fast crossed from >= slow to < slow.
 */
function lastCrossover(fast, slow, lookback = 5) {
  const n = Math.min(fast.length, slow.length);
  for (let i = n - 1; i >= Math.max(1, n - lookback); i--) {
    const f = fast[i];
    const s = slow[i];
    const fp = fast[i - 1];
    const sp = slow[i - 1];
    if (f == null || s == null || fp == null || sp == null) continue;
    if (fp <= sp && f > s) return { type: 'bullish', barsAgo: n - 1 - i };
    if (fp >= sp && f < s) return { type: 'bearish', barsAgo: n - 1 - i };
  }
  return { type: 'none', barsAgo: null };
}

module.exports = { sma, rsi, rollingMaxPrior, lastCrossover };
