import { Router } from 'express';
import { asyncRoute } from './http.js';
import type { AppServices } from '../services.js';

export function lineageRouter(services: AppServices): Router {
  const router = Router();

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      const rawLimit = Number(req.query['limit']);
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 1000) : 200;
      res.json(await services.lineage.getRecentLineage(limit));
    }),
  );

  return router;
}
