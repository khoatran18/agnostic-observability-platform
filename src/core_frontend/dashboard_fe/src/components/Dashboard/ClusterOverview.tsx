import type { NodeSummary } from '../../types';

interface ClusterOverviewProps {
  nodes: NodeSummary[];
  loading: boolean;
}

export function ClusterOverview({ nodes, loading }: ClusterOverviewProps) {
  const total = nodes.length;
  const online = nodes.filter(n => n.is_online).length;
  const offline = total - online;
  const alertCount   = nodes.filter(n => n.overall_status === 'alert').length;
  const warningCount = nodes.filter(n => n.overall_status === 'warning').length;

  const avgCpu = total === 0 ? 0 : Math.round(
    nodes.reduce((sum, n) => sum + (n.cpu ? n.cpu.last_value * 100 : 0), 0) / total
  );
  const avgRam = total === 0 ? 0 : Math.round(
    nodes.reduce((sum, n) => sum + (n.ram ? n.ram.last_value * 100 : 0), 0) / total
  );

  const cards = [
    { label: 'Total Nodes', value: total, cls: 'accent', sub: 'monitored' },
    { label: 'Online',  value: online,  cls: 'green',  sub: 'nodes active' },
    { label: 'Offline', value: offline, cls: 'gray',   sub: 'nodes down' },
    { label: 'Avg CPU', value: `${avgCpu}%`, cls: avgCpu >= 75 ? 'red' : avgCpu >= 55 ? 'yellow' : 'green', sub: 'cluster average' },
    { label: 'Avg RAM', value: `${avgRam}%`, cls: avgRam >= 75 ? 'red' : avgRam >= 55 ? 'yellow' : 'green', sub: 'cluster average' },
    { label: 'Warning', value: warningCount, cls: 'yellow', sub: 'nodes at risk' },
    { label: 'Alert',   value: alertCount,   cls: 'red',    sub: 'nodes critical' },
  ];

  return (
    <div>
      <div className="section-title">Cluster Overview</div>
      <div className="summary-grid">
        {cards.map(c => (
          <div key={c.label} className={`card summary-card ${c.cls} fade-in`}>
            <div className="summary-label">{c.label}</div>
            {loading
              ? <div className="skeleton" style={{ height: 40, borderRadius: 8 }} />
              : <div className={`summary-value ${c.cls}`}>{c.value}</div>
            }
            <div className="summary-sub">{c.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
