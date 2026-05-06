export default function Header({ health, user, onShowUsage, onSignOut }) {
  return (
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
        server {health?.status === 'ok' ? 'online' : 'offline'}
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
                onClick={onShowUsage}
              >
                Usage log
              </button>
            )}
            <button
              className="secondary"
              style={{ marginLeft: 6, padding: '4px 10px', fontSize: 12 }}
              onClick={onSignOut}
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </header>
  );
}
