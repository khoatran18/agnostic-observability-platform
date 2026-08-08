import { useEffect, useState } from 'react';
import { fetchNotifications, updateNotification } from '../../api/client';
import type { NotificationChannel } from '../../types';

const CHANNEL_ICONS: Record<string, string> = {
  telegram: '✈️',
  webhook:  '🔗',
  gmail:    '📧',
};

const FIELD_LABELS: Record<string, string> = {
  bot_token:    'Bot Token',
  chat_id:      'Chat ID',
  url:          'Webhook URL',
  secret:       'Secret',
  smtp_server:  'SMTP Server',
  port:         'Port',
  sender_email: 'Sender Email',
  password:     'App Password',
  recipient:    'Recipient Email',
};

function NotifCard({
  channel,
  onSaved,
}: {
  channel: NotificationChannel;
  onSaved: (updated: NotificationChannel) => void;
}) {
  const [draft, setDraft] = useState<NotificationChannel>({ ...channel, params: { ...channel.params } });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await updateNotification(channel.channel_name, draft.is_enabled, draft.params);
      setMsg({ type: 'success', text: '✓ Channel updated.' });
      onSaved(draft);
    } catch (e) {
      setMsg({ type: 'error', text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const isPasswordField = (key: string) =>
    ['password', 'secret', 'bot_token'].includes(key);

  return (
    <div className="notif-card">
      <div className="notif-header">
        <div className="notif-name">
          <span className="notif-icon">{CHANNEL_ICONS[channel.channel_name] ?? '📡'}</span>
          <span style={{ textTransform: 'capitalize' }}>{channel.channel_name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label className="toggle" title={draft.is_enabled ? 'Enabled' : 'Disabled'}>
            <input
              type="checkbox"
              checked={draft.is_enabled}
              onChange={e => setDraft(d => ({ ...d, is_enabled: e.target.checked }))}
              id={`toggle-notif-${channel.channel_name}`}
            />
            <span className="toggle-slider" />
          </label>
          <span style={{ fontSize: '0.75rem', color: draft.is_enabled ? 'var(--green)' : 'var(--text-muted)' }}>
            {draft.is_enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {msg && (
        <div style={{
          padding: '8px 12px', marginBottom: 12, borderRadius: 6, fontSize: '0.8rem',
          background: msg.type === 'success' ? 'var(--green-dim)' : 'var(--red-dim)',
          color: msg.type === 'success' ? 'var(--green)' : 'var(--red)',
          border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
        }}>
          {msg.text}
        </div>
      )}

      <div className="notif-fields">
        {Object.entries(draft.params).map(([key, val]) => (
          <div key={key} className="notif-field">
            <label htmlFor={`notif-${channel.channel_name}-${key}`}>
              {FIELD_LABELS[key] ?? key}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id={`notif-${channel.channel_name}-${key}`}
                className="input"
                type={isPasswordField(key) && !showPwd ? 'password' : 'text'}
                value={String(val ?? '')}
                onChange={e => setDraft(d => ({
                  ...d,
                  params: { ...d.params, [key]: e.target.value }
                }))}
              />
              {isPasswordField(key) && (
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: '0.8rem',
                  }}
                >
                  {showPwd ? '🙈' : '👁'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="notif-footer">
        <button
          className="btn btn-primary btn-sm"
          onClick={save}
          disabled={saving}
          id={`btn-save-notif-${channel.channel_name}`}
        >
          {saving ? '…' : '💾 Save'}
        </button>
      </div>
    </div>
  );
}

export function NotificationsConfig() {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications()
      .then(setChannels)
      .finally(() => setLoading(false));
  }, []);

  const handleSaved = (updated: NotificationChannel) => {
    setChannels(prev => prev.map(c => c.channel_name === updated.channel_name ? updated : c));
  };

  if (loading) {
    return (
      <div className="card config-section">
        <div className="skeleton" style={{ height: 24, width: 220, marginBottom: 16 }} />
        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, marginBottom: 12 }} />)}
      </div>
    );
  }

  return (
    <div className="card config-section">
      <div className="config-section-header">
        <div className="config-section-title">
          <span className="config-section-icon">🔔</span>
          <div>
            <h2>Notification Channels</h2>
            <p className="text-xs text-secondary mt-1">Configure alert delivery channels</p>
          </div>
        </div>
      </div>
      {channels.map(c => (
        <NotifCard key={c.channel_name} channel={c} onSaved={handleSaved} />
      ))}
    </div>
  );
}
