/**
 * UI metadata for strategy parameters: human label, help text, input control.
 * Falls back to sensible defaults for any unknown param.
 */
export const STRATEGY_META = {
  ma_crossover: {
    title: 'Moving-Average Crossover',
    summary:
      'Find stocks where a fast moving average just crossed a slow one — the classic Golden Cross (bullish) or Death Cross (bearish) signal.',
    presets: [
      { name: 'Golden Cross 50/200', params: { fast: 50, slow: 200, lookback: 5, side: 'bullish' } },
      { name: 'Short-term 20/50', params: { fast: 20, slow: 50, lookback: 5, side: 'bullish' } },
      { name: 'Death Cross 50/200', params: { fast: 50, slow: 200, lookback: 5, side: 'bearish' } },
    ],
    fields: {
      fast:     { label: 'Fast MA period',  help: 'Shorter moving-average length (days).', min: 2 },
      slow:     { label: 'Slow MA period',  help: 'Longer moving-average length (days).',  min: 5 },
      lookback: { label: 'Lookback (bars)', help: 'How recent the crossover must be.',     min: 1, max: 60 },
      side:     { label: 'Direction',       help: 'Match bullish, bearish, or any cross.',
                  type: 'select', options: [
                    { value: 'bullish', label: 'Bullish (Golden)' },
                    { value: 'bearish', label: 'Bearish (Death)' },
                    { value: 'any',     label: 'Any direction' },
                  ] },
    },
  },
  ema_crossover: {
    title: 'EMA Crossover',
    summary:
      'Faster, more responsive cousin of the MA crossover. Optional EMA(200) trend filter only signals in the direction of the long-term trend, cutting whipsaws.',
    presets: [
      { name: 'Swing 20/50 (with trend)',  params: { fast: 20, slow: 50,  lookback: 3, side: 'bullish', trendFilter: true,  trendPeriod: 200 } },
      { name: 'Fast 9/21 (with trend)',    params: { fast: 9,  slow: 21,  lookback: 3, side: 'bullish', trendFilter: true,  trendPeriod: 200 } },
      { name: 'Positional 50/100',         params: { fast: 50, slow: 100, lookback: 5, side: 'bullish', trendFilter: true,  trendPeriod: 200 } },
      { name: 'Bearish 20/50',             params: { fast: 20, slow: 50,  lookback: 3, side: 'bearish', trendFilter: true,  trendPeriod: 200 } },
      { name: 'No trend filter',           params: { fast: 20, slow: 50,  lookback: 3, side: 'bullish', trendFilter: false, trendPeriod: 200 } },
    ],
    fields: {
      fast:        { label: 'Fast EMA period', help: 'Shorter EMA length.', min: 2 },
      slow:        { label: 'Slow EMA period', help: 'Longer EMA length.',  min: 5 },
      lookback:    { label: 'Lookback (bars)', help: 'How recent the crossover must be.', min: 1, max: 60 },
      side:        { label: 'Direction',       help: 'Match bullish, bearish, or any cross.',
                     type: 'select', options: [
                       { value: 'bullish', label: 'Bullish' },
                       { value: 'bearish', label: 'Bearish' },
                       { value: 'any',     label: 'Any direction' },
                     ] },
      trendFilter: { label: 'Trend filter (close vs long EMA)', help: 'Only signal long when close is above the trend EMA, and short when below.', type: 'boolean' },
      trendPeriod: { label: 'Trend EMA period', help: 'Long-term EMA used for the trend filter.', min: 20, max: 400 },
    },
  },
  volume_surge: {
    title: 'Volume Surge',
    summary:
      'Find stocks whose latest day volume is much higher than usual — often signals breakouts or news-driven moves.',
    presets: [
      { name: 'Mild surge (1.5×)',   params: { avgPeriod: 20, multiplier: 1.5, requirePositiveClose: true,  minPrice: 50 } },
      { name: 'Strong surge (2×)',   params: { avgPeriod: 20, multiplier: 2,   requirePositiveClose: true,  minPrice: 50 } },
      { name: 'Explosive (3×)',      params: { avgPeriod: 20, multiplier: 3,   requirePositiveClose: false, minPrice: 50 } },
    ],
    fields: {
      avgPeriod:            { label: 'Average over (days)', help: 'How many prior days to average volume across.', min: 5, max: 200 },
      multiplier:           { label: 'Volume multiplier',   help: "Today's volume must be at least this many × the average.", min: 1, step: 0.1 },
      requirePositiveClose: { label: 'Only bullish bars',   help: 'Require close above open (green candle).', type: 'boolean' },
      minPrice:             { label: 'Minimum price (₹)',   help: 'Skip penny stocks below this price.', min: 0 },
    },
  },
  rsi_breakout: {
    title: 'RSI Breakout',
    summary:
      'Find stocks where momentum (RSI) crosses above a threshold AND price breaks out above its recent high — high-quality bullish setups.',
    presets: [
      { name: 'Momentum kick (RSI > 50)',  params: { period: 14, rsiThreshold: 50, lookback: 3, priceBreakoutPeriod: 20, minPrice: 50 } },
      { name: 'Oversold reversal (RSI > 30)', params: { period: 14, rsiThreshold: 30, lookback: 5, priceBreakoutPeriod: 10, minPrice: 50 } },
      { name: 'Strong breakout (RSI > 60)',   params: { period: 14, rsiThreshold: 60, lookback: 3, priceBreakoutPeriod: 50, minPrice: 50 } },
      { name: 'RSI only (no price filter)',   params: { period: 14, rsiThreshold: 50, lookback: 3, priceBreakoutPeriod: 0,  minPrice: 50 } },
    ],
    fields: {
      period:              { label: 'RSI period',            help: 'Lookback length for RSI (Wilder).', min: 2, max: 100 },
      rsiThreshold:        { label: 'RSI cross above',       help: 'RSI must cross from below to above this level. 30=oversold, 50=momentum, 70=strength.', min: 1, max: 99 },
      lookback:            { label: 'Cross lookback (bars)', help: 'How recent the RSI cross must be.', min: 1, max: 30 },
      priceBreakoutPeriod: { label: 'Price breakout (days)', help: 'Close must exceed prior N-day high. Set 0 to disable.', min: 0, max: 252 },
      minPrice:            { label: 'Minimum price (₹)',     help: 'Skip penny stocks below this price.', min: 0 },
    },
  },
  rsi_divergence: {
    title: 'RSI Divergence + Confirmation',
    summary:
      'Detects classic regular divergence between price and RSI on recent swing pivots, then waits for a confirmation candle before signalling — a high-probability reversal setup.',
    presets: [
      { name: 'Bullish reversal',          params: { period: 14, pivotStrength: 3, lookback: 60, minPivotGap: 5, side: 'bullish', minPrice: 50 } },
      { name: 'Bearish reversal',          params: { period: 14, pivotStrength: 3, lookback: 60, minPivotGap: 5, side: 'bearish', minPrice: 50 } },
      { name: 'Sensitive (short-term)',    params: { period: 14, pivotStrength: 2, lookback: 30, minPivotGap: 3, side: 'bullish', minPrice: 50 } },
      { name: 'Strict (longer swings)',    params: { period: 14, pivotStrength: 5, lookback: 90, minPivotGap: 8, side: 'bullish', minPrice: 50 } },
    ],
    fields: {
      period:        { label: 'RSI period',          help: "Wilder's RSI lookback length.", min: 2, max: 100 },
      pivotStrength: { label: 'Pivot strength',      help: 'Bars on each side a pivot must dominate. Higher = fewer but cleaner pivots.', min: 1, max: 10 },
      lookback:      { label: 'Search window (days)', help: 'How far back to look for pivots.', min: 10, max: 252 },
      minPivotGap:   { label: 'Min pivot gap (bars)', help: 'Minimum bars between the two compared pivots.', min: 2, max: 50 },
      side:          { label: 'Direction',           help: 'Bullish (price ↓ + RSI ↑) or bearish (price ↑ + RSI ↓).',
                       type: 'select', options: [
                         { value: 'bullish', label: 'Bullish (reversal up)' },
                         { value: 'bearish', label: 'Bearish (reversal down)' },
                       ] },
      minPrice:      { label: 'Minimum price (₹)',   help: 'Skip penny stocks below this price.', min: 0 },
    },
  },
};

export function getMeta(key) {
  return STRATEGY_META[key] || { title: key, summary: '', fields: {}, presets: [] };
}
