import { sha256 } from './Evidence.js';
import type { LineageEngine } from './LineageEngine.js';
import type { ModelResponse, ModelRouter } from '../models/ModelRouter.js';
import type { Task } from '../types.js';

export type GateCheckStatus = 'passed' | 'failed' | 'skipped';

export type GateCheck = {
  id: 'outputs_non_empty' | 'evidence_intact' | 'must_include' | 'model_review';
  status: GateCheckStatus;
  detail: string;
};

export type GateVerdict = {
  verdict: 'approved' | 'rejected';
  checks: GateCheck[];
  /** Things a reviewer should know that do not fail the gate on their own. */
  warnings: string[];
  gateAgentId: string;
  /** The gate agent's own review text, when it was invoked. */
  review: string | null;
};

const VERDICT_LINE = /^\s*VERDICT:\s*(APPROVE|REJECT)\b/gim;

/**
 * Pulls the last `VERDICT: APPROVE|REJECT` line out of a review. Returns null
 * when there is none, which the gate treats as a rejection (fail closed).
 */
export function parseVerdictLine(text: string): 'approve' | 'reject' | null {
  let last: string | null = null;
  for (const match of text.matchAll(VERDICT_LINE)) {
    last = match[1] ?? null;
  }
  if (last === null) return null;
  return last.toUpperCase() === 'APPROVE' ? 'approve' : 'reject';
}

function renderReviewPrompt(task: Task, finalOutput: string): string {
  const spec = task.spec_json;
  const lines = [
    'You are the final standards gate for a multi-agent pipeline.',
    'Decide whether the FINAL OUTPUT below satisfies the task. Be strict:',
    'reject unsupported factual claims, missing requirements, or off-task output.',
    '',
    `Task: ${task.title}`,
    `Request: ${spec?.inputs.primary ?? task.input_text}`,
  ];
  if (spec?.success_criteria?.length) {
    lines.push('Success criteria:', ...spec.success_criteria.map((item) => `- ${item}`));
  }
  const mustInclude = spec?.constraints?.must_include;
  if (mustInclude?.length) {
    lines.push(`Must include: ${mustInclude.join(', ')}`);
  }
  lines.push(
    '',
    'FINAL OUTPUT:',
    finalOutput,
    '',
    'List any problems briefly, then end with exactly one line:',
    'VERDICT: APPROVE   or   VERDICT: REJECT',
  );
  return lines.join('\n');
}

/**
 * ESFR (Engineer Standards Final Review) as code: the last step of a crew
 * pipeline, able to reject the result. Deterministic checks run first and
 * cannot be talked past by a model; the gate agent's review is one more check.
 *
 * Approved only when every check that ran passed. A check is `skipped` only
 * when it has nothing to evaluate (no must_include terms, mock gate agent).
 */
export class StandardsGate {
  constructor(
    private readonly router: ModelRouter,
    private readonly lineage: LineageEngine,
    readonly gateAgentId: string,
  ) {}

  async evaluate(task: Task, responses: ModelResponse[]): Promise<GateVerdict> {
    const checks: GateCheck[] = [];
    const warnings: string[] = [];
    const finalOutput = responses[responses.length - 1]?.output ?? '';

    const empty = responses
      .map((response, index) => (response.output.trim().length === 0 ? index : -1))
      .filter((index) => index !== -1);
    checks.push({
      id: 'outputs_non_empty',
      status: responses.length > 0 && empty.length === 0 ? 'passed' : 'failed',
      detail:
        responses.length === 0
          ? 'Pipeline produced no steps'
          : empty.length === 0
            ? `All ${responses.length} steps produced output`
            : `Empty output at step(s) ${empty.join(', ')}`,
    });

    checks.push(await this.checkEvidence(task.id, responses.length));

    const mustInclude = task.spec_json?.constraints?.must_include ?? [];
    if (mustInclude.length === 0) {
      checks.push({ id: 'must_include', status: 'skipped', detail: 'No must_include terms in TaskSpec' });
    } else {
      const haystack = finalOutput.toLowerCase();
      const missing = mustInclude.filter((term) => !haystack.includes(term.toLowerCase()));
      checks.push({
        id: 'must_include',
        status: missing.length === 0 ? 'passed' : 'failed',
        detail:
          missing.length === 0
            ? `Final output includes: ${mustInclude.join(', ')}`
            : `Final output is missing: ${missing.join(', ')}`,
      });
    }

    const mockSteps = responses.filter((response) => response.isMock).length;
    if (mockSteps > 0) {
      warnings.push(
        `${mockSteps} of ${responses.length} steps ran on the mock connector; their output is synthetic.`,
      );
    }

    const gateResponse = await this.router.send({
      agentId: this.gateAgentId,
      taskId: task.id,
      input: renderReviewPrompt(task, finalOutput),
      context: { gate: 'esfr' },
    });
    await this.lineage.recordModelResponse(
      task.id,
      this.gateAgentId,
      { agentId: this.gateAgentId, taskId: task.id, input: '[standards gate review prompt]' },
      gateResponse,
    );
    const review = gateResponse.output;
    if (gateResponse.isMock) {
      checks.push({
        id: 'model_review',
        status: 'skipped',
        detail: 'Gate agent is on the mock connector; no model judgement was made',
      });
      warnings.push('Standards gate agent has no live connector; only deterministic checks decided.');
    } else {
      const parsed = parseVerdictLine(gateResponse.output);
      checks.push({
        id: 'model_review',
        status: parsed === 'approve' ? 'passed' : 'failed',
        detail:
          parsed === null
            ? 'Gate agent gave no VERDICT line; failing closed'
            : `Gate agent (${gateResponse.modelType}) said ${parsed.toUpperCase()}`,
      });
    }

    const verdict = checks.every((check) => check.status !== 'failed') ? 'approved' : 'rejected';
    return { verdict, checks, warnings, gateAgentId: this.gateAgentId, review };
  }

  /**
   * Re-reads this task's chain steps from lineage storage and recomputes each
   * output hash. A mismatch means the trail no longer matches what was produced.
   */
  private async checkEvidence(taskId: string, expectedSteps: number): Promise<GateCheck> {
    const events = await this.lineage.getLineageForTask(taskId);
    const steps = events.filter((event) => event.event_type === 'chain_step');
    const broken: number[] = [];
    for (const event of steps) {
      const payload = event.payload_json;
      const output = typeof payload['output'] === 'string' ? payload['output'] : null;
      const evidence = payload['evidence'] as { content_sha256?: unknown } | undefined;
      const step = typeof payload['step'] === 'number' ? payload['step'] : -1;
      if (output === null || evidence?.content_sha256 !== sha256(output)) {
        broken.push(step);
      }
    }
    if (steps.length !== expectedSteps) {
      return {
        id: 'evidence_intact',
        status: 'failed',
        detail: `Expected ${expectedSteps} chain_step events in lineage, found ${steps.length}`,
      };
    }
    return {
      id: 'evidence_intact',
      status: broken.length === 0 ? 'passed' : 'failed',
      detail:
        broken.length === 0
          ? `${steps.length} chain_step hashes re-verified against stored output`
          : `Hash mismatch at step(s) ${broken.join(', ')}`,
    };
  }
}
