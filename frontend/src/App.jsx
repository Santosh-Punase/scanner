import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { getMeta } from './strategyMeta';
import { getUser, clearSession } from './session';
import Login from './Login';
import UsageDrawer from './UsageDrawer';
import Header from './components/Header';
import ScanForm from './components/ScanForm';
import ResultsPanel from './components/ResultsPanel';

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
  const [interval, setInterval_] = useState('1d');
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
        interval,
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

  return (
    <div className="app">
      {!user && (
        <Login authRequired={authRequired} onLogin={() => setUser(getUser())} />
      )}
      {showUsage && user?.isAdmin && (
        <UsageDrawer onClose={() => setShowUsage(false)} />
      )}

      <Header
        health={health}
        user={user}
        onShowUsage={() => setShowUsage(true)}
        onSignOut={() => { clearSession(); setUser(null); }}
      />

      <main>
        <ScanForm
          strategies={strategies}
          strategyKey={strategyKey}
          strategyDef={strategyDef}
          meta={meta}
          params={params}
          setParam={setParam}
          changeStrategy={changeStrategy}
          applyPreset={applyPreset}
          symbolsMode={symbolsMode}
          setSymbolsMode={setSymbolsMode}
          symbols={symbols}
          setSymbols={setSymbols}
          limit={limit}
          setLimit={setLimit}
          concurrency={concurrency}
          setConcurrency={setConcurrency}
          interval={interval}
          setInterval={setInterval_}
          running={running}
          elapsed={elapsed}
          onRun={runScan}
        />

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
