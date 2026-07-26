import { Router } from 'express';
import {
  createProfile,
  listProfiles,
  loadProfile,
  updateProfile,
} from '../core/ProfileManager.js';
import { type ModelBinding } from '../core/ModelBinding.js';
import { asyncRoute, HttpError, optionalString, pathParam, requireString } from './http.js';
import type { AppServices } from '../services.js';
import type { ProfileSettings } from '../types.js';

function readSettings(body: unknown): ProfileSettings | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const value = (body as Record<string, unknown>)['settings_json'];
  if (typeof value !== 'object' || value === null) return undefined;
  return value as ProfileSettings;
}

function readBinding(body: unknown): ModelBinding | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const raw = (body as Record<string, unknown>)['binding'];
  if (typeof raw !== 'object' || raw === null) return undefined;
  const connector = (raw as Record<string, unknown>)['connector'];
  const model = (raw as Record<string, unknown>)['model'];
  if (typeof connector !== 'string' || typeof model !== 'string') {
    throw new HttpError(400, 'binding requires string fields "connector" and "model"');
  }
  if (!connector || !model) {
    throw new HttpError(400, 'binding.connector and binding.model must be non-empty');
  }
  return { connector, model };
}

export function profilesRouter(services: AppServices): Router {
  const router = Router();

  router.get(
    '/',
    asyncRoute(async (_req, res) => {
      res.json(await listProfiles());
    }),
  );

  router.post(
    '/',
    asyncRoute(async (req, res) => {
      const binding = readBinding(req.body);
      const modelType = optionalString(req.body, 'model_type');
      if (!binding && !modelType) {
        throw new HttpError(400, 'Provide binding { connector, model } or model_type');
      }
      const profile = await createProfile({
        ...(optionalString(req.body, 'id') ? { id: optionalString(req.body, 'id') as string } : {}),
        name: requireString(req.body, 'name'),
        ...(binding ? { binding } : {}),
        ...(modelType ? { model_type: modelType } : {}),
        role: optionalString(req.body, 'role') ?? null,
        ...(readSettings(req.body) ? { settings_json: readSettings(req.body) as ProfileSettings } : {}),
      });
      res.status(201).json(profile);
    }),
  );

  router.get(
    '/:id',
    asyncRoute(async (req, res) => {
      res.json(await loadProfile(pathParam(req, 'id')));
    }),
  );

  router.patch(
    '/:id',
    asyncRoute(async (req, res) => {
      const settings = readSettings(req.body);
      const binding = readBinding(req.body);
      res.json(
        await updateProfile(pathParam(req, 'id'), {
          ...(optionalString(req.body, 'name') ? { name: optionalString(req.body, 'name') as string } : {}),
          ...(optionalString(req.body, 'model_type')
            ? { model_type: optionalString(req.body, 'model_type') as string }
            : {}),
          ...(binding ? { binding } : {}),
          ...(optionalString(req.body, 'role') !== undefined
            ? { role: optionalString(req.body, 'role') as string }
            : {}),
          ...(settings ? { settings_json: settings } : {}),
        }),
      );
    }),
  );

  router.get(
    '/:id/tasks',
    asyncRoute(async (req, res) => {
      res.json(await services.tasks.listTasksForProfile(pathParam(req, 'id')));
    }),
  );

  router.get(
    '/:id/lineage',
    asyncRoute(async (req, res) => {
      res.json(await services.lineage.getLineageForProfile(pathParam(req, 'id')));
    }),
  );

  return router;
}
