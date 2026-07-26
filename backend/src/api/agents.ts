import { Router } from 'express';
import { parseAgentTaskEnvelope } from '../core/AgentCollaborationEngine.js';
import { asyncRoute, HttpError, optionalString, requireString } from './http.js';
import type { AppServices } from '../services.js';

export function agentsRouter(services: AppServices): Router {
  const router = Router();

  /**
   * Accepts either the shorthand used by the UI
   * ({ taskId, fromProfileId, toProfileId, content }) or a full agent_task
   * envelope under `envelope`.
   */
  router.post(
    '/send',
    asyncRoute(async (req, res) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const envelope = body['envelope']
        ? parseAgentTaskEnvelope(body['envelope'])
        : parseAgentTaskEnvelope({
            from_profile:
              optionalString(body, 'fromAgentId') ?? requireString(body, 'fromProfileId'),
            to_profile: optionalString(body, 'toAgentId') ?? requireString(body, 'toProfileId'),
            task_id: optionalString(body, 'taskId') ?? null,
            input: requireString(body, 'content'),
            intent: optionalString(body, 'intent') ?? 'refine',
            ...(body['constraints'] ? { constraints: body['constraints'] } : {}),
            ...(body['context'] ? { context: body['context'] } : {}),
          });

      const execute = body['execute'] === undefined ? true : body['execute'] === true;
      const result = await services.agents.dispatch(envelope, execute);
      res.status(202).json({
        status: 'sent',
        message: result.message,
        ...(result.response
          ? {
              response: {
                agentId: result.response.agentId,
                profileId: result.response.agentId,
                connector: result.response.connector,
                model: result.response.model,
                model_type: result.response.modelType,
                is_mock: result.response.isMock,
                output: result.response.output,
              },
            }
          : {}),
      });
    }),
  );

  router.get(
    '/graph',
    asyncRoute(async (_req, res) => {
      res.json(await services.bus.getGraph());
    }),
  );

  router.get(
    '/messages',
    asyncRoute(async (req, res) => {
      const a = req.query['a'];
      const b = req.query['b'];
      if (typeof a !== 'string' || typeof b !== 'string') {
        throw new HttpError(400, 'Query params "a" and "b" (profile ids) are required');
      }
      res.json(await services.bus.getMessagesBetween(a, b));
    }),
  );

  return router;
}
