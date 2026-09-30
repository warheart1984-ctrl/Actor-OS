import { randomUUID } from 'node:crypto';
import type { CrewPlan, MandalaCrewEngine } from './MandalaCrewEngine.js';
import type { RtsEngine, ResourceCost } from './RtsEngine.js';

export type RtsBuiltStructure = {
  structureId: string;
  builtAtTick: number;
};

export type RtsTrainedUnit = {
  id: string;
  roleId: string;
  agentId: string;
  cooldownUntil: number;
  trainedAtTick: number;
};

export type RtsDeployedDrone = {
  id: string;
  droneTypeId: string;
  commandedByUnitId: string;
  cooldownUntil: number;
  deployedAtTick: number;
};

export type RtsMission = {
  id: string;
  goal: string;
  modeKey?: string;
  status: 'active' | 'planned' | 'resolved';
  startedAtTick: number;
  plan?: CrewPlan;
  territoryId?: string;
};

export type RtsIncident = {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'mitigating' | 'cleared';
  openedAtTick: number;
  riskDelta: number;
};

export type RtsScoreboard = {
  featuresShipped: number;
  uptimeScore: number;
  costEfficiency: number;
  revenueScore: number;
  satisfaction: number;
  territoriesOwned: number;
  constitutionalCompliance: number;
};

export type RtsAlert = {
  id: string;
  tick: number;
  level: 'info' | 'warn' | 'critical';
  message: string;
};

export type RtsSession = {
  id: string;
  createdAt: string;
  tick: number;
  resources: Record<string, number>;
  structures: RtsBuiltStructure[];
  units: RtsTrainedUnit[];
  drones: RtsDeployedDrone[];
  territoriesUnlocked: string[];
  missions: RtsMission[];
  incidents: RtsIncident[];
  opportunities: Array<{ id: string; title: string; territoryId: string }>;
  scoreboard: RtsScoreboard;
  alerts: RtsAlert[];
  selectedModeKey?: string;
};

export type RtsAction =
  | { type: 'tick'; amount?: number }
  | { type: 'build_structure'; structureId: string }
  | { type: 'train_unit'; roleId: string; agentId: string }
  | { type: 'deploy_drone'; droneTypeId: string; unitId: string }
  | { type: 'unlock_territory'; territoryId: string }
  | { type: 'start_mission'; goal: string; modeKey?: string; phases?: string[]; compact?: boolean }
  | { type: 'spawn_incident'; title?: string; severity?: 'low' | 'medium' | 'high' }
  | { type: 'resolve_incident'; incidentId: string }
  | { type: 'set_lens'; modeKey: string };

function canAfford(resources: Record<string, number>, cost: ResourceCost): boolean {
  for (const [key, amount] of Object.entries(cost)) {
    if (amount === undefined) continue;
    if (amount > 0 && (resources[key] ?? 0) < amount) return false;
  }
  return true;
}

function applyCost(resources: Record<string, number>, cost: ResourceCost): void {
  for (const [key, amount] of Object.entries(cost)) {
    if (amount === undefined || amount === 0) continue;
    resources[key] = (resources[key] ?? 0) - amount;
  }
}

function clampResources(
  resources: Record<string, number>,
  defs: Array<{ id: string; max: number; higherIsWorse?: boolean }>,
): void {
  for (const def of defs) {
    const v = resources[def.id] ?? 0;
    resources[def.id] = Math.max(0, Math.min(def.max, v));
  }
}

export class RtsSessionEngine {
  private readonly sessions = new Map<string, RtsSession>();

  constructor(
    private readonly rts: RtsEngine,
    private readonly crew: MandalaCrewEngine,
  ) {}

  createSession(): RtsSession {
    const catalog = this.rts.getCatalog(0);
    const territoriesUnlocked = catalog.territories
      .filter((t) => t.unlockedByDefault)
      .map((t) => t.id);
    const session: RtsSession = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      tick: 0,
      resources: this.rts.initialResources(),
      structures: [],
      units: [],
      drones: [],
      territoriesUnlocked,
      missions: [],
      incidents: [],
      opportunities: [
        {
          id: randomUUID(),
          title: 'Ship a governed feature through Mandala phases',
          territoryId: 'core-product',
        },
        {
          id: randomUUID(),
          title: 'Clear a synthetic incident battle',
          territoryId: 'core-product',
        },
      ],
      scoreboard: {
        featuresShipped: 0,
        uptimeScore: 90,
        costEfficiency: 40,
        revenueScore: 20,
        satisfaction: 50,
        territoriesOwned: territoriesUnlocked.length,
        constitutionalCompliance: this.rts.initialResources().constitutionalCompliance ?? 25,
      },
      alerts: [
        {
          id: randomUUID(),
          tick: 0,
          level: 'info',
          message: 'RTS session started. Cursor foreman awaits a brief.',
        },
      ],
    };
    this.sessions.set(session.id, session);
    return this.clone(session);
  }

  listSessions(): Array<{ id: string; createdAt: string; tick: number }> {
    return [...this.sessions.values()].map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      tick: s.tick,
    }));
  }

  getSession(id: string): RtsSession | null {
    const session = this.sessions.get(id);
    return session ? this.clone(session) : null;
  }

  applyAction(id: string, action: RtsAction): RtsSession {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`RTS session not found: ${id}`);

    switch (action.type) {
      case 'tick':
        this.tick(session, action.amount ?? 1);
        break;
      case 'build_structure':
        this.buildStructure(session, action.structureId);
        break;
      case 'train_unit':
        this.trainUnit(session, action.roleId, action.agentId);
        break;
      case 'deploy_drone':
        this.deployDrone(session, action.droneTypeId, action.unitId);
        break;
      case 'unlock_territory':
        this.unlockTerritory(session, action.territoryId);
        break;
      case 'start_mission':
        this.startMission(session, action);
        break;
      case 'spawn_incident':
        this.spawnIncident(session, action.title, action.severity);
        break;
      case 'resolve_incident':
        this.resolveIncident(session, action.incidentId);
        break;
      case 'set_lens':
        this.setLens(session, action.modeKey);
        break;
      default:
        throw new Error(`Unknown RTS action: ${(action as { type: string }).type}`);
    }

    this.syncScoreboard(session);
    return this.clone(session);
  }

  private tick(session: RtsSession, amount: number): void {
    const defs = this.rts.resourceDefs();
    for (let i = 0; i < amount; i += 1) {
      session.tick += 1;
      for (const def of defs) {
        if (def.regenPerTick !== 0) {
          session.resources[def.id] = (session.resources[def.id] ?? 0) + def.regenPerTick;
        }
      }
      // Idle risk creep when incidents open
      const open = session.incidents.filter((x) => x.status !== 'cleared').length;
      if (open > 0) {
        session.resources.risk = (session.resources.risk ?? 0) + open;
        session.scoreboard.uptimeScore = Math.max(0, session.scoreboard.uptimeScore - open);
      }
      clampResources(session.resources, defs);

      // Soft mission progress: after 5 ticks with a plan, mark resolved and reward
      for (const mission of session.missions) {
        if (mission.status === 'planned' && session.tick - mission.startedAtTick >= 5) {
          mission.status = 'resolved';
          session.scoreboard.featuresShipped += 1;
          session.resources.evidence = (session.resources.evidence ?? 0) + 8;
          session.resources.constitutionalCompliance =
            (session.resources.constitutionalCompliance ?? 0) + 5;
          session.alerts.push({
            id: randomUUID(),
            tick: session.tick,
            level: 'info',
            message: `Mission resolved (sim): ${mission.goal.slice(0, 80)}`,
          });
        }
      }
    }
  }

  private unlockedRoleIds(session: RtsSession): Set<string> {
    const set = new Set<string>();
    // Starter unlocks so the sim is playable before building everything
    for (const id of ['strategist', 'architect', 'builder', 'verifier']) set.add(id);
    for (const built of session.structures) {
      const structure = this.rts.getStructure(built.structureId);
      for (const role of structure?.unlocks.unitRoles ?? []) set.add(role);
    }
    return set;
  }

  private unlockedDroneIds(session: RtsSession): Set<string> {
    const set = new Set<string>(['data-drone', 'build-drone', 'test-drone']);
    for (const built of session.structures) {
      const structure = this.rts.getStructure(built.structureId);
      for (const drone of structure?.unlocks.droneTypes ?? []) set.add(drone);
    }
    return set;
  }

  private buildStructure(session: RtsSession, structureId: string): void {
    const structure = this.rts.getStructure(structureId);
    if (!structure) throw new Error(`Unknown structure: ${structureId}`);
    if (session.structures.some((s) => s.structureId === structureId)) {
      throw new Error(`Structure already built: ${structureId}`);
    }
    if (!canAfford(session.resources, structure.buildCost)) {
      throw new Error(`Insufficient resources to build ${structure.name}`);
    }
    applyCost(session.resources, structure.buildCost);
    session.structures.push({ structureId, builtAtTick: session.tick });
    session.alerts.push({
      id: randomUUID(),
      tick: session.tick,
      level: 'info',
      message: `Built ${structure.name}`,
    });
    clampResources(session.resources, this.rts.resourceDefs());
  }

  private trainUnit(session: RtsSession, roleId: string, agentId: string): void {
    const role = this.rts.getUnitRole(roleId);
    if (!role) throw new Error(`Unknown unit role: ${roleId}`);
    if (!this.unlockedRoleIds(session).has(roleId)) {
      throw new Error(`Unit role locked — build a structure that unlocks ${roleId}`);
    }
    const known =
      Boolean(this.crew.getAgent(agentId)) ||
      this.crew.listAgents().some((a) => a.id === agentId) ||
      agentId === 'ls-esfr' ||
      agentId === 'ls-crew-foreman';
    if (!known) throw new Error(`Unknown crew agent: ${agentId}`);
    if (!canAfford(session.resources, role.trainCost)) {
      throw new Error(`Insufficient resources to train ${role.name}`);
    }
    applyCost(session.resources, role.trainCost);
    session.units.push({
      id: randomUUID(),
      roleId,
      agentId,
      cooldownUntil: session.tick + role.cooldownTicks,
      trainedAtTick: session.tick,
    });
    session.alerts.push({
      id: randomUUID(),
      tick: session.tick,
      level: 'info',
      message: `Trained ${role.rtsLabel} bound to ${agentId}`,
    });
    clampResources(session.resources, this.rts.resourceDefs());
  }

  private deployDrone(session: RtsSession, droneTypeId: string, unitId: string): void {
    const drone = this.rts.getDrone(droneTypeId);
    if (!drone) throw new Error(`Unknown drone: ${droneTypeId}`);
    if (!this.unlockedDroneIds(session).has(droneTypeId)) {
      throw new Error(`Drone locked — unlock via structures: ${droneTypeId}`);
    }
    const unit = session.units.find((u) => u.id === unitId);
    if (!unit) throw new Error(`Unit not found: ${unitId}`);
    if (!drone.commandedBy.includes(unit.roleId)) {
      throw new Error(`Unit role ${unit.roleId} cannot command ${droneTypeId}`);
    }
    if (unit.cooldownUntil > session.tick) {
      throw new Error(`Unit on cooldown until tick ${unit.cooldownUntil}`);
    }
    if (!canAfford(session.resources, drone.deployCost)) {
      throw new Error(`Insufficient resources to deploy ${drone.name}`);
    }
    applyCost(session.resources, drone.deployCost);
    unit.cooldownUntil = session.tick + Math.max(1, Math.floor(drone.cooldownTicks / 2));
    session.drones.push({
      id: randomUUID(),
      droneTypeId,
      commandedByUnitId: unitId,
      cooldownUntil: session.tick + drone.cooldownTicks,
      deployedAtTick: session.tick,
    });
    if (droneTypeId === 'test-drone') {
      session.resources.evidence = (session.resources.evidence ?? 0) + 4;
    }
    if (droneTypeId === 'monitor-drone') {
      session.resources.risk = Math.max(0, (session.resources.risk ?? 0) - 2);
    }
    session.alerts.push({
      id: randomUUID(),
      tick: session.tick,
      level: 'info',
      message: `Deployed ${drone.name}`,
    });
    clampResources(session.resources, this.rts.resourceDefs());
  }

  private unlockTerritory(session: RtsSession, territoryId: string): void {
    const territory = this.rts.getTerritory(territoryId);
    if (!territory) throw new Error(`Unknown territory: ${territoryId}`);
    if (session.territoriesUnlocked.includes(territoryId)) {
      throw new Error(`Territory already unlocked: ${territoryId}`);
    }
    for (const req of territory.requiresStructures ?? []) {
      if (!session.structures.some((s) => s.structureId === req)) {
        throw new Error(`Territory requires structure: ${req}`);
      }
    }
    if (!canAfford(session.resources, territory.unlockCost)) {
      throw new Error(`Insufficient resources to unlock ${territory.name}`);
    }
    applyCost(session.resources, territory.unlockCost);
    session.territoriesUnlocked.push(territoryId);
    session.scoreboard.territoriesOwned = session.territoriesUnlocked.length;
    session.opportunities.push({
      id: randomUUID(),
      title: `Mission opportunity in ${territory.name}`,
      territoryId,
    });
    session.alerts.push({
      id: randomUUID(),
      tick: session.tick,
      level: 'info',
      message: `Unlocked territory: ${territory.name}`,
    });
    clampResources(session.resources, this.rts.resourceDefs());
  }

  private startMission(
    session: RtsSession,
    action: {
      goal: string;
      modeKey?: string;
      phases?: string[];
      compact?: boolean;
    },
  ): void {
    const goal = action.goal.trim();
    if (!goal) throw new Error('Mission goal is required');
    const attentionCost = { attention: 5, time: 3, compute: 4 };
    if (!canAfford(session.resources, attentionCost)) {
      throw new Error('Insufficient resources to start mission');
    }
    applyCost(session.resources, attentionCost);
    const modeKey = action.modeKey ?? session.selectedModeKey;
    const plan = this.crew.plan({
      goal,
      modeKey,
      phases: action.phases,
      compact: action.compact ?? true,
      includeEsfr: true,
    });
    const mission: RtsMission = {
      id: randomUUID(),
      goal,
      modeKey,
      status: 'planned',
      startedAtTick: session.tick,
      plan,
      territoryId: session.territoriesUnlocked[0],
    };
    session.missions.unshift(mission);
    session.resources.evidence = (session.resources.evidence ?? 0) + 3;
    session.resources.constitutionalCompliance =
      (session.resources.constitutionalCompliance ?? 0) + 2;
    session.alerts.push({
      id: randomUUID(),
      tick: session.tick,
      level: 'info',
      message: `Mission planned via Mandala crew (${plan.steps.length} steps, ESFR last=${plan.esfrLast})`,
    });
    clampResources(session.resources, this.rts.resourceDefs());
  }

  private spawnIncident(
    session: RtsSession,
    title?: string,
    severity: 'low' | 'medium' | 'high' = 'medium',
  ): void {
    const riskDelta = severity === 'high' ? 12 : severity === 'medium' ? 7 : 3;
    session.resources.risk = (session.resources.risk ?? 0) + riskDelta;
    session.resources.attention = Math.max(0, (session.resources.attention ?? 0) - 3);
    const incident: RtsIncident = {
      id: randomUUID(),
      title: title?.trim() || `${severity} severity business battle`,
      severity,
      status: 'open',
      openedAtTick: session.tick,
      riskDelta,
    };
    session.incidents.unshift(incident);
    session.scoreboard.uptimeScore = Math.max(0, session.scoreboard.uptimeScore - riskDelta);
    session.alerts.push({
      id: randomUUID(),
      tick: session.tick,
      level: severity === 'high' ? 'critical' : 'warn',
      message: `Incident opened: ${incident.title}`,
    });
    clampResources(session.resources, this.rts.resourceDefs());
  }

  private resolveIncident(session: RtsSession, incidentId: string): void {
    const incident = session.incidents.find((i) => i.id === incidentId);
    if (!incident) throw new Error(`Incident not found: ${incidentId}`);
    if (incident.status === 'cleared') throw new Error('Incident already cleared');
    const hasResponder = session.units.some((u) =>
      ['responder', 'watcher', 'operator', 'guardian'].includes(u.roleId),
    );
    const hasFixDrone = session.drones.some((d) => d.droneTypeId === 'fix-drone');
    if (!hasResponder && !hasFixDrone) {
      throw new Error('Need a Responder/Watcher/Operator unit or Fix drone to clear incident');
    }
    const cost = { attention: 4, compute: 4, time: 2 };
    if (!canAfford(session.resources, cost)) throw new Error('Insufficient resources to resolve');
    applyCost(session.resources, cost);
    incident.status = 'cleared';
    session.resources.risk = Math.max(0, (session.resources.risk ?? 0) - incident.riskDelta);
    session.scoreboard.uptimeScore = Math.min(100, session.scoreboard.uptimeScore + 8);
    session.scoreboard.satisfaction = Math.min(100, session.scoreboard.satisfaction + 3);
    session.alerts.push({
      id: randomUUID(),
      tick: session.tick,
      level: 'info',
      message: `Incident cleared: ${incident.title}`,
    });
    clampResources(session.resources, this.rts.resourceDefs());
  }

  private setLens(session: RtsSession, modeKey: string): void {
    const mode = this.crew.getMode(modeKey);
    if (!mode) throw new Error(`Unknown ModeKey: ${modeKey}`);
    session.selectedModeKey = mode.key;
    session.alerts.push({
      id: randomUUID(),
      tick: session.tick,
      level: 'info',
      message: `Lens set: ${mode.label}`,
    });
  }

  private syncScoreboard(session: RtsSession): void {
    session.scoreboard.territoriesOwned = session.territoriesUnlocked.length;
    session.scoreboard.constitutionalCompliance = Math.round(
      session.resources.constitutionalCompliance ?? 0,
    );
    session.scoreboard.costEfficiency = Math.min(
      100,
      30 + session.structures.length * 5 + session.scoreboard.featuresShipped * 4,
    );
    session.scoreboard.revenueScore = Math.min(
      100,
      session.territoriesUnlocked.length * 15 + session.scoreboard.featuresShipped * 5,
    );
    // Keep alerts bounded
    if (session.alerts.length > 80) {
      session.alerts = session.alerts.slice(0, 80);
    }
  }

  private clone(session: RtsSession): RtsSession {
    return structuredClone(session);
  }
}
