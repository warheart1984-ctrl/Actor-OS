import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

export type RtsSkillCatalogEntry = {
  name: string;
  path: string;
  paths?: string[];
  source: 'vendor' | 'cursor' | 'ls-role';
  preferredByAgents: string[];
};

export type RtsCatalog = {
  status: 'declared_operable';
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
    sample: RtsSkillCatalogEntry[];
  };
  honesty: string[];
};

function defaultCrewPackRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, '../mandala-crew'),
    path.resolve(here, '../../../.cursor/mandala-crew'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'rts', 'structures.json'))) return candidate;
  }
  return candidates[1] ?? candidates[0]!;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

export class RtsEngine {
  readonly packRoot: string;
  private readonly rtsRoot: string;
  private readonly structures: RtsStructure[];
  private readonly unitRoles: RtsUnitRole[];
  private readonly drones: RtsDrone[];
  private readonly resources: RtsResourceDef[];
  private readonly territories: RtsTerritory[];
  private readonly winConditions: RtsWinCondition[];
  private readonly skillEntries: RtsSkillCatalogEntry[];
  private readonly skillBySource: Record<string, number>;

  constructor(packRoot = process.env['MANDALA_CREW_ROOT'] ?? defaultCrewPackRoot()) {
    this.packRoot = packRoot;
    this.rtsRoot = path.join(packRoot, 'rts');
    const required = [
      'structures.json',
      'unit-roles.json',
      'drones.json',
      'resources.json',
      'territories.json',
      'win-conditions.json',
    ];
    for (const file of required) {
      const full = path.join(this.rtsRoot, file);
      if (!fs.existsSync(full)) throw new Error(`RTS pack missing: ${full}`);
    }

    this.structures = readJson<{ structures: RtsStructure[] }>(
      path.join(this.rtsRoot, 'structures.json'),
    ).structures;
    this.unitRoles = readJson<{ roles: RtsUnitRole[] }>(path.join(this.rtsRoot, 'unit-roles.json')).roles;
    this.drones = readJson<{ drones: RtsDrone[] }>(path.join(this.rtsRoot, 'drones.json')).drones;
    this.resources = readJson<{ resources: RtsResourceDef[] }>(
      path.join(this.rtsRoot, 'resources.json'),
    ).resources;
    this.territories = readJson<{ territories: RtsTerritory[] }>(
      path.join(this.rtsRoot, 'territories.json'),
    ).territories;
    this.winConditions = readJson<{ conditions: RtsWinCondition[] }>(
      path.join(this.rtsRoot, 'win-conditions.json'),
    ).conditions;

    const catalogPath = path.join(packRoot, 'rts-skill-catalog.json');
    if (fs.existsSync(catalogPath)) {
      const catalog = readJson<{
        skills: RtsSkillCatalogEntry[];
        bySource?: Record<string, number>;
      }>(catalogPath);
      this.skillEntries = catalog.skills ?? [];
      this.skillBySource = catalog.bySource ?? {};
    } else {
      this.skillEntries = [];
      this.skillBySource = {};
    }
  }

  getCatalog(skillSampleLimit = 40): RtsCatalog {
    return {
      status: 'declared_operable',
      packRoot: this.packRoot,
      structures: this.structures.map((s) => ({ ...s, unlocks: { ...s.unlocks } })),
      unitRoles: this.unitRoles.map((r) => ({ ...r })),
      drones: this.drones.map((d) => ({ ...d })),
      resources: this.resources.map((r) => ({ ...r })),
      territories: this.territories.map((t) => ({ ...t })),
      winConditions: this.winConditions.map((w) => ({ ...w })),
      skills: {
        count: this.skillEntries.length,
        bySource: { ...this.skillBySource },
        executableInProduct: false,
        sample: this.skillEntries.slice(0, skillSampleLimit),
      },
      honesty: [
        'RTS pack is filesystem catalog + in-memory session sim — not a commercial game backend.',
        'Skills are indexed (vendor/cursor/ls-role); Cursor still executes by opening SKILL.md.',
        'Missions route through Mandala crew plan + ESFR; ModeKey auto-apply remains approximated.',
        'Constitutional compliance meter is declared alignment — not an automated promotion enforcer.',
      ],
    };
  }

  getStructure(id: string): RtsStructure | undefined {
    return this.structures.find((s) => s.id === id);
  }

  getUnitRole(id: string): RtsUnitRole | undefined {
    return this.unitRoles.find((r) => r.id === id);
  }

  getDrone(id: string): RtsDrone | undefined {
    return this.drones.find((d) => d.id === id);
  }

  getTerritory(id: string): RtsTerritory | undefined {
    return this.territories.find((t) => t.id === id);
  }

  initialResources(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const r of this.resources) out[r.id] = r.initial;
    return out;
  }

  resourceDefs(): RtsResourceDef[] {
    return this.resources.map((r) => ({ ...r }));
  }

  searchSkills(q?: string, limit = 50, offset = 0): { total: number; items: RtsSkillCatalogEntry[] } {
    const query = q?.trim().toLowerCase();
    const filtered = query
      ? this.skillEntries.filter(
          (s) => s.name.toLowerCase().includes(query) || s.source.includes(query),
        )
      : this.skillEntries;
    return {
      total: filtered.length,
      items: filtered.slice(offset, offset + limit),
    };
  }
}
