interface TopBarProps {
  title: string;
  isLive?: boolean;
  lastUpdated?: string;
}

export function TopBar({ title, isLive = true, lastUpdated }: TopBarProps) {
  return (
    <header className="topbar">
      <span className="topbar-title">{title}</span>
      <div className="topbar-status">
        {isLive && (
          <>
            <span className="live-dot" style={{ color: 'var(--green)' }} />
            <span>Live</span>
          </>
        )}
        {lastUpdated && (
          <span style={{ color: 'var(--text-muted)' }}>
            Updated {lastUpdated}
          </span>
        )}
      </div>
    </header>
  );
}
