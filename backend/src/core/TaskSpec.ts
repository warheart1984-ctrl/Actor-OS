import type { TaskSpec, TaskSpecConstraints } from '../types.js';

export class InvalidTaskSpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTaskSpecError';
  }
}

export type BuildTaskSpecInput = {
  agentId: string;
  intent: string;
  primaryInput: string;
  goal?: string;
  constraints?: TaskSpecConstraints;
  successCriteria?: string[];
  context?: Record<string, unknown>;
};

/** Builds a v1 TaskSpec from UI / API create payloads. */
export function buildTaskSpec(input: BuildTaskSpecInput): TaskSpec {
  if (!input.agentId.trim()) {
    throw new InvalidTaskSpecError('TaskSpec requires agent_id');
  }
  if (!input.intent.trim()) {
    throw new InvalidTaskSpecError('TaskSpec requires intent');
  }
  if (!input.primaryInput.trim()) {
    throw new InvalidTaskSpecError('TaskSpec requires inputs.primary');
  }

  const spec: TaskSpec = {
    version: '1',
    intent: input.intent.trim(),
    agent_id: input.agentId,
    inputs: { primary: input.primaryInput },
  };
  if (input.goal?.trim()) {
    spec.goal = input.goal.trim();
  }
  if (input.constraints && Object.keys(input.constraints).length > 0) {
    spec.constraints = input.constraints;
  }
  if (input.successCriteria && input.successCriteria.length > 0) {
    spec.success_criteria = input.successCriteria;
  }
  if (input.context && Object.keys(input.context).length > 0) {
    spec.context = input.context;
  }
  return spec;
}

/**
 * Parses a stored or inbound TaskSpec. Unknown fields are dropped; required
 * fields are validated so the orchestrator never trusts a half-baked contract.
 */
export function parseTaskSpec(raw: unknown): TaskSpec {
  if (typeof raw !== 'object' || raw === null) {
    throw new InvalidTaskSpecError('TaskSpec must be an object');
  }
  const value = raw as Record<string, unknown>;
  const intent = typeof value['intent'] === 'string' ? value['intent'] : '';
  const agentId = typeof value['agent_id'] === 'string' ? value['agent_id'] : '';
  const inputsRaw = value['inputs'];
  const primary =
    typeof inputsRaw === 'object' &&
    inputsRaw !== null &&
    typeof (inputsRaw as Record<string, unknown>)['primary'] === 'string'
      ? ((inputsRaw as Record<string, unknown>)['primary'] as string)
      : '';

  return buildTaskSpec({
    agentId,
    intent,
    primaryInput: primary,
    ...(typeof value['goal'] === 'string' ? { goal: value['goal'] } : {}),
    ...(typeof value['constraints'] === 'object' && value['constraints'] !== null
      ? { constraints: value['constraints'] as TaskSpecConstraints }
      : {}),
    ...(Array.isArray(value['success_criteria'])
      ? {
          successCriteria: (value['success_criteria'] as unknown[]).filter(
            (entry): entry is string => typeof entry === 'string',
          ),
        }
      : {}),
    ...(typeof value['context'] === 'object' && value['context'] !== null
      ? { context: value['context'] as Record<string, unknown> }
      : {}),
  });
}

/**
 * Renders a TaskSpec into the prompt text connectors actually receive.
 * Provider quirks stay behind connectors; this string is the stable contract.
 */
export function renderTaskSpecPrompt(spec: TaskSpec): string {
  const lines: string[] = [`Intent: ${spec.intent}`];
  if (spec.goal) {
    lines.push(`Goal: ${spec.goal}`);
  }
  if (spec.constraints && Object.keys(spec.constraints).length > 0) {
    const rendered = Object.entries(spec.constraints)
      .map(([key, val]) => `- ${key}: ${Array.isArray(val) ? val.join(', ') : String(val)}`)
      .join('\n');
    lines.push('Constraints:', rendered);
  }
  if (spec.success_criteria && spec.success_criteria.length > 0) {
    lines.push('Success criteria:');
    for (const criterion of spec.success_criteria) {
      lines.push(`- ${criterion}`);
    }
  }
  lines.push('', 'Input:', spec.inputs.primary);
  return lines.join('\n');
}

/** Infers a short intent label from a free-form title when the client omits one. */
export function intentFromTitle(title: string): string {
  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed : 'execute';
}
