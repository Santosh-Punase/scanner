import { useState } from 'react';
import { api } from './api';
import { setSession } from './session';

export default function Login({ authRequired, onLogin }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await api.login(name.trim(), code);
      setSession({ token: r.token, name: r.name, isAdmin: r.isAdmin });
      onLogin?.();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-title">NSE Stock Scanner</div>
        <div className="login-sub">
          {authRequired
            ? 'Enter your name and the access code to continue.'
            : 'Enter your name to continue (auth disabled on this server).'}
        </div>

        <div className="field">
          <label>Your name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Santosh"
            required
          />
        </div>

        {authRequired && (
          <div className="field">
            <label>Access code</label>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Shared passcode"
              required
            />
          </div>
        )}

        {err && <div className="error" style={{ marginBottom: 12 }}>⚠ {err}</div>}

        <button type="submit" className="primary" style={{ width: '100%' }} disabled={busy}>
          {busy ? 'Signing in…' : 'Continue →'}
        </button>

        <div className="login-foot">
          Your name, IP and browser are logged for usage tracking.
          For research / education only.
        </div>
      </form>
    </div>
  );
}
