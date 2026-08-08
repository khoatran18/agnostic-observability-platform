import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { StatusBadge } from '../components/shared/StatusBadge';
import { fetchAlertHistory } from '../api/client';
import type { AlertHistoryItem } from '../types';

const INTERVAL_OPTIONS = [
  { label: '5s',  value: 5_000 },
  { label: '15s', value: 15_000 },
  { label: '30s', value: 30_000 },
  { label: '1m',  value: 60_000 },
  { label: 'Off', value: 0 },
];

export function AlertHistoryPage() {
  const [history, setHistory]           = useState<AlertHistoryItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filterNode, setFilterNode]     = useState('');
  const [filterResource, setFilterResource] = useState('');
  const [filterLevel, setFilterLevel]   = useState('');
  const [limit, setLimit]               = useState(100);
  const [intervalMs, setIntervalMs]     = useState(0); // default Off
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAlertHistory(limit);
      setHistory(data);
    } finally {
      setLoading(false);
    }
  };

  // Reload when limit changes or on mount
  useEffect(() => { load(); }, [limit]);

  // Polling interval
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (intervalMs > 0) {
      timerRef.current = setInterval(load, intervalMs);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [intervalMs, limit]);

  const nodeIds = useMemo(
    () => Array.from(new Set(history.map(h => h.node_id))).sort(),
    [history],
  );

  const filtered = useMemo(() =>
    history.filter(h => {
      if (filterNode     && h.node_id       !== filterNode)     return false;
      if (filterResource && h.resource_type !== filterResource)  return false;
      if (filterLevel    && h.status_level  !== filterLevel)     return false;
      return true;
    }),
    [history, filterNode, filterResource, filterLevel],
  );

  return (
    <>
      {/* Custom TopBar with interval picker */}
      <header className="topbar">
        <span className="topbar-title">Alert History</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Auto-refresh:</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {INTERVAL_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  className={`range-btn${intervalMs === opt.value ? ' active' : ''}`}
                  onClick={() => setIntervalMs(opt.value)}
                  id={`hist-interval-${opt.label}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={load} id="btn-refresh-history">
            ↻ Refresh
          </button>
          <div className="topbar-status">
            {intervalMs > 0
              ? <><span className="live-dot" /><span>Live</span></>
              : <span style={{ color: 'var(--text-muted)' }}>⏸ Paused</span>
            }
          </div>
        </div>
      </header>

      <div className="page-content">

        {/* ── Filters — single horizontal row ── */}
        <div style={{
          display: 'flex',
          gap: 10,
          marginBottom: 20,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          {/* Node filter */}
          <select
            className="input"
            style={{ width: 'auto', minWidth: 150 }}
            value={filterNode}
            onChange={e => setFilterNode(e.target.value)}
            id="filter-node"
          >
            <option value="">All Nodes</option>
            {nodeIds.map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          {/* Resource filter */}
          <select
            className="input"
            style={{ width: 'auto', minWidth: 130 }}
            value={filterResource}
            onChange={e => setFilterResource(e.target.value)}
            id="filter-resource"
          >
            <option value="">All Resources</option>
            <option value="cpu">CPU</option>
            <option value="ram">RAM</option>
          </select>

          {/* Status filter */}
          <select
            className="input"
            style={{ width: 'auto', minWidth: 140 }}
            value={filterLevel}
            onChange={e => setFilterLevel(e.target.value)}
            id="filter-level"
          >
            <option value="">All Statuses</option>
            <option value="alert">🔴 Alert</option>
            <option value="warning">🟡 Warning</option>
            <option value="recovered">🟢 Recovered</option>
          </select>

          {/* Limit */}
          <select
            className="input"
            style={{ width: 'auto', minWidth: 110 }}
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            id="filter-limit"
          >
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
            <option value={200}>Last 200</option>
            <option value={500}>Last 500</option>
          </select>

          {/* Clear filters shortcut */}
          {(filterNode || filterResource || filterLevel) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setFilterNode(''); setFilterResource(''); setFilterLevel(''); }}
              id="btn-clear-filters"
            >
              ✕ Clear
            </button>
          )}

          {/* Record count badge */}
          <span style={{
            marginLeft: 'auto',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
          }}>
            {filtered.length}{history.length !== filtered.length ? ` / ${history.length}` : ''} records
          </span>
        </div>

        {/* ── Table ── */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 24 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} className="skeleton" style={{ height: 36, marginBottom: 8 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-center" style={{ height: 200, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No alert records found.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Node</th>
                    <th>Resource</th>
                    <th>Status</th>
                    <th>Value</th>
                    <th>Scenario</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <tr key={item.id} id={`alert-row-${item.id}`}>
                      <td className="font-mono text-xs text-muted">
                        {format(new Date(item.created_at), 'yyyy-MM-dd HH:mm:ss')}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.82rem', color: 'var(--accent)' }}>
                        {item.node_id}
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600,
                          background: item.resource_type === 'cpu' ? 'rgba(79,123,232,0.15)' : 'rgba(167,139,250,0.15)',
                          color: item.resource_type === 'cpu' ? 'var(--accent)' : '#a78bfa',
                          textTransform: 'uppercase',
                        }}>
                          {item.resource_type}
                        </span>
                      </td>
                      <td><StatusBadge level={item.status_level} /></td>
                      <td className="font-mono" style={{
                        fontWeight: 600,
                        color: item.status_level === 'alert' ? 'var(--red)'
                             : item.status_level === 'warning' ? 'var(--yellow)'
                             : 'var(--green)',
                      }}>
                        {(item.metric_value * 100).toFixed(2)}%
                      </td>
                      <td className="text-muted text-xs">{item.scenario}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
