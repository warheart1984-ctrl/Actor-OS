import type { LineageEventType, TaskStatus } from './types';

export const eventStyles: Record<LineageEventType, { label: string; className: string }> = {
  task: { label: 'task', className: 'bg-zinc-800 text-zinc-200 ring-zinc-600' },
  decision: { label: 'decision', className: 'bg-indigo-950 text-indigo-200 ring-indigo-800' },
  evidence: { label: 'evidence', className: 'bg-rose-950 text-rose-200 ring-rose-800' },
  interaction: { label: 'interaction', className: 'bg-amber-950 text-amber-200 ring-amber-800' },
  artifact: { label: 'artifact', className: 'bg-emerald-950 text-emerald-200 ring-emerald-800' },
  chain_step: { label: 'chain step', className: 'bg-sky-950 text-sky-200 ring-sky-800' },
};

export const statusStyles: Record<TaskStatus, string> = {
  pending: 'bg-zinc-800 text-zinc-300 ring-zinc-700',
  running: 'bg-amber-950 text-amber-200 ring-amber-800 animate-pulse',
  done: 'bg-emerald-950 text-emerald-200 ring-emerald-800',
  failed: 'bg-rose-950 text-rose-200 ring-rose-800',
  rejected: 'bg-orange-950 text-orange-200 ring-orange-800',
};

export function providerOf(profile: { binding?: { connector: string }; model_type: string }): string {
  if (profile.binding?.connector) return profile.binding.connector;
  const index = profile.model_type.indexOf(':');
  return index === -1 ? profile.model_type : profile.model_type.slice(0, index);
}

export function bindingLabel(profile: {
  binding?: { connector: string; model: string };
  model_type: string;
}): string {
  if (profile.binding) return `${profile.binding.connector} · ${profile.binding.model}`;
  return profile.model_type;
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleTimeString();
}

export function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}` : id;
}

/** Pulls the most useful one-line preview out of a lineage payload. */
export function summarizePayload(payload: Record<string, unknown>): string {
  const candidates = ['output', 'content', 'input', 'status', 'error', 'title'];
  for (const key of candidates) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      const flattened = value.replace(/\s+/g, ' ').trim();
      return flattened.length > 160 ? `${flattened.slice(0, 160)}...` : flattened;
    }
  }
  return '';
}
