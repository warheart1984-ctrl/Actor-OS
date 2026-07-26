import { randomUUID } from 'node:crypto';
import type { LineageEngine } from './LineageEngine.js';
import type { MessageBus, AgentMessageHandler } from '../models/MessageBus.js';
import type { ModelRequest, ModelResponse, ModelRouter } from '../models/ModelRouter.js';
import type { AgentMessage, AgentTaskEnvelope } from '../types.js';

export class InvalidEnvelopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEnvelopeError';
  }
}

export type DispatchResult = {
  message: AgentMessage;
  /** Present when the receiving profile was invoked. */
  response?: ModelResponse;
};

/**
 * Validates an incoming payload as an `agent_task` envelope. Unknown fields are
 * dropped rather than trusted, so only the documented protocol reaches storage.
 */
export function parseAgentTaskEnvelope(raw: unknown): AgentTaskEnvelope {
  if (typeof raw !== 'object' || raw === null) {
    throw new InvalidEnvelopeError('Envelope must be an object');
  }
  const value = raw as Record<string, unknown>;
  const required = ['from_profile', 'to_profile', 'input'] as const;
  for (const field of required) {
    if (typeof value[field] !== 'string' || (value[field] as string).length === 0) {
      throw new InvalidEnvelopeError(`Envelope field "${field}" must be a non-empty string`);
    }
  }

  const envelope: AgentTaskEnvelope = {
    type: 'agent_task',
    from_profile: value['from_profile'] as string,
    to_profile: value['to_profile'] as string,
    task_id: typeof value['task_id'] === 'string' ? (value['task_id'] as string) : null,
    intent: typeof value['intent'] === 'string' ? (value['intent'] as string) : 'refine',
    input: value['input'] as string,
  };
  if (typeof value['subject'] === 'string') {
    envelope.subject = value['subject'];
  }
  if (typeof value['constraints'] === 'object' && value['constraints'] !== null) {
    envelope.constraints = value['constraints'] as AgentTaskEnvelope['constraints'];
  }
  if (typeof value['context'] === 'object' && value['context'] !== null) {
    envelope.context = value['context'] as AgentTaskEnvelope['context'];
  }
  return envelope;
}

/** Renders an envelope into the prompt the receiving model actually sees. */
export function renderEnvelopePrompt(envelope: AgentTaskEnvelope): string {
  const lines: string[] = [
    `You received a task from another agent (${envelope.from_profile}).`,
    `Intent: ${envelope.intent}`,
  ];
  if (envelope.subject) {
    lines.push(`Subject: ${envelope.subject}`);
  }
  const constraints = envelope.constraints;
  if (constraints && Object.keys(constraints).length > 0) {
    const rendered = Object.entries(constraints)
      .map(([key, val]) => `- ${key}: ${Array.isArray(val) ? val.join(', ') : String(val)}`)
      .join('\n');
    lines.push('Constraints:', rendered);
  }
  lines.push('', 'Content:', envelope.input);
  return lines.join('\n');
}

/**
 * Cross-model collaboration: delivers a structured envelope from one profile to
 * another, optionally invokes the receiving model, and records both sides in
 * lineage.
 */
export class AgentCollaborationEngine {
  constructor(
    private readonly bus: MessageBus,
    private readonly lineage: LineageEngine,
    private readonly router: ModelRouter,
  ) {}

  registerProfileHandler(profileId: string, handler: AgentMessageHandler): void {
    this.bus.subscribe(profileId, handler);
  }

  /**
   * @param execute when true, the receiving profile's model runs immediately and
   * its reply is recorded as an artifact plus a return interaction.
   */
  async dispatch(envelope: AgentTaskEnvelope, execute = true): Promise<DispatchResult> {
    const message = await this.bus.send({
      id: randomUUID(),
      fromProfileId: envelope.from_profile,
      toProfileId: envelope.to_profile,
      taskId: envelope.task_id,
      content: envelope.input,
      metadata: {
        type: 'agent_task',
        intent: envelope.intent,
        ...(envelope.subject ? { subject: envelope.subject } : {}),
        ...(envelope.constraints ? { constraints: envelope.constraints } : {}),
        ...(envelope.context ? { context: envelope.context } : {}),
      },
    });

    await this.lineage.recordAgentInteraction(
      envelope.task_id,
      envelope.from_profile,
      envelope.to_profile,
      envelope.input,
      { intent: envelope.intent, message_id: message.id, executed: execute },
    );

    if (!execute) {
      return { message };
    }

    const request: ModelRequest = {
      agentId: envelope.to_profile,
      taskId: envelope.task_id,
      input: renderEnvelopePrompt(envelope),
      context: {
        agent_task: true,
        intent: envelope.intent,
        from_profile: envelope.from_profile,
        ...(envelope.context ?? {}),
      },
    };

    try {
      const response = await this.router.send(request);
      await this.lineage.recordModelResponse(
        envelope.task_id,
        envelope.to_profile,
        request,
        response,
      );
      await this.lineage.recordArtifact({
        taskId: envelope.task_id,
        profileId: envelope.to_profile,
        kind: 'response',
        content: response.output,
        metadata: {
          model_type: response.modelType,
          is_mock: response.isMock,
          intent: envelope.intent,
          in_reply_to: message.id,
        },
      });
      // The reply travels back on the bus so the graph shows both directions.
      await this.bus.send({
        fromProfileId: envelope.to_profile,
        toProfileId: envelope.from_profile,
        taskId: envelope.task_id,
        content: response.output,
        metadata: { type: 'agent_reply', intent: envelope.intent, in_reply_to: message.id },
      });
      return { message, response };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      await this.lineage.recordTaskError(envelope.task_id, `agent dispatch failed: ${detail}`);
      throw error;
    }
  }
}
