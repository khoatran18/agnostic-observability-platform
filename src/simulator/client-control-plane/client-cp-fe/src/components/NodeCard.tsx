import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Database,
  Sliders,
  RefreshCw,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Settings,
  Wifi,
  WifiOff,
  Radio,
  Loader2
} from 'lucide-react';
import type {
  ClientNodeInfo,
  CPUScenario,
  RAMScenario,
  SystemConfig
} from '../types';
import { SCENARIO_DESCRIPTIONS } from '../types';
import { updateCpuScenario, updateRamScenario, updateSystemConfig } from '../api';

interface NodeCardProps {
  node: ClientNodeInfo;
  onRefresh: (endpoint: string) => void;
  onRemove: (id: string) => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const NodeCard: React.FC<NodeCardProps> = ({ node, onRefresh, onRemove, onNotify }) => {
  const [autoPoll, setAutoPoll] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatingTarget, setUpdatingTarget] = useState<string | null>(null);

  // Editable config state initialized from node.state
  const [configForm, setConfigForm] = useState<Partial<SystemConfig>>({});

  useEffect(() => {
    if (node.state?.config) {
      setConfigForm(node.state.config);
    }
  }, [node.state?.config]);

  // Auto-polling interval
  useEffect(() => {
    if (!autoPoll) return;
    const interval = setInterval(() => {
      onRefresh(node.endpoint);
    }, 3000);
    return () => clearInterval(interval);
  }, [autoPoll, node.endpoint, onRefresh]);

  const nodeDisplayName = node.nodeIdFromBackend || node.name;

  const handleCpuChange = async (scenario: CPUScenario) => {
    setIsUpdating(true);
    setUpdatingTarget(`cpu-${scenario}`);
    const res = await updateCpuScenario(node.endpoint, scenario);
    setIsUpdating(false);
    setUpdatingTarget(null);
    if (res.success) {
      const scenarioLabel = SCENARIO_DESCRIPTIONS[scenario]?.label || scenario;
      onNotify(
        'success',
        `CPU Scenario Updated [${nodeDisplayName}]`,
        `Successfully changed CPU scenario to ${scenarioLabel}`
      );
      onRefresh(node.endpoint);
    } else {
      onNotify(
        'error',
        `CPU Update Failed [${nodeDisplayName}]`,
        res.message || 'Error updating CPU scenario'
      );
    }
  };

  const handleRamChange = async (scenario: RAMScenario) => {
    setIsUpdating(true);
    setUpdatingTarget(`ram-${scenario}`);
    const res = await updateRamScenario(node.endpoint, scenario);
    setIsUpdating(false);
    setUpdatingTarget(null);
    if (res.success) {
      const scenarioLabel = SCENARIO_DESCRIPTIONS[scenario]?.label || scenario;
      onNotify(
        'success',
        `RAM Scenario Updated [${nodeDisplayName}]`,
        `Successfully changed RAM scenario to ${scenarioLabel}`
      );
      onRefresh(node.endpoint);
    } else {
      onNotify(
        'error',
        `RAM Update Failed [${nodeDisplayName}]`,
        res.message || 'Error updating RAM scenario'
      );
    }
  };

  const handleConfigChange = (key: keyof SystemConfig, val: string) => {
    const num = parseFloat(val);
    setConfigForm((prev) => ({
      ...prev,
      [key]: isNaN(num) ? undefined : num
    }));
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdatingTarget('config');
    const res = await updateSystemConfig(node.endpoint, configForm);
    setIsUpdating(false);
    setUpdatingTarget(null);
    if (res.success) {
      onNotify(
        'success',
        `Config Saved [${nodeDisplayName}]`,
        'System configuration & thresholds successfully updated!'
      );
      onRefresh(node.endpoint);
    } else {
      onNotify(
        'error',
        `Config Update Failed [${nodeDisplayName}]`,
        res.message || 'Failed to update system configuration'
      );
    }
  };

  const activeCpu = node.state?.cpu_scenario || 'normal';
  const activeRam = node.state?.ram_scenario || 'normal';

  const scenariosList: { key: CPUScenario; label: string; tag: string }[] = [
    { key: 'normal', label: 'Normal (Safe)', tag: 'normal' },
    { key: 'spike_mad_safe', label: 'Spike MAD (Safe)', tag: 'safe' },
    { key: 'spike_th1_safe', label: 'Spike TH1 (Safe)', tag: 'safe' },
    { key: 'spike_th1_danger', label: 'Spike TH1 (Danger)', tag: 'danger' },
    { key: 'spike_th2_safe', label: 'Spike TH2 (Safe)', tag: 'safe' },
    { key: 'spike_th2_danger', label: 'Spike TH2 (Danger)', tag: 'danger' }
  ];

  return (
    <div className={`node-card ${node.isOnline ? 'online' : 'offline'}`}>
      {/* Node Card Header */}
      <div className="node-card-header">
        <div className="node-identity">
          <div className={`status-indicator ${node.isOnline ? 'online' : 'offline'}`}>
            {node.isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
          </div>
          <div>
            <h3 className="node-name">{nodeDisplayName}</h3>
            <span className="node-endpoint">{node.endpoint}</span>
          </div>
        </div>

        <div className="node-controls">
          <label className="auto-poll-toggle" title="Auto-refresh node status every 3s">
            <Radio size={14} className={autoPoll ? 'polling-pulse' : ''} />
            <span>Poll</span>
            <input
              type="checkbox"
              checked={autoPoll}
              onChange={(e) => setAutoPoll(e.target.checked)}
            />
          </label>

          <button
            className="btn btn-icon"
            onClick={() => onRefresh(node.endpoint)}
            title="Manual refresh"
          >
            <RefreshCw size={16} />
          </button>

          <button
            className="btn btn-icon danger"
            onClick={() => onRemove(node.id)}
            title="Remove node"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Offline Alert */}
      {!node.isOnline && (
        <div className="node-offline-banner">
          <AlertTriangle size={18} />
          <div>
            <strong>Node Unavailable</strong>
            <p>{node.error || 'Cannot reach endpoint'}</p>
          </div>
        </div>
      )}

      {/* Active State View */}
      {node.isOnline && node.state && (
        <div className="node-body">
          {/* CPU Scenario Section */}
          <div className="control-section">
            <div className="section-header">
              <Cpu size={18} className="icon-cpu" />
              <h4>CPU Scenario Behavior</h4>
              <span className={`scenario-badge ${SCENARIO_DESCRIPTIONS[activeCpu]?.tag || 'normal'}`}>
                {SCENARIO_DESCRIPTIONS[activeCpu]?.label || activeCpu}
              </span>
            </div>
            <div className="scenario-buttons-grid">
              {scenariosList.map((scen) => {
                const isTarget = updatingTarget === `cpu-${scen.key}`;
                return (
                  <button
                    key={`cpu-${scen.key}`}
                    disabled={isUpdating}
                    className={`btn-scenario-pill ${scen.tag} ${activeCpu === scen.key ? 'active' : ''}`}
                    onClick={() => handleCpuChange(scen.key)}
                  >
                    {isTarget ? <Loader2 size={12} className="spin" /> : null}
                    {scen.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RAM Scenario Section */}
          <div className="control-section">
            <div className="section-header">
              <Database size={18} className="icon-ram" />
              <h4>RAM Scenario Behavior</h4>
              <span className={`scenario-badge ${SCENARIO_DESCRIPTIONS[activeRam]?.tag || 'normal'}`}>
                {SCENARIO_DESCRIPTIONS[activeRam]?.label || activeRam}
              </span>
            </div>
            <div className="scenario-buttons-grid">
              {scenariosList.map((scen) => {
                const isTarget = updatingTarget === `ram-${scen.key}`;
                return (
                  <button
                    key={`ram-${scen.key}`}
                    disabled={isUpdating}
                    className={`btn-scenario-pill ${scen.tag} ${activeRam === scen.key ? 'active' : ''}`}
                    onClick={() => handleRamChange(scen.key as RAMScenario)}
                  >
                    {isTarget ? <Loader2 size={12} className="spin" /> : null}
                    {scen.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configuration Collapsible Section */}
          <div className="config-drawer-toggle" onClick={() => setShowConfig(!showConfig)}>
            <div className="drawer-title">
              <Settings size={16} />
              <span>Node System Configuration & Thresholds</span>
            </div>
            {showConfig ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>

          {showConfig && (
            <form onSubmit={handleSaveConfig} className="config-form">
              <div className="config-grid">
                <div className="field-group">
                  <label>CPU Normal Min (ratio)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={configForm.cpu_normal_min ?? ''}
                    onChange={(e) => handleConfigChange('cpu_normal_min', e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label>CPU Normal Max (ratio)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={configForm.cpu_normal_max ?? ''}
                    onChange={(e) => handleConfigChange('cpu_normal_max', e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label>RAM Normal Min (GB)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={configForm.ram_normal_min ?? ''}
                    onChange={(e) => handleConfigChange('ram_normal_min', e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label>RAM Normal Max (GB)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={configForm.ram_normal_max ?? ''}
                    onChange={(e) => handleConfigChange('ram_normal_max', e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label>Total RAM (GB)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={configForm.total_ram_gb ?? ''}
                    onChange={(e) => handleConfigChange('total_ram_gb', e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label>MAD K Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    value={configForm.mad_k ?? ''}
                    onChange={(e) => handleConfigChange('mad_k', e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label>Threshold 1 (TH1)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={configForm.threshold_1 ?? ''}
                    onChange={(e) => handleConfigChange('threshold_1', e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label>Threshold 2 (TH2)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={configForm.threshold_2 ?? ''}
                    onChange={(e) => handleConfigChange('threshold_2', e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label>Safe Duration (sec)</label>
                  <input
                    type="number"
                    step="1"
                    value={configForm.duration_safe_seconds ?? ''}
                    onChange={(e) => handleConfigChange('duration_safe_seconds', e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label>Danger Duration (sec)</label>
                  <input
                    type="number"
                    step="1"
                    value={configForm.duration_danger_seconds ?? ''}
                    onChange={(e) => handleConfigChange('duration_danger_seconds', e.target.value)}
                  />
                </div>
              </div>

              <div className="config-form-actions">
                <button type="submit" className="btn btn-primary btn-block" disabled={isUpdating}>
                  {updatingTarget === 'config' ? <Loader2 size={16} className="spin" /> : <Sliders size={16} />}
                  Apply Parameters to Node
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
