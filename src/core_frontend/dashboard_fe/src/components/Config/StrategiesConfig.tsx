import { useEffect, useState } from 'react';
import { fetchStrategies, updateStrategy } from '../../api/client';
import type { Strategy } from '../../types';

function ParamEditor({
  params,
  onChange,
}: {
  params: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}) {
  return (
    <div className="params-grid">
      {Object.entries(params).map(([key, val]) => (
        <div key={key} className="param-field">
          <label className="param-label">{key}</label>
          <input
            className="input"
            type="number"
            step="any"
            value={String(val)}
            onChange={e => {
              const v = parseFloat(e.target.value);
              onChange({ ...params, [key]: isNaN(v) ? e.target.value : v });
            }}
            id={`param-${key}`}
          />
        </div>
      ))}
    </div>
  );
}

export function StrategiesConfig() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Strategy>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStrategies()
      .then(data => {
        setStrategies(data);
        const d: Record<number, Strategy> = {};
        data.forEach(s => { d[s.id] = { ...s, params: { ...s.params } }; });
        setDrafts(d);
      })
      .finally(() => setLoading(false));
  }, []);

  const saveAll = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await Promise.all(
        Object.values(drafts).map(draft =>
          updateStrategy(draft.id, draft.is_enabled, draft.params)
        )
      );
      setStrategies(prev => prev.map(s => drafts[s.id] ? { ...s, ...drafts[s.id] } : s));
      setMsg({ type: 'success', text: `✓ All ${Object.keys(drafts).length} strategies saved.` });
    } catch (e) {
      setMsg({ type: 'error', text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card config-section">
        <div className="skeleton" style={{ height: 24, width: 200, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 120 }} />
      </div>
    );
  }

  return (
    <div className="card config-section">
      <div className="config-section-header">
        <div className="config-section-title">
          <span className="config-section-icon">🧠</span>
          <div>
            <h2>Anomaly Detection Strategies</h2>
            <p className="text-xs text-secondary mt-1">Enable/disable and tune detection parameters</p>
          </div>
        </div>

        {/* ── Single Save All button ── */}
        <button
          className="btn btn-primary"
          onClick={saveAll}
          disabled={saving}
          id="btn-save-all-strategies"
        >
          {saving
            ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</>
            : '💾 Save All'}
        </button>
      </div>

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

      {strategies.map(s => {
        const draft = drafts[s.id] ?? s;
        return (
          <div key={s.id} className="strategy-card">
            <div className="strategy-header">
              <div className="strategy-name">{s.strategy_name}</div>
              <label className="toggle" title={draft.is_enabled ? 'Enabled' : 'Disabled'}>
                <input
                  type="checkbox"
                  checked={draft.is_enabled}
                  onChange={e => setDrafts(prev => ({
                    ...prev,
                    [s.id]: { ...prev[s.id], is_enabled: e.target.checked }
                  }))}
                  id={`toggle-strategy-${s.id}`}
                />
                <span className="toggle-slider" />
              </label>
            </div>
            <p className="strategy-desc">{s.description}</p>
            <ParamEditor
              params={draft.params as Record<string, unknown>}
              onChange={p => setDrafts(prev => ({ ...prev, [s.id]: { ...prev[s.id], params: p } }))}
            />
          </div>
        );
      })}
    </div>
  );
}
