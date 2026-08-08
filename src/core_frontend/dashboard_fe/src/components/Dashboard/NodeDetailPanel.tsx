import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { useMetricsHistory } from '../../hooks/useMetricsHistory';
import type { NodeSummary } from '../../types';

interface NodeDetailPanelProps {
  node: NodeSummary;
  onClose: () => void;
}

const RANGE_OPTIONS = [
  { label: '10m', minutes: 10 },
  { label: '30m', minutes: 30 },
  { label: '1h',  minutes: 60 },
  { label: '3h',  minutes: 180 },
];

type MetricTab = 'cpu' | 'ram';

const CHART_COLORS = {
  cpu: '#4f7be8',
  ram: '#a78bfa',
};

// Custom tooltip
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: any }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card-2)',
      border: '1px solid var(--border-2)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: '0.8rem',
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
        {typeof label === 'number' ? format(new Date(label), 'HH:mm:ss') : label}
      </div>
      <div style={{ color: payload[0].color, fontWeight: 600, fontFamily: 'JetBrains Mono' }}>
        {Number(payload[0].value).toFixed(2)}%
      </div>
    </div>
  );
}

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  const [tab, setTab] = useState<MetricTab>('cpu');
  const [minutes, setMinutes] = useState(30);

  const { data, loading, error, refetch } = useMetricsHistory(node.node_id, tab, minutes);

  const color = CHART_COLORS[tab];
  const currentStatus = tab === 'cpu' ? node.cpu : node.ram;

  return (
    <div className="card node-detail fade-in" id="node-detail-panel">
      {/* Header */}
      <div className="node-detail-header">
        <div>
          <h2 style={{ fontSize: '1rem', marginBottom: 4 }}>{node.node_id}</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {currentStatus
              ? `Current: ${(currentStatus.last_value * 100).toFixed(1)}% — ${currentStatus.scenario}`
              : 'No data available'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Range Selector */}
          <div className="range-selector">
            {RANGE_OPTIONS.map(r => (
              <button
                key={r.label}
                className={`range-btn${minutes === r.minutes ? ' active' : ''}`}
                onClick={() => setMinutes(r.minutes)}
                id={`range-btn-${r.label}`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button className="btn btn-ghost btn-sm" onClick={refetch} id="btn-refresh-chart">
            ↻ Refresh
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onClose} id="btn-close-detail">
            ✕ Close
          </button>
        </div>
      </div>

      {/* Metric Tabs */}
      <div className="chart-tabs" style={{ marginBottom: 16 }}>
        <button
          className={`chart-tab${tab === 'cpu' ? ' active' : ''}`}
          onClick={() => setTab('cpu')}
          id="tab-cpu"
        >
          CPU Usage
        </button>
        <button
          className={`chart-tab${tab === 'ram' ? ' active' : ''}`}
          onClick={() => setTab('ram')}
          id="tab-ram"
        >
          RAM Usage
        </button>
      </div>

      {/* Chart Area */}
      {loading ? (
        <div className="flex-center" style={{ height: 280 }}>
          <div className="spinner" />
          <span style={{ marginLeft: 12, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading chart data…</span>
        </div>
      ) : error ? (
        <div className="error-msg">{error}</div>
      ) : data.length === 0 ? (
        <div className="chart-empty">No metrics available for this time range</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              scale="time"
              tickFormatter={ts => format(new Date(ts), 'HH:mm')}
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={v => `${v}%`}
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              tickLine={false}
              axisLine={false}
              width={42}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Warning threshold line */}
            <ReferenceLine y={55} stroke="var(--yellow)" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'Warn', fill: 'var(--yellow)', fontSize: 10 }} />
            {/* Alert threshold line */}
            <ReferenceLine y={75} stroke="var(--red)" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'Alert', fill: 'var(--red)', fontSize: 10 }} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
