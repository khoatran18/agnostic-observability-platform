import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchNodeStatus, fetchTargets } from '../api/client';
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
 * Fetches the list of monitored nodes from /targets, then queries
 * /node-status for each node in parallel to build real-time NodeSummary[].
 *
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
      // 1. Get the list of node IDs from /targets
      const targets = await fetchTargets();

      if (targets.length === 0) {
        setRawRows([]);
        setNodes([]);
        setError(null);
        return;
      }

      // 2. Fetch status for each node in parallel
      const results = await Promise.allSettled(
        targets.map((nodeId) => fetchNodeStatus(nodeId)),
      );

      // 3. Flatten all fulfilled results into a single NodeStatus[]
      const allRows: NodeStatus[] = [];
      for (const result of results) {
        if (result.status === 'fulfilled') {
          allRows.push(...result.value);
        }
      }

      setRawRows(allRows);
      setNodes(aggregateNodes(allRows));
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
