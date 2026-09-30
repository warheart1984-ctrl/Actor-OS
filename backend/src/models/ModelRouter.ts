import { loadProfile } from '../core/ProfileManager.js';
import { serializeBinding } from '../core/ModelBinding.js';
import type { ConnectorRegistry } from './connectors/registry.js';
import type { ModelUsage } from './connectors/ModelConnector.js';

export type ModelRequest = {
  /** Agent profile id — the addressable unit, not a bare model name. */
  agentId: string;
  taskId?: string | null;
  input: string;
  /**
   * Chain steps only: a directive placed above the step's input, so a step can
   * say what to do with the previous output it inherits.
   */
  instruction?: string;
  context?: Record<string, unknown>;
};

export type ModelResponse = {
  agentId: string;
  taskId: string | null;
  output: string;
  /** Serialized binding `connector:model` actually invoked. */
  modelType: string;
  connector: string;
  model: string;
  isMock: boolean;
  usage?: ModelUsage;
  raw: unknown;
};

export type ChainStepListener = (
  index: number,
  request: ModelRequest,
  response: ModelResponse,
) => Promise<void> | void;

/** @deprecated Use parseBinding from ModelBinding — kept for older call sites/tests. */
export function parseModelType(modelType: string): { provider: string; model: string } {
  const separator = modelType.indexOf(':');
  if (separator === -1) {
    return { provider: modelType, model: modelType };
  }
  return {
    provider: modelType.slice(0, separator),
    model: modelType.slice(separator + 1),
  };
}

/**
 * Routes a request to the connector bound to an agent profile, and runs
 * multi-agent chains where each step receives the previous step's output.
 *
 * Flow: TaskSpec (upstream) → Agent Profile → ModelRouter → Connector → Provider
 */
export class ModelRouter {
  constructor(private readonly connectors: ConnectorRegistry) {}

  listProviders(): string[] {
    return Object.keys(this.connectors);
  }

  async send(request: ModelRequest): Promise<ModelResponse> {
    const profile = await loadProfile(request.agentId);
    const { connector: provider, model: boundModel } = profile.binding;
    const connector = this.connectors[provider];
    if (!connector) {
      throw new Error(
        `No connector registered for "${provider}" (agent ${profile.id}). ` +
          `Available: ${this.listProviders().join(', ')}`,
      );
    }

    const model = profile.settings_json.model ?? boundModel;
    const result = await connector.invoke({
      input: request.input,
      model,
      settings: profile.settings_json,
      ...(request.context ? { context: request.context } : {}),
    });

    return {
      agentId: request.agentId,
      taskId: request.taskId ?? null,
      output: result.text,
      modelType: serializeBinding({ connector: provider, model }),
      connector: provider,
      model,
      isMock: connector.isMock,
      ...(result.usage ? { usage: result.usage } : {}),
      raw: result.raw,
    };
  }

  /**
   * Runs steps in order. A step with empty input inherits the previous step's
   * output, which is what makes draft → review → fact-check pipelines work.
   */
  async chain(steps: ModelRequest[], onStep?: ChainStepListener): Promise<ModelResponse[]> {
    const results: ModelResponse[] = [];
    const previousSteps: Array<{ agent: string; summary: string }> = [];
    let currentOutput = '';

    for (const [index, step] of steps.entries()) {
      const base = step.input && step.input.trim().length > 0 ? step.input : currentOutput;
      const input = step.instruction ? [step.instruction, '---', base].join('\n\n') : base;
      const request: ModelRequest = {
        agentId: step.agentId,
        taskId: step.taskId ?? null,
        input,
        context: {
          ...(step.context ?? {}),
          previous_steps: previousSteps.slice(),
          chain_index: index,
        },
      };

      const response = await this.send(request);
      results.push(response);
      currentOutput = response.output;
      previousSteps.push({
        agent: response.agentId,
        summary: response.output.slice(0, 280),
      });

      if (onStep) {
        await onStep(index, request, response);
      }
    }

    return results;
  }
}
