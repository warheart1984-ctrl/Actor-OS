/**
 * Shared domain types for LineageStudio.
 *
 * These mirror the database schema in `src/db/schema.sql`. JSON columns are
 * always exposed to application code as parsed objects, never as raw strings.
 *
 * Runtime shape (Agent OS):
 *   Intent → TaskSpec → Agent Profile → ModelRouter → Connector → Provider
 */

import type { ModelBinding } from './core/ModelBinding.js';

export type { ModelBinding } from './core/ModelBinding.js';

export type ProfileSettings = {
  /** Optional model override; when set, wins over binding.model for invocation. */
  model?: string;
  temperature?: number;
  max_tokens?: number;
  /** Optional persona prompt prepended to every invocation. */
  system?: string;
  /** Override endpoint for OpenAI-compatible and local providers. */
  base_url?: string;
  /** Declared capabilities for this agent (informational for now). */
  capabilities?: string[];
};

/**
 * An agent profile: durable identity, role, and lineage owner.
 * The connector/model binding is swappable without changing identity.
 */
export type Profile = {
  id: string;
  name: string;
  /**
   * Serialized binding `connector:model` (storage / wire compat).
   * Prefer `binding` in application code.
   */
  model_type: string;
  /** Parsed execution binding — connector is the provider, model is the id. */
  binding: ModelBinding;
  role: string | null;
  settings_json: ProfileSettings;
};

/** `rejected` means the chain ran but the standards gate refused the result. */
export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'rejected';

export type TaskSpecConstraints = {
  tone?: string;
  length?: string;
  must_include?: string[];
  [key: string]: unknown;
};

/**
 * Canonical work contract before ModelRouter. Stable across providers;
 * connectors never see this object directly — only the rendered prompt.
 */
export type TaskSpec = {
  version: '1';
  /** What the agent should do (e.g. draft, review, summarize). */
  intent: string;
  /** Optional outcome description. */
  goal?: string;
  /** Owning agent profile id. */
  agent_id: string;
  inputs: {
    primary: string;
    [key: string]: unknown;
  };
  constraints?: TaskSpecConstraints;
  success_criteria?: string[];
  context?: Record<string, unknown>;
};

export type Task = {
  id: string;
  /** Owning agent profile id (column name kept for schema compat). */
  profile_id: string;
  title: string;
  input_text: string;
  /** Canonical TaskSpec; null only for legacy rows created before this field. */
  spec_json: TaskSpec | null;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
};

export type LineageEventType =
  | 'task'
  | 'decision'
  | 'evidence'
  | 'interaction'
  | 'artifact'
  | 'chain_step';

export type LineageEvent = {
  id: string;
  task_id: string | null;
  profile_id: string | null;
  event_type: LineageEventType;
  payload_json: Record<string, unknown>;
  created_at: string;
};

export type ArtifactKind =
  | 'document'
  | 'email'
  | 'summary'
  | 'code'
  | 'response'
  | 'task_spec'
  | 'gate_report';

export type Artifact = {
  id: string;
  task_id: string | null;
  profile_id: string | null;
  kind: ArtifactKind;
  content_text: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
};

export type AgentMessage = {
  id: string;
  from_profile: string;
  to_profile: string;
  task_id: string | null;
  content_text: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
};

/**
 * Structured envelope exchanged between agent profiles. The orchestration
 * layer — not the models themselves — understands this shape.
 */
export type AgentTaskEnvelope = {
  type: 'agent_task';
  from_profile: string;
  to_profile: string;
  task_id: string | null;
  /** What the receiving agent should do: refine, review, fact_check, summarize, ... */
  intent: string;
  subject?: string;
  input: string;
  constraints?: TaskSpecConstraints;
  context?: {
    previous_steps?: Array<{ agent: string; summary: string }>;
    [key: string]: unknown;
  };
};

export type AgentGraphNode = {
  id: string;
  name: string;
  model_type: string;
  binding: ModelBinding;
};

export type AgentGraphEdge = {
  from: string;
  to: string;
  count: number;
};

export type AgentGraph = {
  nodes: AgentGraphNode[];
  edges: AgentGraphEdge[];
};
