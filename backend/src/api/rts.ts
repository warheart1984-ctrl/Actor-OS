import { Router } from 'express';
import { asyncRoute, HttpError, pathParam, requireString } from './http.js';
import type { AppServices } from '../services.js';
import type { RtsAction } from '../core/RtsSessionEngine.js';

function parseIntQuery(value: unknown, fallback: number): number {
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function parseAction(body: unknown): RtsAction {
  if (typeof body !== 'object' || body === null) {
    throw new HttpError(400, 'Action body must be a JSON object');
  }
  const type = requireString(body, 'type') as RtsAction['type'];
  const record = body as Record<string, unknown>;

  switch (type) {
    case 'tick':
      return {
        type: 'tick',
        amount: typeof record['amount'] === 'number' ? record['amount'] : undefined,
      };
    case 'build_structure':
      return { type: 'build_structure', structureId: requireString(body, 'structureId') };
    case 'train_unit':
      return {
        type: 'train_unit',
        roleId: requireString(body, 'roleId'),
        agentId: requireString(body, 'agentId'),
      };
    case 'deploy_drone':
      return {
        type: 'deploy_drone',
        droneTypeId: requireString(body, 'droneTypeId'),
        unitId: requireString(body, 'unitId'),
      };
    case 'unlock_territory':
      return { type: 'unlock_territory', territoryId: requireString(body, 'territoryId') };
    case 'start_mission': {
      const phases = Array.isArray(record['phases'])
        ? record['phases'].filter((p): p is string => typeof p === 'string')
        : undefined;
      return {
        type: 'start_mission',
        goal: requireString(body, 'goal'),
        modeKey: typeof record['modeKey'] === 'string' ? record['modeKey'] : undefined,
        phases,
        compact: typeof record['compact'] === 'boolean' ? record['compact'] : undefined,
      };
    }
    case 'spawn_incident': {
      const severity = record['severity'];
      return {
        type: 'spawn_incident',
        title: typeof record['title'] === 'string' ? record['title'] : undefined,
        severity:
          severity === 'low' || severity === 'medium' || severity === 'high' ? severity : undefined,
      };
    }
    case 'resolve_incident':
      return { type: 'resolve_incident', incidentId: requireString(body, 'incidentId') };
    case 'set_lens':
      return { type: 'set_lens', modeKey: requireString(body, 'modeKey') };
    default:
      throw new HttpError(400, `Unknown action type: ${String(type)}`);
  }
}

export function rtsRouter(services: AppServices): Router {
  const router = Router();

  router.get(
    '/',
    asyncRoute(async (_req, res) => {
      const catalog = services.rts.getCatalog(0);
      res.json({
        status: catalog.status,
        packRoot: catalog.packRoot,
        skillCount: catalog.skills.count,
        structureCount: catalog.structures.length,
        honesty: catalog.honesty,
        endpoints: {
          catalog: 'GET /api/rts/catalog',
          skills: 'GET /api/rts/skills?q=&limit=&offset=',
          sessions: 'GET /api/rts/sessions',
          createSession: 'POST /api/rts/sessions',
          session: 'GET /api/rts/sessions/:id',
          action: 'POST /api/rts/sessions/:id/action',
        },
      });
    }),
  );

  router.get(
    '/catalog',
    asyncRoute(async (req, res) => {
      const sample = parseIntQuery(req.query['skillSample'], 40);
      res.json(services.rts.getCatalog(Math.min(sample, 200)));
    }),
  );

  router.get(
    '/skills',
    asyncRoute(async (req, res) => {
      const q = typeof req.query['q'] === 'string' ? req.query['q'] : undefined;
      const limit = Math.min(parseIntQuery(req.query['limit'], 50), 200);
      const offset = parseIntQuery(req.query['offset'], 0);
      const result = services.rts.searchSkills(q, limit, offset);
      res.json(result);
    }),
  );

  router.get(
    '/sessions',
    asyncRoute(async (_req, res) => {
      res.json({ sessions: services.rtsSessions.listSessions() });
    }),
  );

  router.post(
    '/sessions',
    asyncRoute(async (_req, res) => {
      res.status(201).json(services.rtsSessions.createSession());
    }),
  );

  router.get(
    '/sessions/:id',
    asyncRoute(async (req, res) => {
      const id = pathParam(req, 'id');
      const session = services.rtsSessions.getSession(id);
      if (!session) throw new HttpError(404, `RTS session not found: ${id}`);
      res.json(session);
    }),
  );

  router.post(
    '/sessions/:id/action',
    asyncRoute(async (req, res) => {
      const id = pathParam(req, 'id');
      try {
        const action = parseAction(req.body);
        const session = services.rtsSessions.applyAction(id, action);
        res.json(session);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/not found/i.test(message)) throw new HttpError(404, message);
        throw new HttpError(400, message);
      }
    }),
  );

  return router;
}
