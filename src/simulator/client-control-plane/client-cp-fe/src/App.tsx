import { useState, useEffect, useCallback } from 'react';
import { NodeManager } from './components/NodeManager';
import { NodeCard } from './components/NodeCard';
import { ToastContainer } from './components/ToastContainer';
import type { ClientNodeInfo, CPUScenario, RAMScenario, ToastMessage, PresetCluster } from './types';
import { fetchNodeStatus, normalizeEndpoint, updateCpuScenario, updateRamScenario } from './api';
import defaultNodesConfig from './config/nodes.json';
import './index.css';

const LOCAL_STORAGE_KEY = 'client_control_plane_endpoints_v1';
const DEFAULT_ENDPOINTS: string[] = defaultNodesConfig.defaultEndpoints || [
  'http://localhost:8010',
  'http://localhost:8011'
];
const PRESET_CLUSTERS: PresetCluster[] = defaultNodesConfig.presetClusters || [];

function sortEndpoints(urls: string[]): string[] {
  return [...urls].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );
}

export default function App() {
  const [endpoints, setEndpoints] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sortEndpoints(parsed.map(normalizeEndpoint));
        }
      }
    } catch {
      // fallback
    }
    return sortEndpoints(DEFAULT_ENDPOINTS.map(normalizeEndpoint));
  });

  const [nodesMap, setNodesMap] = useState<Record<string, ClientNodeInfo>>({});
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Automatically sync/merge any new endpoints added to nodes.json & keep sorted
  useEffect(() => {
    setEndpoints((prev) => {
      const copy = [...prev];
      let changed = false;
      DEFAULT_ENDPOINTS.forEach((raw) => {
        const norm = normalizeEndpoint(raw);
        if (!copy.includes(norm)) {
          copy.push(norm);
          changed = true;
        }
      });
      const sorted = sortEndpoints(copy);
      if (changed || JSON.stringify(sorted) !== JSON.stringify(prev)) {
        return sorted;
      }
      return prev;
    });
  }, []);

  // Toast notifier helper
  const addToast = useCallback((type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    const newToast: ToastMessage = { id, type, title, message };

    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss after 2.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Sync endpoints to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(endpoints));
    } catch (err) {
      console.error('Failed to save endpoints to localStorage', err);
    }
  }, [endpoints]);

  const refreshNodeByEndpoint = useCallback(async (endpoint: string) => {
    const norm = normalizeEndpoint(endpoint);
    const result = await fetchNodeStatus(norm);

    setNodesMap((prev) => ({
      ...prev,
      [norm]: {
        id: norm,
        name: `Node (${norm.replace(/^https?:\/\//, '')})`,
        endpoint: norm,
        isOnline: result.isOnline,
        lastSeen: new Date().toLocaleTimeString(),
        error: result.error,
        state: result.state,
        nodeIdFromBackend: result.backendNodeId
      }
    }));
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshingAll(true);
    await Promise.all(endpoints.map((ep) => refreshNodeByEndpoint(ep)));
    setIsRefreshingAll(false);
  }, [endpoints, refreshNodeByEndpoint]);

  // Initial load refresh
  useEffect(() => {
    refreshAll();
  }, [endpoints, refreshAll]);

  const handleAddNode = (rawEndpoint: string) => {
    const norm = normalizeEndpoint(rawEndpoint);
    if (!endpoints.includes(norm)) {
      setEndpoints((prev) => sortEndpoints([...prev, norm]));
      addToast('info', 'Node Added', `Registered endpoint: ${norm}`);
    } else {
      addToast('error', 'Duplicate Endpoint', `Node ${norm} is already registered.`);
    }
  };

  const handleAddPresetCluster = (clusterEndpoints: string[]) => {
    let addedCount = 0;
    setEndpoints((prev) => {
      const copy = [...prev];
      clusterEndpoints.forEach((raw) => {
        const norm = normalizeEndpoint(raw);
        if (!copy.includes(norm)) {
          copy.push(norm);
          addedCount++;
        }
      });
      return sortEndpoints(copy);
    });

    addToast('info', 'Preset Cluster Added', `Added preset nodes to control plane.`);
  };

  const handleRemoveNode = (endpoint: string) => {
    setEndpoints((prev) => prev.filter((ep) => ep !== endpoint));
    setNodesMap((prev) => {
      const copy = { ...prev };
      delete copy[endpoint];
      return copy;
    });
    addToast('info', 'Node Removed', `Removed endpoint: ${endpoint}`);
  };

  const handleBulkScenario = async (cpuScenario: CPUScenario, ramScenario: RAMScenario) => {
    setIsRefreshingAll(true);
    let successCount = 0;
    await Promise.all(
      endpoints.map(async (ep) => {
        const resCpu = await updateCpuScenario(ep, cpuScenario);
        const resRam = await updateRamScenario(ep, ramScenario);
        if (resCpu.success && resRam.success) {
          successCount++;
        }
        await refreshNodeByEndpoint(ep);
      })
    );
    setIsRefreshingAll(false);
    addToast(
      'success',
      'Bulk Injection Complete',
      `Applied scenario (${cpuScenario}) to ${successCount}/${endpoints.length} active nodes.`
    );
  };

  const onlineCount = Object.values(nodesMap).filter((n) => n.isOnline).length;

  return (
    <div className="app-container">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      <main className="dashboard-content">
        <NodeManager
          onAddNode={handleAddNode}
          onAddPresetCluster={handleAddPresetCluster}
          onBulkScenario={handleBulkScenario}
          onRefreshAll={refreshAll}
          nodeCount={endpoints.length}
          onlineCount={onlineCount}
          isRefreshing={isRefreshingAll}
          presetClusters={PRESET_CLUSTERS}
        />

        <div className="nodes-grid">
          {endpoints.length === 0 ? (
            <div className="empty-state">
              <h3>No Client Nodes Configured</h3>
              <p>Add an IP/DNS and Port in the form above to start monitoring and controlling client nodes.</p>
            </div>
          ) : (
            endpoints.map((ep) => {
              const nodeInfo = nodesMap[ep] || {
                id: ep,
                name: `Node (${ep})`,
                endpoint: ep,
                isOnline: false,
                error: 'Connecting...'
              };
              return (
                <NodeCard
                  key={ep}
                  node={nodeInfo}
                  onRefresh={refreshNodeByEndpoint}
                  onRemove={handleRemoveNode}
                  onNotify={addToast}
                />
              );
            })
          )}
        </div>
      </main>

      <footer className="main-footer">
        <span>Distributed Client Node Simulator Control Plane</span>
      </footer>
    </div>
  );
}
