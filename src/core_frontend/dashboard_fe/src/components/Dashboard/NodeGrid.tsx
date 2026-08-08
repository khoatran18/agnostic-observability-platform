import type { NodeSummary } from '../../types';
import { StatusBadge, barClass } from '../shared/StatusBadge';

interface NodeGridProps {
  nodes: NodeSummary[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  loading: boolean;
}

function MetricBar({ label, pct }: { label: string; pct: number | undefined }) {
  const value = pct ?? 0;
  const cls = barClass(value);
  return (
    <div className="metric-row">
      <span className="metric-label">{label}</span>
      <div className="metric-bar">
        <div className={`metric-fill ${cls}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className={`metric-pct text-${cls}`}>{pct !== undefined ? `${value.toFixed(1)}%` : '—'}</span>
    </div>
  );
}

export function NodeGrid({ nodes, selectedNodeId, onSelectNode, loading }: NodeGridProps) {
  if (loading && nodes.length === 0) {
    return (
      <div>
        <div className="section-title">Node Health</div>
        <div className="node-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="node-card">
              <div className="skeleton" style={{ height: 22, width: '60%', marginBottom: 14 }} />
              <div className="skeleton" style={{ height: 10, marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 10 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div>
        <div className="section-title">Node Health</div>
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
          No nodes monitored yet. Add targets in <strong>Configuration</strong>.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-title">Node Health — click to drill-down</div>
      <div className="node-grid">
        {nodes.map(node => {
          const cpuPct = node.cpu ? node.cpu.last_value * 100 : undefined;
          const ramPct = node.ram ? node.ram.last_value * 100 : undefined;
          const isSelected = node.node_id === selectedNodeId;

          return (
            <div
              key={node.node_id}
              className={`node-card fade-in${isSelected ? ' selected' : ''}`}
              onClick={() => onSelectNode(node.node_id)}
              id={`node-card-${node.node_id.replace(/[^a-zA-Z0-9]/g, '-')}`}
            >
              <div className="node-card-header">
                <span className="node-name">{node.node_id}</span>
                <StatusBadge level={node.overall_status} />
              </div>
              <div className="node-metrics">
                <MetricBar label="CPU" pct={cpuPct} />
                <MetricBar label="RAM" pct={ramPct} />
              </div>
              {(node.cpu?.scenario || node.ram?.scenario) && (
                <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {node.cpu?.scenario || node.ram?.scenario}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
