import { getMeta } from '../strategyMeta';

const UNIVERSE_PRESETS = [
  { value: 50,   label: 'Top 50 (fastest, ~10s)' },
  { value: 200,  label: 'Top 200 (~30s)' },
  { value: 500,  label: 'Top 500 (~1–2 min)' },
  { value: 2200, label: 'All NSE EQ (~3–6 min)' },
];

const TIMEFRAMES = [
  { value: '1d',  label: 'Daily',   hint: 'positional / swing (recommended)' },
  { value: '1wk', label: 'Weekly',  hint: 'long-term trend' },
  { value: '1mo', label: 'Monthly', hint: 'investing horizon' },
];

export default function ScanForm({
  strategies,
  strategyKey,
  strategyDef,
  meta,
  params,
  setParam,
  changeStrategy,
  applyPreset,
  symbolsMode,
  setSymbolsMode,
  symbols,
  setSymbols,
  limit,
  setLimit,
  concurrency,
  setConcurrency,
  interval,
  setInterval,
  running,
  elapsed,
  onRun,
}) {
  return (
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
      <ParamFields strategyDef={strategyDef} meta={meta} params={params} setParam={setParam} />

      <h2>3. Timeframe</h2>
      <div className="field">
        <select value={interval} onChange={(e) => setInterval(e.target.value)}>
          {TIMEFRAMES.map((t) => (
            <option key={t.value} value={t.value}>{t.label} — {t.hint}</option>
          ))}
        </select>
        <div className="help">
          Choose the candle timeframe for the scan. Daily suits swing trades; weekly/monthly suit longer-term setups.
        </div>
      </div>

      <h2>4. Universe</h2>
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
        onClick={onRun}
        disabled={running || !strategyDef}
        className="primary"
        style={{ width: '100%', marginTop: 8 }}
      >
        {running ? `Scanning… ${elapsed.toFixed(1)}s` : '▶  Run scan'}
      </button>
    </aside>
  );
}

function ParamFields({ strategyDef, meta, params, setParam }) {
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
