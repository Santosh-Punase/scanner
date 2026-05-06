import { toCsv, downloadCsv } from '../format';
import { COLUMN_DEFS } from '../resultsColumns';

export default function ResultsPanel({ running, elapsed, result, error, strategyKey, sort, setSort }) {
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
