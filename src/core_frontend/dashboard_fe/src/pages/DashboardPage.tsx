import { useEffect, useRef, useState } from 'react';
import { ClusterOverview } from '../components/Dashboard/ClusterOverview';
import { NodeGrid } from '../components/Dashboard/NodeGrid';
import { NodeDetailPanel } from '../components/Dashboard/NodeDetailPanel';
import { useNodesStatus } from '../hooks/useNodesStatus';
import { format } from 'date-fns';
import type { NodeSummary } from '../types';

const INTERVAL_OPTIONS = [
  { label: '3s',  value: 3_000 },
  { label: '5s',  value: 5_000 },
  { label: '10s', value: 10_000 },
  { label: '30s', value: 30_000 },
  { label: '1m',  value: 60_000 },
  { label: 'Off', value: 0 },
];

export function DashboardPage() {
  const [intervalMs, setIntervalMs] = useState(5_000);
  const { nodes, loading, error, refetch } = useNodesStatus(intervalMs);
  const [selectedNode, setSelectedNode] = useState<NodeSummary | null>(null);
  const [lastUpdated, setLastUpdated] = useState(format(new Date(), 'HH:mm:ss'));
  const [countdown, setCountdown] = useState(intervalMs / 1000);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Every time nodes data arrives → update timestamp + sync selected node
  useEffect(() => {
    setLastUpdated(format(new Date(), 'HH:mm:ss'));
    setCountdown(intervalMs / 1000); // reset countdown
    if (!selectedNode) return;
    const updated = nodes.find(n => n.node_id === selectedNode.node_id);
    if (updated) setSelectedNode(updated);
  }, [nodes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown ticker — decrements every second
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (intervalMs <= 0) { setCountdown(0); return; }
    setCountdown(intervalMs / 1000);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? intervalMs / 1000 : prev - 1));
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [intervalMs]);

  const handleSelectNode = (nodeId: string) => {
    const node = nodes.find(n => n.node_id === nodeId) ?? null;
    if (selectedNode?.node_id === nodeId) {
      setSelectedNode(null);
    } else {
      setSelectedNode(node);
      setTimeout(() => {
        document.getElementById('node-detail-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleManualRefresh = async () => {
    await refetch();
    setLastUpdated(format(new Date(), 'HH:mm:ss'));
    setCountdown(intervalMs / 1000);
  };

  return (
    <>
      {/* ── Custom TopBar with interval picker ── */}
      <header className="topbar">
        <span className="topbar-title">Dashboard</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Interval selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Auto-refresh:</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {INTERVAL_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  className={`range-btn${intervalMs === opt.value ? ' active' : ''}`}
                  onClick={() => setIntervalMs(opt.value)}
                  id={`interval-btn-${opt.label}`}
                  title={opt.value === 0 ? 'Disable auto-refresh' : `Refresh every ${opt.label}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Manual refresh */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleManualRefresh}
            id="btn-manual-refresh"
            style={{ gap: 6 }}
          >
            ↻ Refresh
          </button>

          {/* Live / Paused indicator + countdown */}
          <div className="topbar-status">
            {intervalMs > 0 ? (
              <>
                <span className="live-dot" />
                <span>Live</span>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.75rem',
                  color: countdown <= 2 ? 'var(--accent)' : 'var(--text-muted)',
                  transition: 'color 0.3s',
                  minWidth: 28,
                }}>
                  -{countdown}s
                </span>
              </>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>⏸ Paused</span>
            )}
            <span style={{ color: 'var(--text-muted)' }}>Updated {lastUpdated}</span>
          </div>
        </div>
      </header>

      <div className="page-content">
        {error && <div className="error-msg mb-3">⚠ Cannot reach backend: {error}</div>}

        {/* Tier 1 */}
        <ClusterOverview nodes={nodes} loading={loading} />

        {/* Tier 2 */}
        <NodeGrid
          nodes={nodes}
          selectedNodeId={selectedNode?.node_id ?? null}
          onSelectNode={handleSelectNode}
          loading={loading}
        />

        {/* Tier 3 */}
        {selectedNode && (
          <NodeDetailPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </>
  );
}
