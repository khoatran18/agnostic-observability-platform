/**
 * app.config.ts — KHÔNG cần sửa file này.
 * Chỉ sửa config.json cùng thư mục để thay đổi host/port/targets/polling.
 */
import cfg from './config.json';

// ── Derived values từ config.json ──────────────────────────────────────────
export const BACKEND_BASE_URL  = `http://${cfg.backend.host}:${cfg.backend.port}`;
export const DEFAULT_TARGETS   = cfg.default_targets as string[];

export const APP_CONFIG = {
  NODES_POLL_INTERVAL_MS:  cfg.polling.nodes_interval_ms,
  ALERT_POLL_INTERVAL_MS:  cfg.polling.alert_interval_ms,
  DEFAULT_CHART_MINUTES:   cfg.polling.default_chart_minutes,
} as const;

// Alias giữ backward-compat với các hook cũ import API_CONFIG
export const API_CONFIG = APP_CONFIG;

// ── API endpoints (không cần chỉnh) ────────────────────────────────────────
export const API_ENDPOINTS = {
  NODE_STATUS:           '/api/dashboard/node-status',
  NODES_REALTIME_STATUS: '/api/dashboard/nodes-realtime-status',
  ALERT_HISTORY:         '/api/dashboard/alert-history',
  METRICS_HISTORY:       '/api/dashboard/metrics-history',

  STRATEGIES:            '/api/config/strategies',
  STRATEGY_BY_ID:        (id: number)   => `/api/config/strategies/${id}`,

  NOTIFICATIONS:         '/api/config/notifications',
  NOTIFICATION_BY_NAME:  (name: string) => `/api/config/notifications/${name}`,

  TARGETS:               '/api/config/targets',
} as const;

// ── URL builder ────────────────────────────────────────────────────────────
export function buildUrl(
  path: string,
  params?: Record<string, string | number>,
): string {
  let url = `${BACKEND_BASE_URL}${path}`;
  if (params && Object.keys(params).length > 0) {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ).toString();
    url += `?${qs}`;
  }
  return url;
}
