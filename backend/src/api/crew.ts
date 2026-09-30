import { Router } from 'express';
import { MandalaCrewEngine } from '../core/MandalaCrewEngine.js';
import { asyncRoute, HttpError, optionalString, pathParam, requireString } from './http.js';
import type { AppServices } from '../services.js';

function parseIntQuery(value: unknown, fallback: number): number {
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function parseStringList(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return undefined;
}

export function crewRouter(services: AppServices): Router {
  const router = Router();
  const crew = (): MandalaCrewEngine => services.crew;

  router.get(
    '/',
    asyncRoute(async (_req, res) => {
      const status = crew().getStatus();
      res.json({
        ...status,
        endpoints: {
          agents: 'GET /api/crew/agents',
          agent: 'GET /api/crew/agents/:id',
          phases: 'GET /api/crew/phases',
          modes: 'GET /api/crew/modes?q=&limit=&offset=',
          mode: 'GET /api/crew/modes/:key',
          skills: 'GET /api/crew/skills?q=&preferredOnly=&agentId=&limit=&offset=',
          skill: 'GET /api/crew/skills/:name',
          plan: 'POST /api/crew/plan',
          materializeMode: 'POST /api/crew/modes/:key/materialize',
        },
      });
    }),
  );

  router.get(
    '/phases',
    asyncRoute(async (_req, res) => {
      res.json({ count: crew().listPhases().length, phases: crew().listPhases() });
    }),
  );

  router.get(
    '/agents',
    asyncRoute(async (_req, res) => {
      const engine = crew();
      res.json({
        preEsfrCount: engine.listAgents().length,
        esfr: engine.getEsfr(),
        phases: engine.listPhases(),
        foreman: { id: 'ls-crew-foreman', inRoster: false },
        agents: engine.listAgents(),
      });
    }),
  );

  router.get(
    '/agents/:id',
    asyncRoute(async (req, res) => {
      const id = pathParam(req, 'id');
      const agent = crew().getAgent(id);
      if (!agent) throw new HttpError(404, `Crew agent not found: ${id}`);
      res.json(agent);
    }),
  );

  router.get(
    '/modes',
    asyncRoute(async (req, res) => {
      const q = typeof req.query['q'] === 'string' ? req.query['q'] : undefined;
      const limit = parseIntQuery(req.query['limit'], 50);
      const offset = parseIntQuery(req.query['offset'], 0);
      const result = crew().listModes(q, Math.min(limit, 200), offset);
      res.json({
        count: crew().getStatus().modeKeyCount,
        ...result,
      });
    }),
  );

  router.get(
    '/modes/:key',
    asyncRoute(async (req, res) => {
      const key = pathParam(req, 'key');
      const mode = crew().getMode(key);
      if (!mode) throw new HttpError(404, `Mode not found: ${key}`);
      res.json(mode);
    }),
  );

  router.post(
    '/modes/:key/materialize',
    asyncRoute(async (req, res) => {
      const key = pathParam(req, 'key');
      const write = (req.body as Record<string, unknown> | undefined)?.['write'] === true;
      if (write) {
        const written = crew().writeModeCard(key);
        res.status(201).json({ written: true, ...written });
        return;
      }
      const card = crew().materializeModeCard(key);
      res.json({ written: false, ...card });
    }),
  );

  router.get(
    '/skills',
    asyncRoute(async (req, res) => {
      const q = typeof req.query['q'] === 'string' ? req.query['q'] : undefined;
      const agentId = typeof req.query['agentId'] === 'string' ? req.query['agentId'] : undefined;
      const preferredOnly =
        req.query['preferredOnly'] === '1' ||
        req.query['preferredOnly'] === 'true' ||
        req.query['preferredOnly'] === 'yes';
      const limit = parseIntQuery(req.query['limit'], 50);
      const offset = parseIntQuery(req.query['offset'], 0);
      const result = crew().searchSkills({
        q,
        agentId,
        preferredOnly,
        limit: Math.min(limit, 500),
        offset,
      });
      res.json({
        catalogCount: crew().getStatus().vendorCatalogCount,
        preferredUnique: crew().getStatus().vendorPreferredUnique,
        ...result,
      });
    }),
  );

  router.get(
    '/skills/:name',
    asyncRoute(async (req, res) => {
      const name = decodeURIComponent(pathParam(req, 'name'));
      const skill = crew().resolveSkill(name);
      if (!skill.inCatalog && !skill.preferred) {
        throw new HttpError(404, `Skill not in catalog: ${name}`);
      }
      res.json(skill);
    }),
  );

  router.post(
    '/plan',
    asyncRoute(async (req, res) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const goal = requireString(body, 'goal');
      const modeKey = optionalString(body, 'modeKey');
      const families = parseStringList(body['families']);
      const phases = parseStringList(body['phases']);
      const agentIds = parseStringList(body['agentIds']);
      const skillNames = parseStringList(body['skillNames']);
      const includeEsfr = body['includeEsfr'] === undefined ? true : body['includeEsfr'] === true;
      const compact = body['compact'] === undefined ? true : body['compact'] === true;

      try {
        const plan = crew().plan({
          goal,
          ...(modeKey ? { modeKey } : {}),
          ...(families ? { families } : {}),
          ...(phases ? { phases } : {}),
          ...(agentIds ? { agentIds } : {}),
          ...(skillNames ? { skillNames } : {}),
          includeEsfr,
          compact,
        });
        res.status(201).json(plan);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/not found|required|matched/i.test(message)) {
          throw new HttpError(400, message);
        }
        throw error;
      }
    }),
  );

  return router;
}
