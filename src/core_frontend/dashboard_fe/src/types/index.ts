// ─── TypeScript type definitions ───────────────────────────────────────────

/** Status levels returned by backend */
export type StatusLevel = 'recovered' | 'warning' | 'alert';

/** A single row from node_current_status table */
export interface NodeStatus {
  node_id: string;
  resource_type: 'cpu' | 'ram';
  status_level: StatusLevel;
  last_value: number;  // 0-1 ratio (e.g. 0.85 = 85%)
  scenario: string;
  updated_at: string;
}

/** Aggregated view of a single node (merges cpu + ram rows) */
export interface NodeSummary {
  node_id: string;
  cpu?: NodeStatus;
  ram?: NodeStatus;
  /** Worst status across cpu/ram */
  overall_status: StatusLevel;
  is_online: boolean;
}

/** A row from alert_history table */
export interface AlertHistoryItem {
  id: number;
  node_id: string;
  resource_type: 'cpu' | 'ram';
  status_level: StatusLevel;
  metric_value: number;
  scenario: string;
  created_at: string;
}

/** A single time-series data point */
export interface MetricsDataPoint {
  timestamp: number; // ms
  value: number;     // percentage 0-100
}

/** Anomaly detection strategy */
export interface Strategy {
  id: number;
  strategy_name: string;
  description: string;
  params: Record<string, unknown>;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/** Notification channel */
export interface NotificationChannel {
  id: number;
  channel_name: string;
  params: Record<string, unknown>;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/** Toast notification item */
export interface ToastItem {
  id: string;
  node_id: string;
  resource_type: string;
  status_level: StatusLevel;
  metric_value: number;
  message: string;
  timestamp: number;
}
