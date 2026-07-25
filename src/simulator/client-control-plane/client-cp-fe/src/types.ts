export type CPUScenario =
  | 'normal'
  | 'spike_mad_safe'
  | 'spike_th1_safe'
  | 'spike_th1_danger'
  | 'spike_th2_safe'
  | 'spike_th2_danger';

export type RAMScenario =
  | 'normal'
  | 'spike_mad_safe'
  | 'spike_th1_safe'
  | 'spike_th1_danger'
  | 'spike_th2_safe'
  | 'spike_th2_danger';

export interface SystemConfig {
  cpu_normal_min: number;
  cpu_normal_max: number;
  ram_normal_min: number;
  ram_normal_max: number;
  total_ram_gb: number;
  mad_k: number;
  threshold_1: number;
  threshold_2: number;
  duration_safe_seconds: number;
  duration_danger_seconds: number;
}

export interface ClientNodeState {
  cpu_scenario: CPUScenario;
  ram_scenario: RAMScenario;
  cpu_start_time?: number;
  ram_start_time?: number;
  spu_start_time?: number;
  config: SystemConfig;
}

export interface ClientNodeInfo {
  id: string;
  name: string;
  endpoint: string; // e.g. http://localhost:8010 or http://192.168.1.10:8000
  isOnline: boolean;
  lastSeen?: string;
  error?: string;
  state?: ClientNodeState;
  nodeIdFromBackend?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export interface PresetCluster {
  name: string;
  endpoints: string[];
}

export const SCENARIO_DESCRIPTIONS: Record<string, { label: string; tag: 'safe' | 'danger' | 'normal'; description: string }> = {
  normal: {
    label: 'Normal (Safe)',
    tag: 'normal',
    description: 'System running under normal standard load limits'
  },
  spike_mad_safe: {
    label: 'Spike MAD (Safe)',
    tag: 'safe',
    description: 'Exceeds MAD threshold but below Threshold 1 (Safe)'
  },
  spike_th1_safe: {
    label: 'Spike TH1 (Safe)',
    tag: 'safe',
    description: 'Exceeds Threshold 1 but recovers within safe duration'
  },
  spike_th1_danger: {
    label: 'Spike TH1 (Danger)',
    tag: 'danger',
    description: 'Exceeds Threshold 1 and persists past danger duration'
  },
  spike_th2_safe: {
    label: 'Spike TH2 (Safe)',
    tag: 'safe',
    description: 'Exceeds Threshold 2 but recovers within safe duration'
  },
  spike_th2_danger: {
    label: 'Spike TH2 (Danger)',
    tag: 'danger',
    description: 'Exceeds Threshold 2 and persists past danger duration'
  }
};
