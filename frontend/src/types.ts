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

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'rejected';

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
  mandalaCrew?: {
    status: string;
    preEsfrCount: number;
    esfrSlot: number;
    phaseCount?: number;
    modeKeyCount: number;
    vendorCatalogCount: number;
  };
  rts?: {
    status: string;
    skillCount: number;
    structureCount: number;
  };
};

export type CrewPhase = {
  id: string;
  name: string;
  orderStart: number;
  orderEnd: number;
  family: string;
};

export type CrewAgent = {
  id: string;
  name: string;
  description: string;
  family: string;
  phase: string;
  order: number;
  source: string;
  cursor_agent: string;
};

export type CrewAgentDetail = CrewAgent & {
  preferredSkills: string[];
};

export type ModeEntry = {
  id: number;
  key: string;
  crewMode: string;
  actorMode: string;
  stance: string;
  label: string;
};

export type VendorSkillHit = {
  name: string;
  preferred: boolean;
  preferredBy: string[];
  paths?: string[];
};

export type CrewStatus = {
  status: string;
  packRoot: string;
  preEsfrCount: number;
  esfrSlot: number;
  esfrId: string;
  phaseCount: number;
  phases: CrewPhase[];
  modeKeyCount: number;
  nativeNamedModes: number;
  vendorCatalogCount: number;
  vendorPreferredUnique: number;
  vendorPathIndexCount: number;
  roleSkills: string[];
  honesty: string[];
  foreman?: { id: string; inRoster: false };
  endpoints?: Record<string, string>;
};

export type CrewPlanStep = {
  order: number;
  agentId: string;
  name: string;
  description: string;
  family: string;
  phase: string;
  role: 'pre_esfr' | 'esfr';
  cursor_agent: string;
  preferredSkills: string[];
  onDemandSkills: string[];
};

export type CrewPlan = {
  goal: string;
  mode: ModeEntry | null;
  phases: string[];
  steps: CrewPlanStep[];
  esfrLast: boolean;
  skillRouting: {
    preferredUnique: number;
    catalogUnique: number;
    requested: string[];
    unresolved: string[];
  };
  invokeBrief: string;
  honesty: {
    modeAutoApply: {
      status: string;
      productEnforced: string[];
      cursorDeclared: string[];
      notClaimed: string[];
    };
    status: string;
    note: string;
  };
};

export type PipelineDefinition = {
  id: string;
  name: string;
  description: string;
  steps: Array<{ label: string; agentId: string; instruction?: string }>;
  gateAgentId: string;
};

export type GateCheck = {
  id: 'outputs_non_empty' | 'evidence_intact' | 'must_include' | 'model_review';
  status: 'passed' | 'failed' | 'skipped';
  detail: string;
};

export type PipelineRunResult = {
  pipelineId: string;
  taskId: string;
  status: TaskStatus;
  verdict: 'approved' | 'rejected';
  checks: GateCheck[];
  warnings: string[];
  review: string | null;
  steps: Array<{
    step: number;
    agentId: string;
    connector: string;
    model: string;
    is_mock: boolean;
    output: string;
  }>;
  final_output: string;
};
