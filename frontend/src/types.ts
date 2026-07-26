export type ModelBinding = {
  connector: string;
  model: string;
};

export type ProfileSettings = {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  system?: string;
  base_url?: string;
  capabilities?: string[];
};

export type Profile = {
  id: string;
  name: string;
  /** Serialized `connector:model` — prefer `binding`. */
  model_type: string;
  binding: ModelBinding;
  role: string | null;
  settings_json: ProfileSettings;
};

export type TaskSpec = {
  version: '1';
  intent: string;
  goal?: string;
  agent_id: string;
  inputs: { primary: string; [key: string]: unknown };
  constraints?: Record<string, unknown>;
  success_criteria?: string[];
  context?: Record<string, unknown>;
};

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed';

export type Task = {
  id: string;
  profile_id: string;
  title: string;
  input_text: string;
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

export type Artifact = {
  id: string;
  task_id: string | null;
  profile_id: string | null;
  kind: string;
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

export type AgentGraph = {
  nodes: Array<{ id: string; name: string; model_type: string; binding: ModelBinding }>;
  edges: Array<{ from: string; to: string; count: number }>;
};

export type RunResult = {
  taskId: string;
  agentId: string;
  output: string;
  connector: string;
  model: string;
  model_type: string;
  is_mock: boolean;
};

export type ChainResult = {
  taskId: string;
  steps: Array<{
    step: number;
    agentId: string;
    profileId: string;
    connector: string;
    model: string;
    model_type: string;
    is_mock: boolean;
    output: string;
  }>;
};

export type AgentSendResult = {
  status: string;
  message: AgentMessage;
  response?: {
    agentId: string;
    profileId: string;
    connector: string;
    model: string;
    model_type: string;
    is_mock: boolean;
    output: string;
  };
};

export type Health = {
  status: string;
  database: string;
  providers: Array<{ provider: string; live: boolean }>;
};
