import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { getMeta } from './strategyMeta';
import { fmtNum, fmtInt, fmtCompact, toCsv, downloadCsv } from './format';
import { getUser, clearSession } from './session';
import Login from './Login';
import UsageDrawer from './UsageDrawer';

const UNIVERSE_PRESETS = [
  { value: 50,   label: 'Top 50 (fastest, ~10s)' },
  { value: 200,  label: 'Top 200 (~30s)' },
  { value: 500,  label: 'Top 500 (~1–2 min)' },
  { value: 2200, label: 'All NSE EQ (~3–6 min)' },
];

export default function App() {
  const [user, setUser] = useState(getUser());
  const [authRequired, setAuthRequired] = useState(false);
  const [showUsage, setShowUsage] = useState(false);
  const [health, setHealth] = useState(null);
  const [strategies, setStrategies] = useState([]);
  const [strategyKey, setStrategyKey] = useState('ma_crossover');
  const [params, setParams] = useState({});
  const [limit, setLimit] = useState(200);
  const [concurrency, setConcurrency] = useState(10);
  const [symbolsMode, setSymbolsMode] = useState('universe');
  const [symbols, setSymbols] = useState('');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [sort, setSort] = useState({ key: null, dir: 'desc' });

  const meta = useMemo(() => getMeta(strategyKey), [strategyKey]);
  const strategyDef = strategies.find((s) => s.key === strategyKey);

  useEffect(() => {
    api.health().then((h) => {
      setHealth(h);
      setAuthRequired(!!h.authRequired);
    }).catch(() => setHealth({ status: 'down' }));
  }, []);

  useEffect(() => {
    if (!user) return; // wait until logged in to call protected endpoints
    api.strategies().then((d) => {
      setStrategies(d.strategies);
      const first = d.strategies.find((s) => s.key === 'ma_crossover') || d.strategies[0];
      if (first) {
        setStrategyKey(first.key);
        setParams({ ...first.defaults });
      }
    }).catch((e) => console.warn('strategies failed:', e.message));
  }, [user]);

  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 100) / 10), 100);
    return () => clearInterval(id);
  }, [running]);

  function changeStrategy(key) {
    setStrategyKey(key);
    const s = strategies.find((x) => x.key === key);
    setParams(s ? { ...s.defaults } : {});
    setResult(null);
    setSort({ key: null, dir: 'desc' });
  }

  function applyPreset(preset) { setParams({ ...preset.params }); }
  function setParam(name, value) { setParams((p) => ({ ...p, [name]: value })); }

  async function runScan() {
    setRunning(true);
    setError(null);
    setResult(null);
    setSort({ key: null, dir: 'desc' });
    try {
      const body = {
        strategy: strategyKey,
        params,
        limit: Number(limit),
        concurrency: Number(concurrency),
      };
      if (symbolsMode === 'custom') {
        const list = symbols.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
        if (!list.length) throw new Error('Please enter at least one symbol, or switch to Universe mode.');
        body.symbols = list;
      }
      const r = await api.scan(body);
      setResult(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  function renderFields() {
    if (!strategyDef) return null;
    return Object.entries(strategyDef.defaults).map(([name, def]) => {
      const fmeta = meta.fields[name] || {};
      const label = fmeta.label || name;
      const help = fmeta.help;
      const val = params[name];

      if (fmeta.type === 'boolean' || typeof def === 'boolean') {
        return (
          <div className="field" key={name}>
            <label className="check">
              <input
                type="checkbox"
                checked={!!val}
                onChange={(e) => setParam(name, e.target.checked)}
              />
              <span>{label}</span>
            </label>
            {help && <div className="help">{help}</div>}
          </div>
        );
      }

      let control;
      if (fmeta.type === 'select') {
        control = (
          <select value={val ?? ''} onChange={(e) => setParam(name, e.target.value)}>
            {fmeta.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        );
      } else {
        const isNumber = typeof def === 'number';
        control = (
          <input
            type={isNumber ? 'number' : 'text'}
            value={val ?? ''}
            min={fmeta.min}
            max={fmeta.max}
            step={fmeta.step}
            onChange={(e) =>
              setParam(name, isNumber ? Number(e.target.value) : e.target.value)
            }
          />
        );
      }
      return (
        <div className="field" key={name}>
          <label>{label}</label>
          {control}
          {help && <div className="help">{help}</div>}
        </div>
      );
    });
  }

  return (
    <div className="app">
      {!user && (
        <Login authRequired={authRequired} onLogin={() => setUser(getUser())} />
      )}
      {showUsage && user?.isAdmin && (
        <UsageDrawer onClose={() => setShowUsage(false)} />
      )}
      <header>
        <div>
          <h1>NSE Stock Scanner</h1>
          <div className="subtitle">Scan Indian NSE equities with rule-based strategies</div>
        </div>
      <div className="disclaimer">
        ⚠ This is for research/education only. Not investment advice.
      </div>
        <div className="status">
          <span className={`dot ${health?.status === 'ok' ? 'good' : 'bad'}`} />
          backend {health?.status === 'ok' ? 'online' : 'offline'}
          {user && (
            <>
              <span style={{ marginLeft: 14, color: 'var(--text)' }}>
                👤 <strong>{user.name}</strong>
                {user.isAdmin && <span className="tag bullish" style={{ marginLeft: 6 }}>admin</span>}
              </span>
              {user.isAdmin && (
                <button
                  className="secondary"
                  style={{ marginLeft: 10, padding: '4px 10px', fontSize: 12 }}
                  onClick={() => setShowUsage(true)}
                >
                  Usage log
                </button>
              )}
              <button
                className="secondary"
                style={{ marginLeft: 6, padding: '4px 10px', fontSize: 12 }}
                onClick={() => { clearSession(); setUser(null); }}
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </header>

      <main>
        <aside className="panel">
          <h2>1. Choose strategy</h2>
          <div className="field">
            <select value={strategyKey} onChange={(e) => changeStrategy(e.target.value)}>
              {strategies.map((s) => (
                <option key={s.key} value={s.key}>{getMeta(s.key).title || s.key}</option>
              ))}
            </select>
            {meta.summary && <div className="help" style={{ marginTop: 8 }}>{meta.summary}</div>}
          </div>

          {meta.presets && meta.presets.length > 0 && (
            <div className="field">
              <label>Quick presets</label>
              <div className="presets">
                {meta.presets.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    className="chip"
                    onClick={() => applyPreset(p)}
                    title={JSON.stringify(p.params)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <h2>2. Parameters</h2>
          {renderFields()}

          <h2>3. Universe</h2>
          <div className="seg">
            <button
              type="button"
              className={symbolsMode === 'universe' ? 'on' : ''}
              onClick={() => setSymbolsMode('universe')}
            >
              All NSE
            </button>
            <button
              type="button"
              className={symbolsMode === 'custom' ? 'on' : ''}
              onClick={() => setSymbolsMode('custom')}
            >
              Specific symbols
            </button>
          </div>

          {symbolsMode === 'universe' ? (
            <>
              <div className="field" style={{ marginTop: 10 }}>
                <label>Scan how many?</label>
                <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                  {UNIVERSE_PRESETS.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
                <div className="help">
                  Bigger = slower. Yahoo Finance throttles requests, so larger scans take longer.
                </div>
              </div>
              <div className="field">
                <label>Parallel requests: {concurrency}</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={concurrency}
                  onChange={(e) => setConcurrency(Number(e.target.value))}
                />
                <div className="help">Higher = faster, but risk of rate-limit errors.</div>
              </div>
            </>
          ) : (
            <div className="field" style={{ marginTop: 10 }}>
              <label>Symbols (comma or space-separated)</label>
              <textarea
                rows="4"
                placeholder="RELIANCE, TCS, INFY, HDFCBANK"
                value={symbols}
                onChange={(e) => setSymbols(e.target.value)}
              />
              <div className="help">No suffix needed — .NS is added automatically.</div>
            </div>
          )}

          <button
            onClick={runScan}
            disabled={running || !strategyDef}
            className="primary"
            style={{ width: '100%', marginTop: 8 }}
          >
            {running ? `Scanning… ${elapsed.toFixed(1)}s` : '▶  Run scan'}
          </button>
        </aside>

        <section className="panel">
          <ResultsPanel
            running={running}
            elapsed={elapsed}
            result={result}
            error={error}
            strategyKey={strategyKey}
            sort={sort}
            setSort={setSort}
          />
        </section>
      </main>
    </div>
  );
}

function ResultsPanel({ running, elapsed, result, error, strategyKey, sort, setSort }) {
  if (error) {
    return (
      <>
        <h2>Results</h2>
        <div className="error">⚠ {error}</div>
      </>
    );
  }
  if (running && !result) {
    return (
      <>
        <h2>Results</h2>
        <div className="loading">
          <div className="spinner" />
          <div>
            <div><strong>Scanning NSE…</strong></div>
            <div className="help">Elapsed: {elapsed.toFixed(1)}s</div>
          </div>
        </div>
      </>
    );
  }
  if (!result) {
    return (
      <>
        <h2>Results</h2>
        <div className="empty">
          <div className="empty-icon">📊</div>
          <div><strong>No scan yet.</strong></div>
          <div className="help">Pick a strategy on the left, tweak parameters, then click <em>Run scan</em>.</div>
        </div>
      </>
    );
  }

  const columns = COLUMN_DEFS[strategyKey] || COLUMN_DEFS.__fallback;
  const rows = sortRows(result.results, columns, sort);

  return (
    <>
      <div className="results-header">
        <h2 style={{ margin: 0 }}>Results</h2>
        <button
          className="secondary"
          disabled={!rows.length}
          onClick={() => {
            const csv = toCsv(rows, columns);
            const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            downloadCsv(`scan-${strategyKey}-${ts}.csv`, csv);
          }}
        >
          ⬇ Export CSV
        </button>
      </div>

      <div className="stats">
        <Stat label="Matched" value={result.matched} highlight />
        <Stat label="Scanned" value={result.scanned} />
        <Stat label="Errors"  value={result.errored} />
        <Stat label="Time"    value={`${elapsed.toFixed(1)}s`} />
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🔍</div>
          <div><strong>No symbols matched.</strong></div>
          <div className="help">Try loosening parameters — e.g. higher lookback or lower volume multiplier.</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={`${c.align || ''} ${c.sortable === false ? '' : 'sortable'}`}
                    onClick={() => c.sortable !== false && toggleSort(setSort, sort, c.key)}
                  >
                    {c.label}
                    {sort.key === c.key && (sort.dir === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.symbol}>
                  {columns.map((c) => (
                    <td key={c.key} className={c.align || ''}>
                      {c.render ? c.render(r) : (typeof c.value === 'function' ? c.value(r) : r[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div className={`stat ${highlight ? 'hl' : ''}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function toggleSort(setSort, sort, key) {
  setSort((s) =>
    s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }
  );
}

function sortRows(rows, columns, sort) {
  if (!sort.key) return rows;
  const col = columns.find((c) => c.key === sort.key);
  if (!col) return rows;
  const get = col.sortValue || col.value || ((r) => r[sort.key]);
  const dir = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = get(a);
    const vb = get(b);
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
    return String(va).localeCompare(String(vb)) * dir;
  });
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
