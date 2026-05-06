import { fmtNum, fmtInt, fmtCompact } from './format';

function smaValue(r, idx) {
  const keys = Object.keys(r).filter((k) => /^sma\d+$/.test(k))
    .sort((a, b) => Number(a.slice(3)) - Number(b.slice(3)));
  return r[keys[idx]];
}

function rsiClass(v) {
  if (v == null) return '';
  if (v >= 70) return 'rsi-hot';
  if (v <= 30) return 'rsi-cold';
  return '';
}

const COLUMN_DEFS = {
  ma_crossover: [
    { key: 'symbol', label: 'Symbol', render: (r) => <strong>{r.symbol}</strong>, sortValue: (r) => r.symbol },
    { key: 'close',  label: 'Close',  align: 'right', render: (r) => <span className="mono">{fmtNum(r.close)}</span>, sortValue: (r) => r.close },
    { key: 'fast',   label: 'Fast SMA', align: 'right',
      value: (r) => smaValue(r, 0),
      render: (r) => <span className="mono">{fmtNum(smaValue(r, 0))}</span>,
      sortValue: (r) => smaValue(r, 0) },
    { key: 'slow',   label: 'Slow SMA', align: 'right',
      value: (r) => smaValue(r, 1),
      render: (r) => <span className="mono">{fmtNum(smaValue(r, 1))}</span>,
      sortValue: (r) => smaValue(r, 1) },
    { key: 'crossover', label: 'Signal',
      render: (r) => <span className={`tag ${r.crossover}`}>{r.crossover}</span>,
      sortValue: (r) => r.crossover },
    { key: 'barsAgo', label: 'Bars Ago', align: 'right',
      render: (r) => <span className="mono">{r.barsAgo}</span>,
      sortValue: (r) => r.barsAgo },
    { key: 'chart', label: '', sortable: false,
      render: (r) => <a className="link" href={`https://www.tradingview.com/chart/?symbol=NSE:${r.symbol}`} target="_blank" rel="noreferrer">chart ↗</a> },
  ],
  volume_surge: [
    { key: 'symbol', label: 'Symbol', render: (r) => <strong>{r.symbol}</strong>, sortValue: (r) => r.symbol },
    { key: 'close',  label: 'Close',  align: 'right', render: (r) => <span className="mono">₹{fmtNum(r.close)}</span>, sortValue: (r) => r.close },
    { key: 'volume', label: "Today's Vol", align: 'right',
      render: (r) => <span className="mono" title={fmtInt(r.volume)}>{fmtCompact(r.volume)}</span>,
      sortValue: (r) => r.volume },
    { key: 'avgVolume', label: 'Avg Vol', align: 'right',
      render: (r) => <span className="mono" title={fmtInt(Math.round(r.avgVolume))}>{fmtCompact(r.avgVolume)}</span>,
      sortValue: (r) => r.avgVolume },
    { key: 'ratio', label: '× Avg', align: 'right',
      render: (r) => <span className="mono"><strong>{fmtNum(r.ratio, 2)}×</strong></span>,
      sortValue: (r) => r.ratio },
    { key: 'positiveClose', label: 'Bar',
      render: (r) => <span className={`tag ${r.positiveClose ? 'bullish' : 'bearish'}`}>{r.positiveClose ? '▲ up' : '▼ down'}</span>,
      sortValue: (r) => (r.positiveClose ? 1 : 0) },
    { key: 'chart', label: '', sortable: false,
      render: (r) => <a className="link" href={`https://www.tradingview.com/chart/?symbol=NSE:${r.symbol}`} target="_blank" rel="noreferrer">chart ↗</a> },
  ],
  rsi_breakout: [
    { key: 'symbol', label: 'Symbol', render: (r) => <strong>{r.symbol}</strong>, sortValue: (r) => r.symbol },
    { key: 'close',  label: 'Close',  align: 'right',
      render: (r) => <span className="mono">₹{fmtNum(r.close)}</span>, sortValue: (r) => r.close },
    { key: 'rsi',    label: 'RSI',    align: 'right',
      render: (r) => <span className={`mono ${rsiClass(r.rsi)}`}>{fmtNum(r.rsi, 1)}</span>,
      sortValue: (r) => r.rsi },
    { key: 'rsiThreshold', label: 'Threshold', align: 'right',
      render: (r) => <span className="mono">{r.rsiThreshold}</span>,
      sortValue: (r) => r.rsiThreshold },
    { key: 'rsiCrossBarsAgo', label: 'Crossed', align: 'right',
      render: (r) => <span className="mono">{r.rsiCrossBarsAgo} bar{r.rsiCrossBarsAgo === 1 ? '' : 's'} ago</span>,
      sortValue: (r) => r.rsiCrossBarsAgo },
    { key: 'priorHigh', label: 'Prior High', align: 'right',
      render: (r) => r.priorHigh != null ? <span className="mono">₹{fmtNum(r.priorHigh)}</span> : <span className="muted">—</span>,
      sortValue: (r) => r.priorHigh },
    { key: 'priceBreakout', label: 'Breakout',
      render: (r) => <span className={`tag ${r.priceBreakout ? 'bullish' : 'bearish'}`}>{r.priceBreakout ? '▲ yes' : 'no'}</span>,
      sortValue: (r) => (r.priceBreakout ? 1 : 0) },
    { key: 'chart', label: '', sortable: false,
      render: (r) => <a className="link" href={`https://www.tradingview.com/chart/?symbol=NSE:${r.symbol}`} target="_blank" rel="noreferrer">chart ↗</a> },
  ],
  rsi_divergence: [
    { key: 'symbol', label: 'Symbol', render: (r) => <strong>{r.symbol}</strong>, sortValue: (r) => r.symbol },
    { key: 'side', label: 'Side',
      render: (r) => <span className={`tag ${r.side === 'bearish' ? 'bearish' : 'bullish'}`}>{r.side === 'bearish' ? '▼ bearish' : '▲ bullish'}</span>,
      sortValue: (r) => r.side },
    { key: 'close', label: 'Close', align: 'right',
      render: (r) => <span className="mono">₹{fmtNum(r.close)}</span>, sortValue: (r) => r.close },
    { key: 'rsi', label: 'RSI', align: 'right',
      render: (r) => <span className={`mono ${rsiClass(r.rsi)}`}>{fmtNum(r.rsi, 1)}</span>,
      sortValue: (r) => r.rsi },
    { key: 'pivot1', label: 'Pivot 1', align: 'right',
      render: (r) => <span className="mono muted">₹{fmtNum(r.pivot1?.price)} · RSI {fmtNum(r.pivot1?.rsi, 1)} · {r.pivot1?.barsAgo}b</span>,
      sortValue: (r) => r.pivot1?.barsAgo },
    { key: 'pivot2', label: 'Pivot 2', align: 'right',
      render: (r) => <span className="mono">₹{fmtNum(r.pivot2?.price)} · RSI {fmtNum(r.pivot2?.rsi, 1)} · {r.pivot2?.barsAgo}b</span>,
      sortValue: (r) => r.pivot2?.barsAgo },
    { key: 'confirmed', label: 'Confirmed',
      render: (r) => <span className={`tag ${r.confirmed ? 'bullish' : 'bearish'}`}>{r.confirmed ? '✓ yes' : 'no'}</span>,
      sortValue: (r) => (r.confirmed ? 1 : 0) },
    { key: 'chart', label: '', sortable: false,
      render: (r) => <a className="link" href={`https://www.tradingview.com/chart/?symbol=NSE:${r.symbol}`} target="_blank" rel="noreferrer">chart ↗</a> },
  ],
  __fallback: [
    { key: 'symbol', label: 'Symbol', render: (r) => <strong>{r.symbol}</strong> },
    { key: 'json',   label: 'Details', sortable: false,
      render: (r) => <code className="mono">{JSON.stringify(r)}</code> },
  ],
};

export { COLUMN_DEFS, smaValue, rsiClass };
