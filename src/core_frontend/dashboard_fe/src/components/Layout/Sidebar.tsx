interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'config',    label: 'Configuration', icon: '⚙️' },
  { id: 'history',   label: 'Alert History', icon: '🕐' },
];

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>⬡ ObservePlatform</h1>
        <p>Infrastructure Monitor</p>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nav-item${activePage === item.id ? ' active' : ''}`}
            onClick={() => onNavigate(item.id)}
            id={`nav-${item.id}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div>Agnostic Observability</div>
        <div style={{ marginTop: 2 }}>Platform v1.0.0</div>
      </div>
    </aside>
  );
}
