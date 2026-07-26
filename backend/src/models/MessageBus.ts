import { randomUUID } from 'node:crypto';
import { getDb, nowIso, parseJsonColumn } from '../db/Database.js';
import { parseBinding } from '../core/ModelBinding.js';
import type { AgentGraph, AgentGraphEdge, AgentGraphNode, AgentMessage } from '../types.js';

export type AgentMessageInput = {
  id?: string;
  fromProfileId: string;
  toProfileId: string;
  taskId?: string | null;
  content: string;
  metadata?: Record<string, unknown>;
};

export type AgentMessageHandler = (message: AgentMessage) => void | Promise<void>;

type MessageRow = {
  id: string;
  from_profile: string;
  to_profile: string;
  task_id: string | null;
  content_text: string;
  metadata_json: unknown;
  created_at: string;
};

function toMessage(row: MessageRow): AgentMessage {
  return {
    id: row.id,
    from_profile: row.from_profile,
    to_profile: row.to_profile,
    task_id: row.task_id,
    content_text: row.content_text,
    metadata_json: parseJsonColumn<Record<string, unknown>>(row.metadata_json, {}),
    created_at: row.created_at,
  };
}

/**
 * Delivers messages between profiles and persists every one of them, so the
 * agent graph and lineage can be reconstructed from storage alone.
 */
export class MessageBus {
  private readonly subscribers = new Map<string, AgentMessageHandler>();

  subscribe(profileId: string, handler: AgentMessageHandler): void {
    this.subscribers.set(profileId, handler);
  }

  unsubscribe(profileId: string): void {
    this.subscribers.delete(profileId);
  }

  subscriberIds(): string[] {
    return [...this.subscribers.keys()];
  }

  private async persist(input: AgentMessageInput): Promise<AgentMessage> {
    const message: AgentMessage = {
      id: input.id ?? randomUUID(),
      from_profile: input.fromProfileId,
      to_profile: input.toProfileId,
      task_id: input.taskId ?? null,
      content_text: input.content,
      metadata_json: input.metadata ?? {},
      created_at: nowIso(),
    };
    await getDb().run(
      `INSERT INTO agent_messages (id, from_profile, to_profile, task_id, content_text, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.from_profile,
        message.to_profile,
        message.task_id,
        message.content_text,
        JSON.stringify(message.metadata_json),
        message.created_at,
      ],
    );
    return message;
  }

  async send(input: AgentMessageInput): Promise<AgentMessage> {
    const message = await this.persist(input);
    const handler = this.subscribers.get(message.to_profile);
    if (handler) {
      await handler(message);
    }
    return message;
  }

  async broadcast(
    fromProfileId: string,
    content: string,
    taskId?: string | null,
    recipients?: string[],
  ): Promise<AgentMessage[]> {
    const targets = (recipients ?? this.subscriberIds()).filter((id) => id !== fromProfileId);
    const sent: AgentMessage[] = [];
    for (const toProfileId of targets) {
      sent.push(
        await this.send({
          fromProfileId,
          toProfileId,
          taskId: taskId ?? null,
          content,
          metadata: { type: 'broadcast' },
        }),
      );
    }
    return sent;
  }

  async getMessagesForTask(taskId: string): Promise<AgentMessage[]> {
    const rows = await getDb().all<MessageRow>(
      'SELECT * FROM agent_messages WHERE task_id = ? ORDER BY created_at ASC',
      [taskId],
    );
    return rows.map(toMessage);
  }

  async getMessagesBetween(a: string, b: string): Promise<AgentMessage[]> {
    const rows = await getDb().all<MessageRow>(
      `SELECT * FROM agent_messages
       WHERE (from_profile = ? AND to_profile = ?) OR (from_profile = ? AND to_profile = ?)
       ORDER BY created_at ASC`,
      [a, b, b, a],
    );
    return rows.map(toMessage);
  }

  /** Nodes are agent profiles; edges are directed message counts between them. */
  async getGraph(): Promise<AgentGraph> {
    const rows = await getDb().all<{ id: string; name: string; model_type: string }>(
      'SELECT id, name, model_type FROM profiles ORDER BY name ASC',
    );
    const nodes: AgentGraphNode[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      model_type: row.model_type,
      binding: parseBinding(row.model_type),
    }));
    const edges = await getDb().all<AgentGraphEdge>(
      `SELECT from_profile AS "from", to_profile AS "to", COUNT(*) AS count
       FROM agent_messages
       GROUP BY from_profile, to_profile`,
    );
    return {
      nodes,
      edges: edges.map((edge) => ({ ...edge, count: Number(edge.count) })),
    };
  }
}
