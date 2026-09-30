import type { CrewAgentLite, RtsCatalog, RtsSession } from './types';

/** Same storage key as the studio client; shared with the standalone rts-app. */
function apiToken(): string | null {
  try {
    return window.localStorage.getItem('lineage.apiToken');
  } catch {
    return null;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = apiToken();
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({ error: response.statusText }))) as {
      error?: string;
    };
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export const rtsApi = {
  catalog: () => request<RtsCatalog>('/rts/catalog?skillSample=30'),
  createSession: () => request<RtsSession>('/rts/sessions', { method: 'POST' }),
  getSession: (id: string) => request<RtsSession>(`/rts/sessions/${id}`),
  action: (id: string, body: Record<string, unknown>) =>
    request<RtsSession>(`/rts/sessions/${id}/action`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  listAgents: () =>
    request<{ agents: CrewAgentLite[] }>('/crew/agents').then((r) => r.agents),
  listModes: (q: string, limit = 20) =>
    request<{ items: Array<{ key: string; label: string }> }>(
      `/crew/modes?q=${encodeURIComponent(q)}&limit=${limit}`,
    ),
};
