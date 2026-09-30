import { AgentCollaborationEngine } from './core/AgentCollaborationEngine.js';
import { LineageEngine } from './core/LineageEngine.js';
import { MandalaCrewEngine } from './core/MandalaCrewEngine.js';
import { RtsEngine } from './core/RtsEngine.js';
import { RtsSessionEngine } from './core/RtsSessionEngine.js';
import { TaskOrchestrator } from './core/TaskOrchestrator.js';
import { MessageBus } from './models/MessageBus.js';
import { ModelRouter } from './models/ModelRouter.js';
import { buildConnectorRegistry, type ConnectorRegistry } from './models/connectors/registry.js';

export type AppServices = {
  connectors: ConnectorRegistry;
  router: ModelRouter;
  bus: MessageBus;
  lineage: LineageEngine;
  tasks: TaskOrchestrator;
  agents: AgentCollaborationEngine;
  crew: MandalaCrewEngine;
  rts: RtsEngine;
  rtsSessions: RtsSessionEngine;
};

export function buildServices(env: NodeJS.ProcessEnv = process.env): AppServices {
  const connectors = buildConnectorRegistry(env);
  const router = new ModelRouter(connectors);
  const bus = new MessageBus();
  const lineage = new LineageEngine();
  const tasks = new TaskOrchestrator(router, lineage);
  const agents = new AgentCollaborationEngine(bus, lineage, router);
  const crewRoot = env['MANDALA_CREW_ROOT']?.trim();
  const crew = crewRoot ? new MandalaCrewEngine(crewRoot) : new MandalaCrewEngine();
  const rts = crewRoot ? new RtsEngine(crewRoot) : new RtsEngine();
  const rtsSessions = new RtsSessionEngine(rts, crew);
  return { connectors, router, bus, lineage, tasks, agents, crew, rts, rtsSessions };
}
