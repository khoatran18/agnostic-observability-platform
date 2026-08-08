import { useCallback, useEffect, useState } from 'react';
import { fetchMetricsHistory } from '../api/client';
import { API_CONFIG } from '../config/api.config';
import type { MetricsDataPoint } from '../types';

export function useMetricsHistory(
  node_id: string | null,
  metric_type: 'cpu' | 'ram',
  minutes: number = API_CONFIG.DEFAULT_CHART_MINUTES,
) {
  const [data, setData] = useState<MetricsDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
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
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
