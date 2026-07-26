import { randomUUID } from 'node:crypto';
import { getDb, nowIso, parseJsonColumn } from '../db/Database.js';
import { buildEvidence } from './Evidence.js';
import type {
  Artifact,
  ArtifactKind,
  LineageEvent,
  LineageEventType,
  Task,
  TaskStatus,
} from '../types.js';
import type { ModelRequest, ModelResponse } from '../models/ModelRouter.js';

type LineageRow = {
  id: string;
  task_id: string | null;
  profile_id: string | null;
  event_type: LineageEventType;
  payload_json: unknown;
  created_at: string;
};

type ArtifactRow = {
  id: string;
  task_id: string | null;
  profile_id: string | null;
  kind: ArtifactKind;
  content_text: string;
  metadata_json: unknown;
  created_at: string;
};

function toLineageEvent(row: LineageRow): LineageEvent {
  return {
    id: row.id,
    task_id: row.task_id,
    profile_id: row.profile_id,
    event_type: row.event_type,
    payload_json: parseJsonColumn<Record<string, unknown>>(row.payload_json, {}),
    created_at: row.created_at,
  };
}

function toArtifact(row: ArtifactRow): Artifact {
  return {
    id: row.id,
    task_id: row.task_id,
    profile_id: row.profile_id,
    kind: row.kind,
    content_text: row.content_text,
    metadata_json: parseJsonColumn<Record<string, unknown>>(row.metadata_json, {}),
    created_at: row.created_at,
  };
}

export type LineageListener = (event: LineageEvent) => void;

/**
 * Records every significant step - task creation, model invocation, chain
 * step, cross-agent message, artifact - as an immutable lineage event, and
 * streams those events to subscribers (used by the WebSocket layer).
 */
export class LineageEngine {
  private readonly listeners = new Set<LineageListener>();

  onEvent(listener: LineageListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: LineageEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[lineage] listener failed:', error);
      }
    }
  }

  private async append(
    taskId: string | null,
    profileId: string | null,
    eventType: LineageEventType,
    payload: Record<string, unknown>,
  ): Promise<LineageEvent> {
    const event: LineageEvent = {
      id: randomUUID(),
      task_id: taskId,
      profile_id: profileId,
      event_type: eventType,
      payload_json: payload,
      created_at: nowIso(),
    };
    await getDb().run(
      `INSERT INTO lineage_events (id, task_id, profile_id, event_type, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.task_id,
        event.profile_id,
        event.event_type,
        JSON.stringify(event.payload_json),
        event.created_at,
      ],
    );
    this.emit(event);
    return event;
  }

  async recordTaskCreated(task: Task): Promise<LineageEvent> {
    return this.append(task.id, task.profile_id, 'task', {
      title: task.title,
      input: task.input_text,
      status: task.status,
      agent_id: task.profile_id,
      ...(task.spec_json ? { task_spec: task.spec_json } : {}),
      evidence: buildEvidence('user', task.input_text, 'task_input'),
    });
  }

  async recordTaskStatus(
    taskId: string,
    status: TaskStatus,
    profileId: string | null = null,
  ): Promise<LineageEvent> {
    return this.append(taskId, profileId, 'decision', { status });
  }

  async recordModelResponse(
    taskId: string | null,
    profileId: string,
    request: ModelRequest,
    response: ModelResponse,
  ): Promise<LineageEvent> {
    return this.append(taskId, profileId, 'artifact', {
      input: request.input,
      output: response.output,
      agent_id: response.agentId,
      connector: response.connector,
      model: response.model,
      model_type: response.modelType,
      usage: response.usage ?? null,
      evidence: buildEvidence('model', response.output, response.modelType),
    });
  }

  async recordChainStep(
    taskId: string,
    stepIndex: number,
    profileId: string,
    request: ModelRequest,
    response: ModelResponse,
  ): Promise<LineageEvent> {
    return this.append(taskId, profileId, 'chain_step', {
      step: stepIndex,
      agent_id: profileId,
      connector: response.connector,
      model: response.model,
      model_type: response.modelType,
      input: request.input,
      output: response.output,
      evidence: buildEvidence('model', response.output, response.modelType),
    });
  }

  async recordAgentInteraction(
    taskId: string | null,
    fromProfileId: string,
    toProfileId: string,
    content: string,
    metadata: Record<string, unknown> = {},
  ): Promise<LineageEvent> {
    return this.append(taskId, fromProfileId, 'interaction', {
      from: fromProfileId,
      to: toProfileId,
      content,
      metadata,
      evidence: buildEvidence('agent', content, fromProfileId),
    });
  }

  async recordTaskError(taskId: string | null, error: string): Promise<LineageEvent> {
    return this.append(taskId, null, 'evidence', {
      error,
      evidence: buildEvidence('system', error, 'error'),
    });
  }

  /** Persists an artifact row and records the matching lineage event. */
  async recordArtifact(input: {
    taskId: string | null;
    profileId: string | null;
    kind: ArtifactKind;
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<Artifact> {
    const artifact: Artifact = {
      id: randomUUID(),
      task_id: input.taskId,
      profile_id: input.profileId,
      kind: input.kind,
      content_text: input.content,
      metadata_json: input.metadata ?? {},
      created_at: nowIso(),
    };
    await getDb().run(
      `INSERT INTO artifacts (id, task_id, profile_id, kind, content_text, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        artifact.id,
        artifact.task_id,
        artifact.profile_id,
        artifact.kind,
        artifact.content_text,
        JSON.stringify(artifact.metadata_json),
        artifact.created_at,
      ],
    );
    return artifact;
  }

  async getLineageForTask(taskId: string): Promise<LineageEvent[]> {
    const rows = await getDb().all<LineageRow>(
      'SELECT * FROM lineage_events WHERE task_id = ? ORDER BY created_at ASC',
      [taskId],
    );
    return rows.map(toLineageEvent);
  }

  async getLineageForProfile(profileId: string, limit = 200): Promise<LineageEvent[]> {
    const rows = await getDb().all<LineageRow>(
      'SELECT * FROM lineage_events WHERE profile_id = ? ORDER BY created_at DESC LIMIT ?',
      [profileId, limit],
    );
    return rows.map(toLineageEvent).reverse();
  }

  async getRecentLineage(limit = 200): Promise<LineageEvent[]> {
    const rows = await getDb().all<LineageRow>(
      'SELECT * FROM lineage_events ORDER BY created_at DESC LIMIT ?',
      [limit],
    );
    return rows.map(toLineageEvent).reverse();
  }

  async getArtifactsForTask(taskId: string): Promise<Artifact[]> {
    const rows = await getDb().all<ArtifactRow>(
      'SELECT * FROM artifacts WHERE task_id = ? ORDER BY created_at ASC',
      [taskId],
    );
    return rows.map(toArtifact);
  }
}
