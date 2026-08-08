import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { format } from 'date-fns';
import { useMetricsHistoryCombined } from '../../hooks/useMetricsHistory';
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

const COLORS = {
  cpu: '#4f7be8',
  ram: '#a78bfa',
};

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
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>
        {typeof label === 'number' ? format(new Date(label), 'HH:mm:ss') : label}
      </div>
      {payload.map((entry: any) => (
        <div key={entry.name} style={{ color: entry.color, fontWeight: 600, fontFamily: 'JetBrains Mono', marginBottom: 2 }}>
          {entry.name.toUpperCase()}: {Number(entry.value).toFixed(2)}%
        </div>
      ))}
    </div>
  );
}

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  const [minutes, setMinutes] = useState(30);
  const { data, loading, error, refetch } = useMetricsHistoryCombined(node.node_id, minutes);

  const cpuStatus = node.cpu;
  const ramStatus = node.ram;

  return (
    <div className="card node-detail fade-in" id="node-detail-panel">
      {/* Header */}
      <div className="node-detail-header">
        <div>
          <h2 style={{ fontSize: '1rem', marginBottom: 4 }}>{node.node_id}</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {cpuStatus && `CPU ${(cpuStatus.last_value * 100).toFixed(1)}%`}
            {cpuStatus && ramStatus && '  ·  '}
            {ramStatus && `RAM ${(ramStatus.last_value * 100).toFixed(1)}%`}
            {(cpuStatus?.scenario || ramStatus?.scenario) &&
              `  —  ${cpuStatus?.scenario || ramStatus?.scenario}`}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
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
          <button className="btn btn-ghost btn-sm" onClick={refetch} id="btn-refresh-chart">↻ Refresh</button>
          <button className="btn btn-ghost btn-sm" onClick={onClose} id="btn-close-detail">✕ Close</button>
        </div>
      </div>

      {/* Combined CPU + RAM chart */}
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
              ticks={[0, 25, 55, 75, 100]}
              tick={(props) => {
                const { x, y, payload } = props;
                const v = payload.value;
                const color =
                  v === 55 ? 'var(--yellow)' :
                  v === 75 ? 'var(--red)'    :
                  'var(--text-muted)';
                return (
                  <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fill={color}>
                    {v}%
                  </text>
                );
              }}
              tickLine={false}
              axisLine={false}
              width={42}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '0.78rem', paddingTop: 8 }}
              formatter={(value) => value.toUpperCase()}
            />
            {/* Warning zone: subtle yellow background 55–75 */}
            <ReferenceArea y1={55} y2={75} fill="rgba(234,179,8,0.07)" ifOverflow="visible" />
            {/* Alert zone: subtle red background 75–100 */}
            <ReferenceArea y1={75} y2={100} fill="rgba(239,68,68,0.07)" ifOverflow="visible" />

            <Line
              type="monotone"
              dataKey="cpu"
              name="cpu"
              stroke={COLORS.cpu}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: COLORS.cpu, strokeWidth: 0 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="ram"
              name="ram"
              stroke={COLORS.ram}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: COLORS.ram, strokeWidth: 0 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
