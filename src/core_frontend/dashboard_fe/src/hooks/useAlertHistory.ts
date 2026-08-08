import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAlertHistory } from '../api/client';
import { API_CONFIG } from '../config/api.config';
import type { AlertHistoryItem, ToastItem } from '../types';

export function useAlertHistory(limit = 100) {
  const [history, setHistory] = useState<AlertHistoryItem[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const latestIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const poll = async () => {
    try {
      const data = await fetchAlertHistory(limit);
      setHistory(data);

      if (data.length === 0) return;

      const newest = data[0];
      if (latestIdRef.current === null) {
        latestIdRef.current = newest.id;
        return;
      }

      // Find all new alerts since last poll
      const newAlerts = data.filter(a => a.id > latestIdRef.current!);
      if (newAlerts.length > 0) {
        latestIdRef.current = newAlerts[0].id;

        const newToasts: ToastItem[] = newAlerts
          .filter(a => a.status_level !== 'recovered')
          .map(a => ({
            id: `${a.id}-${Date.now()}`,
            node_id: a.node_id,
            resource_type: a.resource_type,
            status_level: a.status_level,
            metric_value: a.metric_value,
            message: `[${a.status_level.toUpperCase()}] ${a.node_id} — ${a.resource_type.toUpperCase()} at ${(a.metric_value * 100).toFixed(1)}%`,
            timestamp: Date.now(),
          }));

        if (newToasts.length > 0) {
          setToasts(prev => [...newToasts, ...prev].slice(0, 2)); // max 2 toasts
          // Auto-dismiss after 8s
          newToasts.forEach(t => {
            setTimeout(() => dismissToast(t.id), 8000);
          });
        }
      }
    } catch {
      // silently ignore polling errors
    }
  };

  useEffect(() => {
    poll();
    timerRef.current = setInterval(poll, API_CONFIG.ALERT_POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return { history, toasts, dismissToast };
}
