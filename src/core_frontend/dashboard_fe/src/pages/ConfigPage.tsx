import { TopBar } from '../components/Layout/TopBar';
import { TargetsConfig } from '../components/Config/TargetsConfig';
import { StrategiesConfig } from '../components/Config/StrategiesConfig';
import { NotificationsConfig } from '../components/Config/NotificationsConfig';

export function ConfigPage() {
  return (
    <>
      <TopBar title="Configuration" isLive={false} />
      <div className="page-content">
        <div style={{ marginBottom: 8, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Manage monitored nodes, detection strategies, and alert channels.
        </div>
        <div className="config-grid" style={{ marginTop: 20 }}>
          <TargetsConfig />
          <StrategiesConfig />
          <NotificationsConfig />
        </div>
      </div>
    </>
  );
}
