import type { CPUScenario, RAMScenario, SystemConfig, ClientNodeState } from './types';

export function normalizeEndpoint(url: string): string {
  let trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = 'http://' + trimmed;
  }
  return trimmed.replace(/\/+$/, '');
}

export interface NodeStatusResult {
  isOnline: boolean;
  state?: ClientNodeState;
  backendNodeId?: string;
  error?: string;
}

export async function fetchNodeStatus(endpoint: string): Promise<NodeStatusResult> {
  const baseUrl = normalizeEndpoint(endpoint);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const [statusRes, rootRes] = await Promise.allSettled([
      fetch(`${baseUrl}/api/status`, { signal: controller.signal }),
      fetch(`${baseUrl}/`, { signal: controller.signal })
    ]);

    clearTimeout(timeoutId);

    if (statusRes.status !== 'fulfilled' || !statusRes.value.ok) {
      const errText = statusRes.status === 'fulfilled' ? `HTTP ${statusRes.value.status}` : 'Connection refused / Offline';
      return { isOnline: false, error: errText };
    }

    const statusData = await statusRes.value.json();
    let backendNodeId: string | undefined;

    if (rootRes.status === 'fulfilled' && rootRes.value.ok) {
      try {
        const rootData = await rootRes.value.json();
        backendNodeId = rootData.client_node_id;
      } catch {
        // ignore root json parse error
      }
    }

    return {
      isOnline: true,
      state: statusData.state,
      backendNodeId
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      isOnline: false,
      error: err.name === 'AbortError' ? 'Request timed out' : (err.message || 'Network error')
    };
  }
}

export async function updateCpuScenario(endpoint: string, scenario: CPUScenario): Promise<{ success: boolean; message?: string }> {
  const baseUrl = normalizeEndpoint(endpoint);
  try {
    const res = await fetch(`${baseUrl}/api/scenario/cpu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario })
    });
    if (!res.ok) {
      return { success: false, message: `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to connect' };
  }
}

export async function updateRamScenario(endpoint: string, scenario: RAMScenario): Promise<{ success: boolean; message?: string }> {
  const baseUrl = normalizeEndpoint(endpoint);
  try {
    const res = await fetch(`${baseUrl}/api/scenario/ram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario })
    });
    if (!res.ok) {
      return { success: false, message: `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to connect' };
  }
}

export async function updateSystemConfig(endpoint: string, configPayload: Partial<SystemConfig>): Promise<{ success: boolean; updatedConfig?: SystemConfig; message?: string }> {
  const baseUrl = normalizeEndpoint(endpoint);
  try {
    const res = await fetch(`${baseUrl}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configPayload)
    });
    if (!res.ok) {
      return { success: false, message: `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { success: true, updatedConfig: data.config };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to update config' };
  }
}
