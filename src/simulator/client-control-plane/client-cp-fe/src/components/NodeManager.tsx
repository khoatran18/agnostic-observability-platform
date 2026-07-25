import React, { useState } from 'react';
import { Plus, Server, Zap, RefreshCw, Activity } from 'lucide-react';
import type { CPUScenario, RAMScenario, PresetCluster } from '../types';

interface NodeManagerProps {
  onAddNode: (endpoint: string) => void;
  onAddPresetCluster: (endpoints: string[]) => void;
  onBulkScenario: (cpuScenario: CPUScenario, ramScenario: RAMScenario) => void;
  onRefreshAll: () => void;
  nodeCount: number;
  onlineCount: number;
  isRefreshing: boolean;
  presetClusters: PresetCluster[];
}

export const NodeManager: React.FC<NodeManagerProps> = ({
  onAddNode,
  onAddPresetCluster,
  onBulkScenario,
  onRefreshAll,
  nodeCount,
  onlineCount,
  isRefreshing,
  presetClusters
}) => {
  const [newEndpoint, setNewEndpoint] = useState('');
  const [inputError, setInputError] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEndpoint.trim()) {
      setInputError('Please enter IP/DNS:Port');
      return;
    }
    setInputError('');
    onAddNode(newEndpoint.trim());
    setNewEndpoint('');
  };

  return (
    <div className="control-manager-panel">
      <div className="manager-header">
        <div className="brand-title">
          <Activity className="brand-icon" size={28} />
          <div>
            <div className="brand-badge">Agnostic Observability Simulator</div>
            <h2>Distributed Client Nodes Control Plane</h2>
            <p className="subtitle">Monitor, configure, and inject anomaly scenarios into simulation nodes</p>
          </div>
        </div>

        <div className="stats-badges">
          <div className="stat-badge">
            <Server size={16} />
            <span>Total Nodes: <strong>{nodeCount}</strong></span>
          </div>
          <div className="stat-badge success">
            <span className="pulse-dot green"></span>
            <span>Online: <strong>{onlineCount}/{nodeCount}</strong></span>
          </div>
          <button 
            className="btn btn-outline" 
            onClick={onRefreshAll}
            disabled={isRefreshing}
          >
            <RefreshCw className={isRefreshing ? 'spin' : ''} size={16} />
            Refresh All
          </button>
        </div>
      </div>

      <div className="manager-actions-row">
        {/* Add Node Section */}
        <form onSubmit={handleAdd} className="add-node-form">
          <div className="input-group">
            <Server className="input-icon" size={18} />
            <input
              type="text"
              placeholder="IP/DNS:Port (e.g. localhost:8010)"
              value={newEndpoint}
              onChange={(e) => setNewEndpoint(e.target.value)}
              className={inputError ? 'error-border' : ''}
            />
            <button type="submit" className="btn btn-primary">
              <Plus size={16} />
              Add Node
            </button>
          </div>
          {inputError && <span className="error-text">{inputError}</span>}
          
          <div className="preset-clusters-group">
            {presetClusters.map((cluster, idx) => (
              <button 
                key={idx}
                type="button" 
                className="btn btn-ghost btn-sm"
                onClick={() => onAddPresetCluster(cluster.endpoints)}
              >
                + Add {cluster.name}
              </button>
            ))}
          </div>
        </form>

        {/* Global Bulk Control */}
        <div className="bulk-control-card">
          <div className="bulk-title">
            <Zap size={16} />
            <span>Bulk Scenario Injection:</span>
          </div>
          <div className="bulk-btn-group">
            <button 
              disabled={isRefreshing}
              className="btn btn-scenario normal"
              onClick={() => onBulkScenario('normal', 'normal')}
              title="Reset all nodes to normal operation"
            >
              All Normal (Safe)
            </button>
            <button 
              disabled={isRefreshing}
              className="btn btn-scenario safe"
              onClick={() => onBulkScenario('spike_mad_safe', 'spike_mad_safe')}
              title="Set all nodes to MAD Safe Spike"
            >
              All MAD (Safe)
            </button>
            <button 
              disabled={isRefreshing}
              className="btn btn-scenario safe"
              onClick={() => onBulkScenario('spike_th1_safe', 'spike_th1_safe')}
              title="Set all nodes to TH1 Safe Spike"
            >
              All TH1 (Safe)
            </button>
            <button 
              disabled={isRefreshing}
              className="btn btn-scenario danger"
              onClick={() => onBulkScenario('spike_th1_danger', 'spike_th1_danger')}
              title="Set all nodes to TH1 Danger Spike"
            >
              All TH1 (Danger)
            </button>
            <button 
              disabled={isRefreshing}
              className="btn btn-scenario safe"
              onClick={() => onBulkScenario('spike_th2_safe', 'spike_th2_safe')}
              title="Set all nodes to TH2 Safe Spike"
            >
              All TH2 (Safe)
            </button>
            <button 
              disabled={isRefreshing}
              className="btn btn-scenario danger"
              onClick={() => onBulkScenario('spike_th2_danger', 'spike_th2_danger')}
              title="Set all nodes to TH2 Danger Spike"
            >
              All TH2 (Danger)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
