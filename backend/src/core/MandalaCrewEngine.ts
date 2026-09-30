import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

export type EsfrGate = {
  id: string;
  order: number;
  cursor_agent: string;
  name: string;
  description?: string;
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

export type PipelineStep = {
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
  steps: PipelineStep[];
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
      status: 'approximated';
      productEnforced: string[];
      cursorDeclared: string[];
      notClaimed: string[];
    };
    status: 'declared_operable';
    note: string;
  };
};

export type CrewStatus = {
  status: 'declared_operable';
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
  foreman: { id: string; inRoster: false };
};

const ROLE_SKILLS = [
  'ls-architect',
  'ls-builder',
  'ls-coding',
  'ls-implementor',
  'ls-reviewer',
  'ls-inspector',
  'ls-esfr',
  'ls-crew',
] as const;

const DEFAULT_PHASES: CrewPhase[] = [
  { id: 'vision', name: 'Vision & Discovery', orderStart: 1, orderEnd: 10, family: 'vision' },
  {
    id: 'architecture',
    name: 'Architecture & Specification',
    orderStart: 11,
    orderEnd: 25,
    family: 'architecture',
  },
  { id: 'design', name: 'Design & UX', orderStart: 26, orderEnd: 35, family: 'design' },
  {
    id: 'implementation',
    name: 'Implementation & Coding',
    orderStart: 36,
    orderEnd: 55,
    family: 'implementation',
  },
  {
    id: 'testing',
    name: 'Testing & Verification',
    orderStart: 56,
    orderEnd: 75,
    family: 'testing',
  },
  {
    id: 'operations',
    name: 'Deployment, Operations & Evolution',
    orderStart: 76,
    orderEnd: 100,
    family: 'operations',
  },
];

function packLooksValid(root: string): boolean {
  return (
    fs.existsSync(path.join(root, 'agents.yaml')) &&
    fs.existsSync(path.join(root, 'modes-registry.json')) &&
    fs.existsSync(path.join(root, 'vendor-skills-map.json')) &&
    fs.existsSync(path.join(root, 'vendor-skills-all-names.json'))
  );
}

function defaultPackRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, '../mandala-crew'),
    path.resolve(here, '../../../.cursor/mandala-crew'),
  ];
  for (const candidate of candidates) {
    if (packLooksValid(candidate)) return candidate;
  }
  return candidates[0]!;
}

function unquote(value: string): string {
  let v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v;
}

/** Minimal parser for the generated agents.yaml schema (no YAML dependency). */
export function parseAgentsYaml(text: string): { agents: CrewAgent[]; esfr: EsfrGate } {
  const agents: CrewAgent[] = [];
  let current: Partial<CrewAgent> | null = null;
  let inAgents = false;
  let inEsfr = false;
  const esfr: Partial<EsfrGate> = {};

  const flushAgent = (): void => {
    if (
      current?.id &&
      current.name &&
      current.family &&
      typeof current.order === 'number' &&
      current.source &&
      current.cursor_agent
    ) {
      agents.push({
        id: current.id,
        name: current.name,
        description: current.description ?? '',
        family: current.family,
        phase: current.phase ?? current.family,
        order: current.order,
        source: current.source,
        cursor_agent: current.cursor_agent,
      });
    }
    current = null;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\t/g, '  ');
    if (/^agents:\s*$/.test(line)) {
      inAgents = true;
      inEsfr = false;
      continue;
    }
    if (/^esfr:\s*$/.test(line)) {
      flushAgent();
      inAgents = false;
      inEsfr = true;
      continue;
    }
    if (/^[a-z_]+:\s*/.test(line) && !line.startsWith(' ') && !line.startsWith('-')) {
      // Any other top-level key ends the agents list (phases, orchestration, modes, …)
      if (!line.startsWith('agents:') && !line.startsWith('esfr:')) {
        flushAgent();
        inAgents = false;
        if (!line.startsWith('esfr:')) inEsfr = false;
      }
      continue;
    }

    if (inAgents) {
      const idMatch = line.match(/^\s*-\s+id:\s*(.+)\s*$/);
      if (idMatch) {
        flushAgent();
        current = { id: unquote(idMatch[1]!) };
        continue;
      }
      if (!current) continue;
      const field = line.match(
        /^\s+(name|description|family|phase|order|source|cursor_agent):\s*(.+)\s*$/,
      );
      if (!field) continue;
      const key = field[1]!;
      const value = unquote(field[2]!);
      if (key === 'order') current.order = Number(value);
      else if (key === 'name') current.name = value;
      else if (key === 'description') current.description = value;
      else if (key === 'family') current.family = value;
      else if (key === 'phase') current.phase = value;
      else if (key === 'source') current.source = value;
      else if (key === 'cursor_agent') current.cursor_agent = value;
    }

    if (inEsfr) {
      const field = line.match(/^\s+(id|order|cursor_agent|name|description):\s*(.+)\s*$/);
      if (!field) continue;
      const key = field[1]!;
      const value = unquote(field[2]!);
      if (key === 'order') esfr.order = Number(value);
      else if (key === 'id') esfr.id = value;
      else if (key === 'cursor_agent') esfr.cursor_agent = value;
      else if (key === 'name') esfr.name = value;
      else if (key === 'description') esfr.description = value;
    }
  }
  flushAgent();

  if (!esfr.id || typeof esfr.order !== 'number' || !esfr.cursor_agent) {
    throw new Error('agents.yaml missing esfr gate');
  }
  return {
    agents,
    esfr: {
      id: esfr.id,
      order: esfr.order,
      cursor_agent: esfr.cursor_agent,
      name: esfr.name ?? 'ESFR',
      ...(esfr.description ? { description: esfr.description } : {}),
    },
  };
}

type ModesRegistryFile = {
  status?: string;
  compositional?: { count?: number };
  nativeRoster?: { totalNamed?: number };
  modes: ModeEntry[];
};

type VendorMapFile = {
  generatedAt?: string;
  agents: Record<
    string,
    {
      family?: string;
      phase?: string;
      description?: string;
      pipelineOrder?: number;
      vendorSkills?: string[];
    }
  >;
};

type VendorAllNamesFile = {
  count: number;
  names: string[];
};

type VendorPathsFile = {
  count?: number;
  paths?: Record<string, string[]>;
};

type PhasesFile = {
  phases?: Array<{
    id: string;
    name: string;
    orderStart: number;
    orderEnd: number;
    family: string;
  }>;
};

export type PlanInput = {
  goal: string;
  modeKey?: string;
  families?: string[];
  phases?: string[];
  agentIds?: string[];
  skillNames?: string[];
  includeEsfr?: boolean;
  compact?: boolean;
};

/**
 * Loads Mandala crew pack artifacts and exposes routing / planning surfaces.
 * ModeKeys are approximated via invoke brief + Cursor rule — not runtime-enforced.
 */
export class MandalaCrewEngine {
  readonly packRoot: string;
  private readonly agents: CrewAgent[];
  private readonly esfr: EsfrGate;
  private readonly phases: CrewPhase[];
  private readonly modes: ModeEntry[];
  private readonly modesByKey: Map<string, ModeEntry>;
  private readonly vendorByAgent: Map<string, string[]>;
  private readonly preferredIndex: Map<string, string[]>;
  private readonly catalogNames: string[];
  private readonly catalogSet: Set<string>;
  private readonly skillPaths: Map<string, string[]>;
  private readonly nativeNamedModes: number;

  constructor(packRoot = process.env['MANDALA_CREW_ROOT'] ?? defaultPackRoot()) {
    this.packRoot = packRoot;
    const yamlPath = path.join(packRoot, 'agents.yaml');
    const modesPath = path.join(packRoot, 'modes-registry.json');
    const mapPath = path.join(packRoot, 'vendor-skills-map.json');
    const allPath = path.join(packRoot, 'vendor-skills-all-names.json');
    const pathsPath = path.join(packRoot, 'vendor-skills-paths.json');
    const phasesPath = path.join(packRoot, 'phases.json');

    for (const required of [yamlPath, modesPath, mapPath, allPath]) {
      if (!fs.existsSync(required)) {
        throw new Error(`Mandala crew pack missing: ${required}`);
      }
    }

    const parsed = parseAgentsYaml(fs.readFileSync(yamlPath, 'utf8'));
    this.agents = [...parsed.agents].sort((a, b) => a.order - b.order);
    this.esfr = parsed.esfr;

    if (fs.existsSync(phasesPath)) {
      const phasesFile = JSON.parse(fs.readFileSync(phasesPath, 'utf8')) as PhasesFile;
      this.phases = (phasesFile.phases ?? DEFAULT_PHASES).map((p) => ({ ...p }));
    } else {
      this.phases = DEFAULT_PHASES.map((p) => ({ ...p }));
    }

    const modesFile = JSON.parse(fs.readFileSync(modesPath, 'utf8')) as ModesRegistryFile;
    this.modes = modesFile.modes ?? [];
    this.modesByKey = new Map(this.modes.map((mode) => [mode.key, mode]));
    this.nativeNamedModes = modesFile.nativeRoster?.totalNamed ?? 60;

    const mapFile = JSON.parse(fs.readFileSync(mapPath, 'utf8')) as VendorMapFile;
    this.vendorByAgent = new Map();
    this.preferredIndex = new Map();
    for (const [agentId, entry] of Object.entries(mapFile.agents ?? {})) {
      const skills = entry.vendorSkills ?? [];
      this.vendorByAgent.set(agentId, skills);
      for (const skill of skills) {
        const list = this.preferredIndex.get(skill) ?? [];
        list.push(agentId);
        this.preferredIndex.set(skill, list);
      }
    }

    const allFile = JSON.parse(fs.readFileSync(allPath, 'utf8')) as VendorAllNamesFile;
    this.catalogNames = allFile.names ?? [];
    this.catalogSet = new Set(this.catalogNames);

    this.skillPaths = new Map();
    if (fs.existsSync(pathsPath)) {
      const pathsFile = JSON.parse(fs.readFileSync(pathsPath, 'utf8')) as VendorPathsFile;
      for (const [name, pathsList] of Object.entries(pathsFile.paths ?? {})) {
        this.skillPaths.set(name, pathsList);
      }
    }
  }

  getStatus(): CrewStatus {
    return {
      status: 'declared_operable',
      packRoot: this.packRoot,
      preEsfrCount: this.agents.length,
      esfrSlot: this.esfr.order,
      esfrId: this.esfr.id,
      phaseCount: this.phases.length,
      phases: this.phases.map((p) => ({ ...p })),
      modeKeyCount: this.modes.length,
      nativeNamedModes: this.nativeNamedModes,
      vendorCatalogCount: this.catalogNames.length,
      vendorPreferredUnique: this.preferredIndex.size,
      vendorPathIndexCount: this.skillPaths.size,
      roleSkills: [...ROLE_SKILLS],
      foreman: { id: 'ls-crew-foreman', inRoster: false },
      honesty: [
        '100 pre-ESFR agents across 6 phases; ESFR is #101; foreman is orchestration-only.',
        'ModeKey auto-apply is approximated: product embeds lens in invoke brief; Cursor rule is declared guidance.',
        'Vendor skill paths are indexed when discovered; Cursor still executes by opening SKILL.md.',
        'Commercial ops starter is a checklist only — no signup/billing claimed.',
      ],
    };
  }

  listPhases(): CrewPhase[] {
    return this.phases.map((p) => ({ ...p }));
  }

  listAgents(): CrewAgent[] {
    return this.agents.map((agent) => ({ ...agent }));
  }

  getEsfr(): EsfrGate {
    return { ...this.esfr };
  }

  getAgent(id: string): (CrewAgent & { preferredSkills: string[] }) | null {
    const agent = this.agents.find((entry) => entry.id === id);
    if (!agent) return null;
    return {
      ...agent,
      preferredSkills: [...(this.vendorByAgent.get(id) ?? [])],
    };
  }

  listModes(query?: string, limit = 50, offset = 0): { total: number; items: ModeEntry[] } {
    const q = query?.trim().toLowerCase();
    const filtered = q
      ? this.modes.filter(
          (mode) =>
            mode.key.includes(q) ||
            mode.label.toLowerCase().includes(q) ||
            mode.crewMode.toLowerCase().includes(q) ||
            mode.actorMode.toLowerCase().includes(q) ||
            mode.stance.toLowerCase().includes(q),
        )
      : this.modes;
    return {
      total: filtered.length,
      items: filtered.slice(offset, offset + limit).map((mode) => ({ ...mode })),
    };
  }

  getMode(key: string): ModeEntry | null {
    return this.modesByKey.get(key) ? { ...this.modesByKey.get(key)! } : null;
  }

  searchSkills(options: {
    q?: string;
    preferredOnly?: boolean;
    agentId?: string;
    limit?: number;
    offset?: number;
  }): { total: number; items: VendorSkillHit[] } {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const q = options.q?.trim().toLowerCase();

    let names: string[];
    if (options.agentId) {
      names = this.vendorByAgent.get(options.agentId) ?? [];
    } else if (options.preferredOnly) {
      names = [...this.preferredIndex.keys()].sort();
    } else {
      names = this.catalogNames;
    }

    const filtered = q ? names.filter((name) => name.toLowerCase().includes(q)) : names;
    const items = filtered.slice(offset, offset + limit).map((name) => ({
      name,
      preferred: this.preferredIndex.has(name),
      preferredBy: [...(this.preferredIndex.get(name) ?? [])],
      paths: [...(this.skillPaths.get(name) ?? [])],
    }));
    return { total: filtered.length, items };
  }

  resolveSkill(name: string): VendorSkillHit & {
    inCatalog: boolean;
    loadHint: string;
    executableInProduct: false;
  } {
    const preferredBy = [...(this.preferredIndex.get(name) ?? [])];
    const inCatalog = this.catalogSet.has(name);
    const paths = [...(this.skillPaths.get(name) ?? [])];
    return {
      name,
      preferred: preferredBy.length > 0,
      preferredBy,
      paths,
      inCatalog,
      executableInProduct: false,
      loadHint: paths.length
        ? `Open SKILL.md at: ${paths[0]}${paths.length > 1 ? ` (+${paths.length - 1} more)` : ''}`
        : inCatalog
          ? `Open SKILL.md for "${name}" under ~/.cursor/plugins/**/skills/ or ~/.cursor/skills/ / ~/.agents/skills/`
          : `Name "${name}" is not in the vendor-skills-all-names snapshot; refresh via scripts/mandala-crew/generate-crew-pack.mjs`,
    };
  }

  materializeModeCard(modeKey: string): { mode: ModeEntry; markdown: string; suggestedPath: string } {
    const mode = this.getMode(modeKey);
    if (!mode) throw new Error(`Mode not found: ${modeKey}`);
    const markdown = `# Mode: ${mode.label}

- id: ${mode.id}
- key: \`${mode.key}\`
- crewMode: ${mode.crewMode}
- actorMode: ${mode.actorMode}
- stance: ${mode.stance}

## Lens instructions (apply for this run)

Apply as the active cognitive lens on the current agent role.
Do not change write authority. Precedence: role bans > Constitution > Evidence > Mode.

### Crew emphasis
Use the ${mode.crewMode} lens from Mandala CREW_MODES.

### Actor emphasis
Use the ${mode.actorMode} lens from Mandala CECP_ACTOR_MODES.

### Stance
Operate with **${mode.stance}** bias for evidence and scope.
`;
    return {
      mode,
      markdown,
      suggestedPath: path.join(this.packRoot, 'mode-cards', `${mode.key}.md`),
    };
  }

  writeModeCard(modeKey: string): { path: string; mode: ModeEntry } {
    const card = this.materializeModeCard(modeKey);
    const outDir = path.join(this.packRoot, 'mode-cards');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(card.suggestedPath, card.markdown, 'utf8');
    return { path: card.suggestedPath, mode: card.mode };
  }

  plan(input: PlanInput): CrewPlan {
    const goal = input.goal?.trim();
    if (!goal) throw new Error('goal is required');

    const mode = input.modeKey ? this.getMode(input.modeKey) : null;
    if (input.modeKey && !mode) throw new Error(`Mode not found: ${input.modeKey}`);

    const includeEsfr = input.includeEsfr !== false;
    const requestedSkills = [...new Set((input.skillNames ?? []).map((s) => s.trim()).filter(Boolean))];
    const unresolved = requestedSkills.filter((name) => !this.catalogSet.has(name));

    let selected = this.agents;
    let selectedPhases = this.phases.map((p) => p.id);

    if (input.agentIds?.length) {
      const wanted = new Set(input.agentIds);
      selected = this.agents.filter((agent) => wanted.has(agent.id));
      if (selected.length === 0) throw new Error('No agents matched agentIds');
      selectedPhases = [...new Set(selected.map((a) => a.phase))];
    } else if (input.phases?.length || input.families?.length) {
      const phaseWanted = new Set((input.phases ?? []).map((p) => p.toLowerCase()));
      const familyWanted = new Set((input.families ?? []).map((f) => f.toLowerCase()));
      selected = this.agents.filter((agent) => {
        const phaseOk = phaseWanted.size === 0 || phaseWanted.has(agent.phase.toLowerCase());
        const familyOk = familyWanted.size === 0 || familyWanted.has(agent.family.toLowerCase());
        return phaseOk && familyOk;
      });
      if (selected.length === 0) throw new Error('No agents matched phases/families');
      selectedPhases = [...new Set(selected.map((a) => a.phase))];
      if (input.compact !== false) {
        // One lead (first by order) per matched phase
        const leads: CrewAgent[] = [];
        for (const phaseId of this.phases.map((p) => p.id)) {
          const lead = selected.find((a) => a.phase === phaseId);
          if (lead) leads.push(lead);
        }
        selected = leads;
      }
    } else if (input.compact !== false) {
      // Default operable slice: one lead agent per phase
      selected = this.phases
        .map((phase) => this.agents.find((agent) => agent.phase === phase.id))
        .filter((agent): agent is CrewAgent => Boolean(agent));
      selectedPhases = this.phases.map((p) => p.id);
    } else {
      selectedPhases = this.phases.map((p) => p.id);
    }

    const steps: PipelineStep[] = selected.map((agent) => {
      const preferred = this.vendorByAgent.get(agent.id) ?? [];
      const onDemand = requestedSkills.filter(
        (name) => this.catalogSet.has(name) && !preferred.includes(name),
      );
      return {
        order: agent.order,
        agentId: agent.id,
        name: agent.name,
        description: agent.description,
        family: agent.family,
        phase: agent.phase,
        role: 'pre_esfr',
        cursor_agent: agent.cursor_agent,
        preferredSkills: preferred,
        onDemandSkills: onDemand,
      };
    });

    if (includeEsfr) {
      steps.push({
        order: this.esfr.order,
        agentId: this.esfr.id,
        name: this.esfr.name,
        description: this.esfr.description ?? 'Final ship gate after the 100 pre-ESFR agents.',
        family: 'esfr',
        phase: 'esfr',
        role: 'esfr',
        cursor_agent: this.esfr.cursor_agent,
        preferredSkills: this.vendorByAgent.get(this.esfr.id) ?? [],
        onDemandSkills: [],
      });
    }

    steps.sort((a, b) => a.order - b.order);

    const plan: CrewPlan = {
      goal,
      mode,
      phases: selectedPhases,
      steps,
      esfrLast: includeEsfr && steps[steps.length - 1]?.role === 'esfr',
      skillRouting: {
        preferredUnique: this.preferredIndex.size,
        catalogUnique: this.catalogNames.length,
        requested: requestedSkills,
        unresolved,
      },
      invokeBrief: '',
      honesty: {
        modeAutoApply: {
          status: 'approximated',
          productEnforced: ['invoke_brief_embeds_modekey_and_lens', 'materialize_mode_card_api'],
          cursorDeclared: ['mandala-modekey-auto-apply rule', 'ls-crew foreman skill'],
          notClaimed: ['cursor_runtime_auto_injects_modekey_without_context'],
        },
        status: 'declared_operable',
        note: 'Paste this brief into Cursor; ModeKey lens is embedded below. Cursor rule approximates auto-apply — not process-enforced.',
      },
    };
    plan.invokeBrief = this.renderInvokeBrief(plan);
    return plan;
  }

  private renderInvokeBrief(plan: CrewPlan): string {
    const lines: string[] = [
      '# Mandala crew invoke brief (LineageStudio)',
      '',
      `Goal: ${plan.goal}`,
      `Phases: ${plan.phases.join(' → ') || '(subset)'}`,
      plan.mode
        ? `ModeKey: \`${plan.mode.key}\` — ${plan.mode.label}`
        : 'ModeKey: (none selected — optional)',
      '',
    ];

    if (plan.mode) {
      lines.push(
        '## ACTIVE MODE LENS (apply for every agent in this run)',
        '',
        `Apply ModeKey \`${plan.mode.key}\` as the cognitive lens.`,
        `- Crew: ${plan.mode.crewMode}`,
        `- Actor: ${plan.mode.actorMode}`,
        `- Stance: **${plan.mode.stance}**`,
        '- Precedence: role bans > Constitution > Evidence > Profile > Mode',
        '- Do not invent a new pipeline stage from this ModeKey.',
        '',
        'Cursor approximation: follow rule `mandala-modekey-auto-apply` when this brief is loaded.',
        '',
      );
    }

    lines.push('## Pipeline (ESFR last when included)', '');
    for (const step of plan.steps) {
      lines.push(
        `${step.order}. **${step.agentId}** — ${step.name} (${step.phase}/${step.role})`,
        `   ${step.description}`,
        `   \`${step.cursor_agent}\``,
      );
      if (step.preferredSkills.length) {
        lines.push(
          `   - Preferred vendor skills: ${step.preferredSkills.slice(0, 8).join(', ')}${step.preferredSkills.length > 8 ? ', …' : ''}`,
        );
      }
      if (step.onDemandSkills.length) {
        lines.push(`   - On-demand from full catalog: ${step.onDemandSkills.join(', ')}`);
      }
    }
    lines.push(
      '',
      '## Operator steps',
      '',
      '1. Load skill `ls-crew` / agent `ls-crew-foreman` (orchestrator — not one of the 100).',
      '2. Apply the ModeKey lens block above (product-embedded; Cursor rule approximates auto-apply).',
      '3. Dispatch pre-ESFR agents in order; open listed SKILL.md paths from `/api/crew/skills/:name` when acting.',
      '4. After readiness evidence, run **ls-esfr** (#101) for PromotionEligibility.',
      '',
      '## Honesty',
      '',
      plan.honesty.note,
      `ModeAutoApply status: ${plan.honesty.modeAutoApply.status}`,
      '',
    );
    return lines.join('\n');
  }
}
