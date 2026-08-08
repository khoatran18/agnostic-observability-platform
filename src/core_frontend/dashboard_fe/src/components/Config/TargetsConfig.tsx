import { useEffect, useState } from 'react';
import { fetchTargets, updateTargets } from '../../api/client';
import { DEFAULT_TARGETS } from '../../config/app.config';

export function TargetsConfig() {
  const [targets, setTargets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTarget, setNewTarget] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [usingDefaults, setUsingDefaults] = useState(false);

  useEffect(() => {
    fetchTargets()
      .then(data => {
        if (data.length > 0) {
          setTargets(data);
        } else {
          setTargets(DEFAULT_TARGETS);
          setUsingDefaults(true);
        }
      })
      .catch(() => {
        setTargets(DEFAULT_TARGETS);
        setUsingDefaults(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const addTarget = () => {
    const t = newTarget.trim();
    if (!t) return;
    if (targets.includes(t)) {
      setMsg({ type: 'error', text: `"${t}" already exists.` });
      return;
    }
    setTargets(prev => [...prev, t]);
    setNewTarget('');
    setMsg(null);
  };

  const removeTarget = (t: string) => {
    setTargets(prev => prev.filter(x => x !== t));
    setMsg(null);
  };

  const save = async () => {
    if (targets.length === 0) {
      setMsg({ type: 'error', text: 'Cannot save: target list is empty.' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await updateTargets(targets);
      setUsingDefaults(false);
      setMsg({ type: 'success', text: `✓ ${targets.length} targets saved. Prometheus will pick up changes automatically.` });
    } catch (e) {
      setMsg({ type: 'error', text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!window.confirm(`Reset to ${DEFAULT_TARGETS.length} default endpoints? This will overwrite current targets.`)) return;
    setSaving(true);
    setMsg(null);
    try {
      await updateTargets(DEFAULT_TARGETS);
      setTargets(DEFAULT_TARGETS);
      setUsingDefaults(false);
      setMsg({ type: 'success', text: `✓ Reset to ${DEFAULT_TARGETS.length} default targets.` });
    } catch (e) {
      setMsg({ type: 'error', text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card config-section">
      <div className="config-section-header">
        <div className="config-section-title">
          <span className="config-section-icon">🎯</span>
          <div>
            <h2>Monitored Endpoints</h2>
            <p className="text-xs text-secondary mt-1">
              Add/remove node endpoints — changes apply without system restart
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={resetToDefaults}
            disabled={saving}
            id="btn-reset-targets"
            title={`Reset to default: ${DEFAULT_TARGETS.join(', ')}`}
            style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}
          >
            ↺ Reset to Defaults
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving} id="btn-save-targets">
            {saving
              ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</>
              : '💾 Save Targets'}
          </button>
        </div>
      </div>

      {usingDefaults && (
        <div style={{
          padding: '10px 14px', marginBottom: 14, borderRadius: 8, fontSize: '0.8rem',
          background: 'rgba(79,123,232,0.12)', border: '1px solid rgba(79,123,232,0.3)',
          color: 'var(--accent)',
        }}>
          ℹ Showing default targets (backend not reached or no targets saved yet). Click <strong>Save Targets</strong> to persist.
        </div>
      )}

      {msg && (
        <div style={{
          padding: '10px 14px', marginBottom: 14, borderRadius: 8, fontSize: '0.875rem',
          background: msg.type === 'success' ? 'var(--green-dim)' : 'var(--red-dim)',
          color: msg.type === 'success' ? 'var(--green)' : 'var(--red)',
          border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
        }}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: 100 }} />
      ) : (
        <>
          {/* Add input — prominent at top */}
          <div className="target-add" style={{ marginBottom: 14 }}>
            <input
              className="input"
              placeholder="host:port  e.g. client_node_4:8000"
              value={newTarget}
              onChange={e => setNewTarget(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTarget()}
              id="input-new-target"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            />
            <button
              className="btn btn-primary"
              onClick={addTarget}
              id="btn-add-target"
              style={{ whiteSpace: 'nowrap' }}
            >
              + Add Endpoint
            </button>
          </div>

          {/* List */}
          <div className="targets-list">
            {targets.length === 0 ? (
              <p className="text-sm text-muted" style={{ padding: '12px 0' }}>
                No targets configured. Add one above.
              </p>
            ) : (
              targets.map((t, i) => (
                <div key={t} className="target-item">
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', width: 24, flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <span className="target-name">{t}</span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeTarget(t)}
                    id={`btn-remove-target-${t.replace(/[^a-zA-Z0-9]/g, '-')}`}
                    title={`Remove ${t}`}
                    style={{ color: 'var(--red)' }}
                  >
                    🗑 Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
