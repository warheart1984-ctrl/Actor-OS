export type ResourceCost = Partial<Record<string, number>>;

export type RtsStructure = {
  id: string;
  name: string;
  description: string;
  map: { x: number; y: number };
  buildCost: ResourceCost;
  unlocks: {
    unitRoles: string[];
    droneTypes: string[];
    phases: string[];
    skillTags: string[];
  };
};

export type RtsUnitRole = {
  id: string;
  name: string;
  rtsLabel: string;
  families: string[];
  phases: string[];
  stats: Record<string, number>;
  abilities: string[];
  cooldownTicks: number;
  trainCost: ResourceCost;
  commandsDrones: string[];
  upgradePath: string[];
};

export type RtsDrone = {
  id: string;
  name: string;
  description: string;
  cooldownTicks: number;
  deployCost: ResourceCost;
  commandedBy: string[];
  actions: string[];
};

export type RtsResourceDef = {
  id: string;
  name: string;
  description: string;
  initial: number;
  max: number;
  regenPerTick: number;
  bind: string | null;
  higherIsWorse?: boolean;
};

export type RtsTerritory = {
  id: string;
  name: string;
  description: string;
  unlockedByDefault: boolean;
  unlockCost: ResourceCost;
  requiresStructures?: string[];
  unlocksMissions: string[];
  map: { x: number; y: number };
};

export type RtsWinCondition = {
  id: string;
  name: string;
  metric: string;
  target: number;
  description: string;
};

export type RtsCatalog = {
  status: string;
  packRoot: string;
  structures: RtsStructure[];
  unitRoles: RtsUnitRole[];
  drones: RtsDrone[];
  resources: RtsResourceDef[];
  territories: RtsTerritory[];
  winConditions: RtsWinCondition[];
  skills: {
    count: number;
    bySource: Record<string, number>;
    executableInProduct: false;
    sample: Array<{ name: string; source: string; path: string }>;
  };
  honesty: string[];
};

export type RtsMission = {
  id: string;
  goal: string;
  modeKey?: string;
  status: 'active' | 'planned' | 'resolved';
  startedAtTick: number;
  plan?: {
    steps: Array<{ order: number; name: string; role: string; phase: string }>;
    esfrLast: boolean;
    invokeBrief: string;
    mode: { key: string; label: string } | null;
  };
  territoryId?: string;
};

export type RtsSession = {
  id: string;
  createdAt: string;
  tick: number;
  resources: Record<string, number>;
  structures: Array<{ structureId: string; builtAtTick: number }>;
  units: Array<{
    id: string;
    roleId: string;
    agentId: string;
    cooldownUntil: number;
    trainedAtTick: number;
  }>;
  drones: Array<{
    id: string;
    droneTypeId: string;
    commandedByUnitId: string;
    cooldownUntil: number;
    deployedAtTick: number;
  }>;
  territoriesUnlocked: string[];
  missions: RtsMission[];
  incidents: Array<{
    id: string;
    title: string;
    severity: 'low' | 'medium' | 'high';
    status: 'open' | 'mitigating' | 'cleared';
    openedAtTick: number;
    riskDelta: number;
  }>;
  opportunities: Array<{ id: string; title: string; territoryId: string }>;
  scoreboard: {
    featuresShipped: number;
    uptimeScore: number;
    costEfficiency: number;
    revenueScore: number;
    satisfaction: number;
    territoriesOwned: number;
    constitutionalCompliance: number;
  };
  alerts: Array<{ id: string; tick: number; level: string; message: string }>;
  selectedModeKey?: string;
};

export type CrewAgentLite = {
  id: string;
  name: string;
  family: string;
  phase: string;
  order: number;
};
