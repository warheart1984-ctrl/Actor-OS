import type { ProfileSettings } from '../../types.js';

export type ModelInvokeRequest = {
  /** Prompt text for this invocation. */
  input: string;
  /** Model id resolved from `profile.model_type` (settings.model wins if set). */
  model: string;
  settings: ProfileSettings;
  /** Optional orchestration context (previous chain steps, agent envelope). */
  context?: Record<string, unknown>;
};

export type ModelUsage = {
  input_tokens?: number;
  output_tokens?: number;
};

export type ModelInvokeResult = {
  text: string;
  raw: unknown;
  usage?: ModelUsage;
};

export interface ModelConnector {
  /** Provider half of `model_type`, e.g. "openai". */
  readonly provider: string;
  /** True when the connector produces synthetic output instead of calling a provider. */
  readonly isMock: boolean;
  invoke(request: ModelInvokeRequest): Promise<ModelInvokeResult>;
}

/** Builds the prompt sent to providers that take a single user message. */
export function composePrompt(request: ModelInvokeRequest): string {
  const previous = request.context?.['previous_steps'];
  if (Array.isArray(previous) && previous.length > 0) {
    const summary = previous
      .map((step) => {
        const entry = step as { agent?: string; profile?: string; summary?: string };
        const who = entry.agent ?? entry.profile ?? 'unknown';
        return `- ${who}: ${entry.summary ?? ''}`;
      })
      .join('\n');
    return `Prior steps in this task:\n${summary}\n\n${request.input}`;
  }
  return request.input;
}
