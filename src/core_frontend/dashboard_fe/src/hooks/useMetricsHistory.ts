import { useCallback, useEffect, useState } from 'react';
import { fetchMetricsHistory } from '../api/client';
import { API_CONFIG } from '../config/api.config';
import type { MetricsDataPoint } from '../types';

export interface CombinedDataPoint {
  timestamp: number;
  cpu?: number;
  ram?: number;
}

/** Fetch CPU and RAM history in parallel, merged by timestamp into one series. */
export function useMetricsHistoryCombined(
  node_id: string | null,
  minutes: number = API_CONFIG.DEFAULT_CHART_MINUTES,
) {
  const [data, setData] = useState<CombinedDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doFetch = useCallback(async () => {
    if (!node_id) return;
    setLoading(true);
    setError(null);
    try {
      const [cpuPoints, ramPoints] = await Promise.all([
        fetchMetricsHistory(node_id, 'cpu', minutes),
        fetchMetricsHistory(node_id, 'ram', minutes),
      ]);

      // Build a map keyed by timestamp to merge CPU + RAM
      const map = new Map<number, CombinedDataPoint>();

      for (const p of cpuPoints) {
        map.set(p.timestamp, { timestamp: p.timestamp, cpu: p.value });
      }
      for (const p of ramPoints) {
        const existing = map.get(p.timestamp);
        if (existing) {
          existing.ram = p.value;
        } else {
          map.set(p.timestamp, { timestamp: p.timestamp, ram: p.value });
        }
      }

      const sorted = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
      setData(sorted);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [node_id, minutes]);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  return { data, loading, error, refetch: doFetch };
}

/** Original single-metric hook kept for backward compatibility */
export function useMetricsHistory(
  node_id: string | null,
  metric_type: 'cpu' | 'ram',
  minutes: number = API_CONFIG.DEFAULT_CHART_MINUTES,
) {
  const [data, setData] = useState<MetricsDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doFetch = useCallback(async () => {
    if (!node_id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMetricsHistory(node_id, metric_type, minutes);
      setData(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [node_id, metric_type, minutes]);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  return { data, loading, error, refetch: doFetch };
}
