const { maCrossover } = require('./maCrossover');
const { emaCrossover } = require('./emaCrossover');
const { volumeSurge } = require('./volumeSurge');
const { rsiBreakout } = require('./rsiBreakout');
const { rsiDivergence } = require('./rsiDivergence');

/**
 * Registry of available strategies. Each entry exposes:
 *  - run(candles, params)          -> { match, ...details }
 *  - minHistoryDays(params)        -> minimum days of OHLC needed
 *  - defaults                      -> default param object (for UI / docs)
 */
const STRATEGIES = {
  ma_crossover: {
    run: maCrossover,
    defaults: { fast: 50, slow: 200, lookback: 3, side: 'bullish' },
    minHistoryDays: (p = {}) => (p.slow ?? 200) + 30,
    description:
      'Moving-average crossover (Golden / Death cross). Matches when SMA(fast) ' +
      'crosses SMA(slow) within `lookback` bars in the requested direction.',
  },
  ema_crossover: {
    run: emaCrossover,
    defaults: {
      fast: 20,
      slow: 50,
      lookback: 3,
      side: 'bullish',
      trendFilter: true,
      trendPeriod: 200,
    },
    minHistoryDays: (p = {}) =>
      Math.max(p.slow ?? 50, p.trendFilter === false ? 0 : (p.trendPeriod ?? 200)) + 30,
    description:
      'EMA crossover with optional long-term trend filter. Faster and more ' +
      'responsive than SMA; the trend filter (close vs EMA200) avoids whipsaws.',
  },
  volume_surge: {
    run: volumeSurge,
    defaults: {
      avgPeriod: 20,
      multiplier: 2,
      requirePositiveClose: true,
      minPrice: 0,
    },
    minHistoryDays: (p = {}) => (p.avgPeriod ?? 20) + 10,
    description:
      'Latest-day volume >= multiplier x avg volume. Optional positive-close filter.',
  },
  rsi_breakout: {
    run: rsiBreakout,
    defaults: {
      period: 14,
      rsiThreshold: 50,
      lookback: 3,
      priceBreakoutPeriod: 20,
      minPrice: 0,
    },
    minHistoryDays: (p = {}) =>
      Math.max((p.period ?? 14) + 30, (p.priceBreakoutPeriod ?? 20) + 30),
    description:
      'RSI crosses above threshold AND price breaks out above its prior N-day high. ' +
      'Combines momentum + price confirmation for high-quality breakouts.',
  },
  rsi_divergence: {
    run: rsiDivergence,
    defaults: {
      period: 14,
      pivotStrength: 3,
      lookback: 60,
      minPivotGap: 5,
      side: 'bullish',
      minPrice: 0,
    },
    minHistoryDays: (p = {}) =>
      Math.max((p.period ?? 14) + 30, (p.lookback ?? 60) + 30),
    description:
      'Classic regular RSI divergence between price and RSI on recent swing pivots, ' +
      'plus a confirmation candle (price closes beyond the latest pivot in the ' +
      'signal direction with RSI confirming).',
  },
};

function listStrategies() {
  return Object.entries(STRATEGIES).map(([key, s]) => ({
    key,
    description: s.description,
    defaults: s.defaults,
  }));
}

function getStrategy(key) {
  return STRATEGIES[key] || null;
}

module.exports = { STRATEGIES, listStrategies, getStrategy };
