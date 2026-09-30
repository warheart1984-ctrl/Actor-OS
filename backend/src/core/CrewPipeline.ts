import { StandardsGate, type GateVerdict } from './StandardsGate.js';
import type { LineageEngine } from './LineageEngine.js';
import type { ChainStepInput, TaskOrchestrator } from './TaskOrchestrator.js';
import type { ModelResponse, ModelRouter } from '../models/ModelRouter.js';
import type { Task } from '../types.js';

export type PipelineStep = ChainStepInput & {
  /** Short label for UI and docs, e.g. "review". */
  label: string;
};

export type PipelineDefinition = {
  id: string;
  name: string;
  description: string;
  steps: PipelineStep[];
  /** Profile id of the standards gate that approves or rejects the result. */
  gateAgentId: string;
};

/**
 * Draft → review → fact-check → summarize, then the standards gate. Each step
 * is a real agent profile run through ModelRouter, so every hop is in lineage.
 */
export const DOC_REVIEW_PIPELINE: PipelineDefinition = {
  id: 'doc-review',
  name: 'Draft → review → fact-check',
  description:
    'Drafts a document, edits it, checks its facts, adds a TL;DR, then a standards gate approves or rejects it.',
  steps: [
    { label: 'draft', agentId: 'agent_drafter' },
    {
      label: 'review',
      agentId: 'agent_research',
      instruction:
        'Revise the document below for clarity and structure. Keep its meaning. Return only the full revised document.',
    },
    {
      label: 'fact-check',
      agentId: 'agent_factcheck',
      instruction:
        'Check every factual claim in the document below. Remove unsupported claims or mark them [unverified]. Return only the full corrected document.',
    },
    {
      label: 'summarize',
      agentId: 'agent_summary',
      instruction:
        'Put a 2-3 sentence "TL;DR:" at the top of the document below, then return the full document unchanged beneath it.',
    },
  ],
  gateAgentId: 'agent_gate',
};

export const PIPELINES: PipelineDefinition[] = [DOC_REVIEW_PIPELINE];

/** Every profile id a pipeline needs, gate included. */
export function pipelineAgentIds(pipelines: PipelineDefinition[] = PIPELINES): string[] {
  return [...new Set(pipelines.flatMap((p) => [...p.steps.map((s) => s.agentId), p.gateAgentId]))];
}

export class PipelineNotFoundError extends Error {
  constructor(id: string) {
    super(`Pipeline not found: ${id}`);
    this.name = 'PipelineNotFoundError';
  }
}

export type PipelineRunInput = {
  title: string;
  input: string;
  mustInclude?: string[];
  successCriteria?: string[];
};

export type PipelineRunResult = {
  pipelineId: string;
  task: Task;
  responses: ModelResponse[];
  gate: GateVerdict;
};

/** Runs a named pipeline as one task: a gated chain with a full lineage trail. */
export class CrewPipelineRunner {
  constructor(
    private readonly tasks: TaskOrchestrator,
    private readonly router: ModelRouter,
    private readonly lineage: LineageEngine,
    private readonly pipelines: PipelineDefinition[] = PIPELINES,
  ) {}

  list(): PipelineDefinition[] {
    return this.pipelines;
  }

  get(id: string): PipelineDefinition {
    const pipeline = this.pipelines.find((entry) => entry.id === id);
    if (!pipeline) throw new PipelineNotFoundError(id);
    return pipeline;
  }

  async run(pipelineId: string, input: PipelineRunInput): Promise<PipelineRunResult> {
    const pipeline = this.get(pipelineId);
    const first = pipeline.steps[0];
    if (!first) throw new Error(`Pipeline ${pipeline.id} has no steps`);

    const task = await this.tasks.createTask({
      agentId: first.agentId,
      title: input.title,
      input: input.input,
      intent: 'draft',
      ...(input.mustInclude?.length ? { constraints: { must_include: input.mustInclude } } : {}),
      ...(input.successCriteria?.length ? { successCriteria: input.successCriteria } : {}),
    });

    const gate = new StandardsGate(this.router, this.lineage, pipeline.gateAgentId);
    const steps: ChainStepInput[] = pipeline.steps.map(({ agentId, input: stepInput, instruction }) => ({
      agentId,
      ...(stepInput ? { input: stepInput } : {}),
      ...(instruction ? { instruction } : {}),
    }));
    const result = await this.tasks.runGatedChain(task.id, steps, gate);
    return {
      pipelineId: pipeline.id,
      task: await this.tasks.loadTask(task.id),
      responses: result.responses,
      gate: result.gate,
    };
  }
}
