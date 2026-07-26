import cors from 'cors';
import express, { type Express } from 'express';
import { agentsRouter } from './api/agents.js';
import { errorMiddleware } from './api/http.js';
import { lineageRouter } from './api/lineage.js';
import { profilesRouter } from './api/profiles.js';
import { tasksRouter } from './api/tasks.js';
import { getDb } from './db/Database.js';
import { describeRegistry } from './models/connectors/registry.js';
import type { AppServices } from './services.js';

export function createApp(services: AppServices): Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      database: getDb().dialect,
      providers: describeRegistry(services.connectors),
    });
  });

  app.use('/api/profiles', profilesRouter(services));
  app.use('/api/tasks', tasksRouter(services));
  app.use('/api/lineage', lineageRouter(services));
  app.use('/api/agents', agentsRouter(services));

  app.use(errorMiddleware);
  return app;
}
