import cors from 'cors';
import express, { type Express } from 'express';
import { agentsRouter } from './api/agents.js';
import { crewRouter } from './api/crew.js';
import { errorMiddleware } from './api/http.js';
import { lineageRouter } from './api/lineage.js';
import { profilesRouter } from './api/profiles.js';
import { rtsRouter } from './api/rts.js';
import { tasksRouter } from './api/tasks.js';
import { getDb } from './db/Database.js';
import { describeRegistry } from './models/connectors/registry.js';
import type { AppServices } from './services.js';

export function createApp(services: AppServices): Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    const crew = services.crew.getStatus();
    res.json({
      status: 'ok',
      database: getDb().dialect,
      providers: describeRegistry(services.connectors),
      mandalaCrew: {
        status: crew.status,
        preEsfrCount: crew.preEsfrCount,
        esfrSlot: crew.esfrSlot,
        phaseCount: crew.phaseCount,
        modeKeyCount: crew.modeKeyCount,
        vendorCatalogCount: crew.vendorCatalogCount,
      },
      rts: (() => {
        const catalog = services.rts.getCatalog(0);
        return {
          status: catalog.status,
          skillCount: catalog.skills.count,
          structureCount: catalog.structures.length,
        };
      })(),
    });
  });

  app.use('/api/profiles', profilesRouter(services));
  app.use('/api/tasks', tasksRouter(services));
  app.use('/api/lineage', lineageRouter(services));
  app.use('/api/agents', agentsRouter(services));
  app.use('/api/crew', crewRouter(services));
  app.use('/api/rts', rtsRouter(services));

  app.use(errorMiddleware);
  return app;
}
