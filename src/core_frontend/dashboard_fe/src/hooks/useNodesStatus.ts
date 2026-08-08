import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchNodesRealtimeStatus } from '../api/client';
import { API_CONFIG } from '../config/api.config';
import type { NodeStatus, NodeSummary, StatusLevel } from '../types';

const STATUS_ORDER: Record<StatusLevel, number> = {
  recovered: 0,
  warning: 1,
  alert: 2,
};

function aggregateNodes(rows: NodeStatus[]): NodeSummary[] {
  const map = new Map<string, NodeSummary>();
  for (const row of rows) {
    if (!map.has(row.node_id)) {
      map.set(row.node_id, {
        node_id: row.node_id,
        overall_status: 'recovered',
        is_online: true,
      });
    }
    const node = map.get(row.node_id)!;
    if (row.resource_type === 'cpu') node.cpu = row;
    if (row.resource_type === 'ram') node.ram = row;
    if (STATUS_ORDER[row.status_level] > STATUS_ORDER[node.overall_status]) {
      node.overall_status = row.status_level;
    }
  }
  return Array.from(map.values());
}

/**
 * @param intervalMs - polling interval in ms; pass 0 to disable auto-refresh
 */
export function useNodesStatus(intervalMs: number = API_CONFIG.NODES_POLL_INTERVAL_MS) {
  const [rawRows, setRawRows] = useState<NodeStatus[]>([]);
  const [nodes, setNodes] = useState<NodeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doFetch = useCallback(async () => {
    try {
      const data = await fetchNodesRealtimeStatus();
      setRawRows(data);
      setNodes(aggregateNodes(data));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-run whenever intervalMs changes
  useEffect(() => {
    doFetch();
    if (timerRef.current) clearInterval(timerRef.current);
    if (intervalMs > 0) {
      timerRef.current = setInterval(doFetch, intervalMs);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [doFetch, intervalMs]);

  return { nodes, rawRows, loading, error, refetch: doFetch };
}
