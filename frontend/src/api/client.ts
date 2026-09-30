import type {
  AgentGraph,
  AgentMessage,
  AgentSendResult,
  Artifact,
  ChainResult,
  CrewAgent,
  CrewAgentDetail,
  CrewPlan,
  CrewStatus,
  Health,
  LineageEvent,
  ModeEntry,
  Profile,
  ProfileSettings,
  RunResult,
  Task,
  VendorSkillHit,
} from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({ error: response.statusText }))) as {
      error?: string;
    };
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

const post = <T,>(path: string, body?: unknown): Promise<T> =>
  request<T>(path, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

export const api = {
  health: () => request<Health>('/health'),

  listProfiles: () => request<Profile[]>('/profiles'),
  createProfile: (input: {
    name: string;
    model_type?: string;
    binding?: { connector: string; model: string };
    role?: string;
    settings_json?: ProfileSettings;
  }) => post<Profile>('/profiles', input),
  updateProfile: (
    id: string,
    input: {
      role?: string;
      model_type?: string;
      binding?: { connector: string; model: string };
      settings_json?: ProfileSettings;
    },
  ) => request<Profile>(`/profiles/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  listProfileTasks: (id: string) => request<Task[]>(`/profiles/${id}/tasks`),

  listTasks: () => request<Task[]>('/tasks'),
  createTask: (input: {
    agent_id?: string;
    profile_id?: string;
    title: string;
    input_text: string;
    intent?: string;
    goal?: string;
  }) => post<Task>('/tasks', input),
  updateTaskInput: (id: string, input_text: string) =>
    request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ input_text }) }),
  runTask: (id: string) => post<RunResult>(`/tasks/${id}/run`),
  runChain: (id: string, steps: Array<{ agentId: string; input?: string }>) =>
    post<ChainResult>(`/tasks/${id}/chain`, { steps }),
  taskLineage: (id: string) => request<LineageEvent[]>(`/tasks/${id}/lineage`),
  taskArtifacts: (id: string) => request<Artifact[]>(`/tasks/${id}/artifacts`),
  taskMessages: (id: string) => request<AgentMessage[]>(`/tasks/${id}/messages`),

  recentLineage: (limit = 300) => request<LineageEvent[]>(`/lineage?limit=${limit}`),

  sendToAgent: (input: {
    taskId?: string | null;
    fromAgentId?: string;
    toAgentId?: string;
    fromProfileId?: string;
    toProfileId?: string;
    content: string;
    intent?: string;
    execute?: boolean;
  }) => post<AgentSendResult>('/agents/send', input),
  agentGraph: () => request<AgentGraph>('/agents/graph'),
  agentMessages: (a: string, b: string) =>
    request<AgentMessage[]>(`/agents/messages?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`),

  crewStatus: () => request<CrewStatus>('/crew'),
  crewAgents: () =>
    request<{ preEsfrCount: number; esfr: { id: string; order: number }; agents: CrewAgent[] }>(
      '/crew/agents',
    ),
  crewAgent: (id: string) => request<CrewAgentDetail>(`/crew/agents/${encodeURIComponent(id)}`),
  crewModes: (opts?: { q?: string; limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (opts?.q) params.set('q', opts.q);
    if (opts?.limit !== undefined) params.set('limit', String(opts.limit));
    if (opts?.offset !== undefined) params.set('offset', String(opts.offset));
    const qs = params.toString();
    return request<{ count: number; total: number; items: ModeEntry[] }>(
      `/crew/modes${qs ? `?${qs}` : ''}`,
    );
  },
  crewSkills: (opts?: {
    q?: string;
    preferredOnly?: boolean;
    agentId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (opts?.q) params.set('q', opts.q);
    if (opts?.preferredOnly) params.set('preferredOnly', 'true');
    if (opts?.agentId) params.set('agentId', opts.agentId);
    if (opts?.limit !== undefined) params.set('limit', String(opts.limit));
    if (opts?.offset !== undefined) params.set('offset', String(opts.offset));
    const qs = params.toString();
    return request<{
      catalogCount: number;
      preferredUnique: number;
      total: number;
      items: VendorSkillHit[];
    }>(`/crew/skills${qs ? `?${qs}` : ''}`);
  },
  crewPlan: (input: {
    goal: string;
    modeKey?: string;
    families?: string[];
    phases?: string[];
    agentIds?: string[];
    skillNames?: string[];
    includeEsfr?: boolean;
    compact?: boolean;
  }) => post<CrewPlan>('/crew/plan', input),
};
