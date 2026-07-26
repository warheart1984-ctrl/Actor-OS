import { AgentCollaborationEngine } from './core/AgentCollaborationEngine.js';
import { LineageEngine } from './core/LineageEngine.js';
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
};

export function buildServices(env: NodeJS.ProcessEnv = process.env): AppServices {
  const connectors = buildConnectorRegistry(env);
  const router = new ModelRouter(connectors);
  const bus = new MessageBus();
  const lineage = new LineageEngine();
  const tasks = new TaskOrchestrator(router, lineage);
  const agents = new AgentCollaborationEngine(bus, lineage, router);
  return { connectors, router, bus, lineage, tasks, agents };
}
