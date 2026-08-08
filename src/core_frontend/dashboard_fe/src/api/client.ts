import { buildUrl, API_ENDPOINTS } from '../config/app.config';
import type {
  AlertHistoryItem,
  MetricsDataPoint,
  NodeStatus,
  NotificationChannel,
  Strategy,
} from '../types';

/** Generic fetch wrapper - always reads JSON, throws on non-ok */
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Dashboard APIs ────────────────────────────────────────────────────────

export async function fetchNodesRealtimeStatus(): Promise<NodeStatus[]> {
  const data = await apiFetch<{ status: string; data: NodeStatus[] }>(
    buildUrl(API_ENDPOINTS.NODES_REALTIME_STATUS),
  );
  return data.data ?? [];
}

export async function fetchNodeStatus(node_id: string): Promise<NodeStatus[]> {
  const data = await apiFetch<{ status: string; data: NodeStatus[] }>(
    buildUrl(API_ENDPOINTS.NODE_STATUS, { node_id }),
  );
  return data.data ?? [];
}

export async function fetchAlertHistory(limit = 50): Promise<AlertHistoryItem[]> {
  const data = await apiFetch<{ status: string; data: AlertHistoryItem[] }>(
    buildUrl(API_ENDPOINTS.ALERT_HISTORY, { limit }),
  );
  return data.data ?? [];
}

export async function fetchMetricsHistory(
  node_id: string,
  metric_type: 'cpu' | 'ram',
  minutes: number,
): Promise<MetricsDataPoint[]> {
  const data = await apiFetch<{ status: string; data: MetricsDataPoint[] }>(
    buildUrl(API_ENDPOINTS.METRICS_HISTORY, { node_id, metric_type, minutes }),
  );
  const points = data.data ?? [];
  // Backend multiplies CPU×100 but RAM×1 (stays as 0–1 ratio).
  // Normalize RAM to percentage here so the chart always receives 0–100.
  if (metric_type === 'ram') {
    return points.map(p => ({ ...p, value: p.value * 100 }));
  }
  return points;
}

// ── Config APIs ───────────────────────────────────────────────────────────

export async function fetchStrategies(): Promise<Strategy[]> {
  const data = await apiFetch<{ status: string; strategies: Strategy[] }>(
    buildUrl(API_ENDPOINTS.STRATEGIES),
  );
  return data.strategies ?? [];
}

export async function updateStrategy(
  id: number,
  is_enabled: boolean,
  params: Record<string, unknown>,
): Promise<void> {
  await apiFetch(buildUrl(API_ENDPOINTS.STRATEGY_BY_ID(id)), {
    method: 'PUT',
    body: JSON.stringify({ is_enabled, params }),
  });
}

export async function fetchNotifications(): Promise<NotificationChannel[]> {
  const data = await apiFetch<{ status: string; notifications: NotificationChannel[] }>(
    buildUrl(API_ENDPOINTS.NOTIFICATIONS),
  );
  return data.notifications ?? [];
}

export async function updateNotification(
  channel_name: string,
  is_enabled: boolean,
  params: Record<string, unknown>,
): Promise<void> {
  await apiFetch(buildUrl(API_ENDPOINTS.NOTIFICATION_BY_NAME(channel_name)), {
    method: 'PUT',
    body: JSON.stringify({ is_enabled, params }),
  });
}

export async function fetchTargets(): Promise<string[]> {
  const data = await apiFetch<{ status: string; targets: string[] }>(
    buildUrl(API_ENDPOINTS.TARGETS),
  );
  return data.targets ?? [];
}

export async function updateTargets(targets: string[]): Promise<void> {
  await apiFetch(buildUrl(API_ENDPOINTS.TARGETS), {
    method: 'PUT',
    body: JSON.stringify({ targets }),
  });
}
