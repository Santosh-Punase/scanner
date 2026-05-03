import { useEffect, useState } from 'react';
import { api } from './api';

export default function UsageDrawer({ onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.usage(500)
      .then((d) => setEntries(d.entries))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h2 style={{ margin: 0 }}>Usage Log</h2>
          <button className="secondary" onClick={onClose}>Close</button>
        </div>
        {loading && <div className="muted">Loading…</div>}
        {err && <div className="error">⚠ {err}</div>}
        {!loading && !err && (
          <div className="table-wrap" style={{ maxHeight: 'calc(100vh - 140px)' }}>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>IP</th>
                  <th>Device</th>
                  <th>Endpoint</th>
                  <th>Strategy</th>
                  <th className="right">Matched</th>
                  <th className="right">ms</th>
                  <th className="right">Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={i}>
                    <td className="mono" style={{ fontSize: 11 }}>{new Date(e.t).toLocaleString()}</td>
                    <td><strong>{e.user}</strong></td>
                    <td className="mono" style={{ fontSize: 12 }}>{e.ip}</td>
                    <td style={{ fontSize: 12 }}>
                      {e.ua?.browser} · {e.ua?.os} · {e.ua?.device}
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>{e.method} {e.path}</td>
                    <td>{e.strategy || <span className="muted">—</span>}</td>
                    <td className="right mono">{e.matched ?? '—'}</td>
                    <td className="right mono">{e.ms}</td>
                    <td className="right mono">
                      <span className={`tag ${e.status < 400 ? 'bullish' : 'bearish'}`}>{e.status}</span>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr><td colSpan="9" className="muted" style={{ padding: 20, textAlign: 'center' }}>No activity yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
