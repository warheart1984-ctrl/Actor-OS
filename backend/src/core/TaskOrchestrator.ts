import { randomUUID } from 'node:crypto';
import { getDb, nowIso } from '../db/Database.js';
import {
  buildTaskSpec,
  intentFromTitle,
  parseTaskSpec,
  renderTaskSpecPrompt,
} from './TaskSpec.js';
import type { LineageEngine } from './LineageEngine.js';
import type { ModelRequest, ModelResponse, ModelRouter } from '../models/ModelRouter.js';
import type { Task, TaskSpec, TaskStatus } from '../types.js';

export type ChainStepInput = {
  /** Agent profile id for this step. */
  agentId: string;
  /** Omit to feed the previous step's output forward. */
  input?: string;
};

export type CreateTaskInput = {
  agentId: string;
  title: string;
  input: string;
  intent?: string;
  goal?: string;
  constraints?: TaskSpec['constraints'];
  successCriteria?: string[];
  /** Full TaskSpec; when provided, wins over the field-wise builders above. */
  spec?: TaskSpec;
};

export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = 'TaskNotFoundError';
  }
}

type TaskRow = {
  id: string;
  profile_id: string;
  title: string;
  input_text: string;
  spec_json: unknown;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
};

function toTask(row: TaskRow): Task {
  let spec: TaskSpec | null = null;
  if (row.spec_json !== null && row.spec_json !== undefined) {
    try {
      const parsed =
        typeof row.spec_json === 'string'
          ? (JSON.parse(row.spec_json) as unknown)
          : row.spec_json;
      spec = parseTaskSpec(parsed);
    } catch {
      spec = null;
    }
  }
  return {
    id: row.id,
    profile_id: row.profile_id,
    title: row.title,
    input_text: row.input_text,
    spec_json: spec,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Owns the task lifecycle: create (with TaskSpec), run against one agent, or
 * run a chain of agents. Every transition and model result goes to lineage.
 *
 * Intent → TaskSpec → Agent Profile → ModelRouter → Connector
 */
export class TaskOrchestrator {
  constructor(
    private readonly router: ModelRouter,
    private readonly lineage: LineageEngine,
  ) {}

  async createTask(input: CreateTaskInput): Promise<Task> {
    const spec =
      input.spec ??
      buildTaskSpec({
        agentId: input.agentId,
        intent: input.intent ?? intentFromTitle(input.title),
        primaryInput: input.input,
        ...(input.goal ? { goal: input.goal } : {}),
        ...(input.constraints ? { constraints: input.constraints } : {}),
        ...(input.successCriteria ? { successCriteria: input.successCriteria } : {}),
      });

    if (spec.agent_id !== input.agentId) {
      throw new Error('TaskSpec.agent_id must match the owning agent');
    }

    const now = nowIso();
    const task: Task = {
      id: randomUUID(),
      profile_id: input.agentId,
      title: input.title,
      input_text: input.input,
      spec_json: spec,
      status: 'pending',
      created_at: now,
      updated_at: now,
    };
    await getDb().run(
      `INSERT INTO tasks (id, profile_id, title, input_text, spec_json, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.profile_id,
        task.title,
        task.input_text,
        JSON.stringify(spec),
        task.status,
        task.created_at,
        task.updated_at,
      ],
    );
    await this.lineage.recordTaskCreated(task);
    await this.lineage.recordArtifact({
      taskId: task.id,
      profileId: task.profile_id,
      kind: 'task_spec',
      content: JSON.stringify(spec, null, 2),
      metadata: { version: spec.version, intent: spec.intent },
    });
    return task;
  }

  async findTask(taskId: string): Promise<Task | undefined> {
    const row = await getDb().get<TaskRow>('SELECT * FROM tasks WHERE id = ?', [taskId]);
    return row ? toTask(row) : undefined;
  }

  async loadTask(taskId: string): Promise<Task> {
    const task = await this.findTask(taskId);
    if (!task) throw new TaskNotFoundError(taskId);
    return task;
  }

  async listTasks(limit = 100): Promise<Task[]> {
    const rows = await getDb().all<TaskRow>(
      'SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?',
      [limit],
    );
    return rows.map(toTask);
  }

  async listTasksForProfile(profileId: string): Promise<Task[]> {
    const rows = await getDb().all<TaskRow>(
      'SELECT * FROM tasks WHERE profile_id = ? ORDER BY created_at DESC',
      [profileId],
    );
    return rows.map(toTask);
  }

  private async setStatus(taskId: string, status: TaskStatus, profileId: string | null = null): Promise<void> {
    await getDb().run('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?', [
      status,
      nowIso(),
      taskId,
    ]);
    await this.lineage.recordTaskStatus(taskId, status, profileId);
  }

  async updateInput(taskId: string, input: string): Promise<Task> {
    const task = await this.loadTask(taskId);
    const nextSpec = task.spec_json
      ? {
          ...task.spec_json,
          inputs: { ...task.spec_json.inputs, primary: input },
        }
      : buildTaskSpec({
          agentId: task.profile_id,
          intent: intentFromTitle(task.title),
          primaryInput: input,
        });

    await getDb().run(
      'UPDATE tasks SET input_text = ?, spec_json = ?, updated_at = ? WHERE id = ?',
      [input, JSON.stringify(nextSpec), nowIso(), taskId],
    );
    return { ...task, input_text: input, spec_json: nextSpec };
  }

  /** Resolves the prompt from TaskSpec when present; falls back to raw input. */
  private promptFor(task: Task, overrideInput?: string): string {
    if (overrideInput && overrideInput.trim().length > 0) {
      return overrideInput;
    }
    if (task.spec_json) {
      return renderTaskSpecPrompt(task.spec_json);
    }
    return task.input_text;
  }

  /** Runs the task against its owning agent profile. */
  async runTask(taskId: string): Promise<ModelResponse> {
    const task = await this.loadTask(taskId);
    await this.setStatus(task.id, 'running', task.profile_id);

    const request: ModelRequest = {
      agentId: task.profile_id,
      taskId: task.id,
      input: this.promptFor(task),
      context: {
        task_spec: task.spec_json,
      },
    };

    try {
      const response = await this.router.send(request);
      await this.lineage.recordModelResponse(task.id, task.profile_id, request, response);
      await this.lineage.recordArtifact({
        taskId: task.id,
        profileId: task.profile_id,
        kind: 'response',
        content: response.output,
        metadata: {
          connector: response.connector,
          model: response.model,
          model_type: response.modelType,
          is_mock: response.isMock,
        },
      });
      await this.setStatus(task.id, 'done', task.profile_id);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.lineage.recordTaskError(task.id, message);
      await this.setStatus(task.id, 'failed', task.profile_id);
      throw error;
    }
  }

  /** Runs an ordered multi-agent chain, recording one lineage step each. */
  async runChain(taskId: string, steps: ChainStepInput[]): Promise<ModelResponse[]> {
    const task = await this.loadTask(taskId);
    if (steps.length === 0) {
      throw new Error('A chain needs at least one step');
    }
    await this.setStatus(task.id, 'running', task.profile_id);

    const requests: ModelRequest[] = steps.map((step, index) => ({
      agentId: step.agentId,
      taskId: task.id,
      // First step seeds from TaskSpec; later steps inherit prior output.
      input: step.input ?? (index === 0 ? this.promptFor(task) : ''),
      context: {
        task_spec: task.spec_json,
      },
    }));

    try {
      const responses = await this.router.chain(requests, async (index, request, response) => {
        await this.lineage.recordChainStep(task.id, index, request.agentId, request, response);
      });

      const final = responses[responses.length - 1];
      if (final) {
        await this.lineage.recordArtifact({
          taskId: task.id,
          profileId: final.agentId,
          kind: 'response',
          content: final.output,
          metadata: {
            connector: final.connector,
            model: final.model,
            model_type: final.modelType,
            is_mock: final.isMock,
            chain_length: responses.length,
          },
        });
      }
      await this.setStatus(task.id, 'done', task.profile_id);
      return responses;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.lineage.recordTaskError(task.id, message);
      await this.setStatus(task.id, 'failed', task.profile_id);
      throw error;
    }
  }
}
