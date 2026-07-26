import { Router } from 'express';
import { asyncRoute, HttpError, optionalString, pathParam, requireString } from './http.js';
import type { AppServices } from '../services.js';
import type { ChainStepInput } from '../core/TaskOrchestrator.js';
import { parseTaskSpec, InvalidTaskSpecError } from '../core/TaskSpec.js';
import type { TaskSpec } from '../types.js';

function readChainSteps(body: unknown): ChainStepInput[] {
  if (typeof body !== 'object' || body === null) {
    throw new HttpError(400, 'Request body must be a JSON object');
  }
  const steps = (body as Record<string, unknown>)['steps'];
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new HttpError(400, 'Field "steps" must be a non-empty array');
  }
  return steps.map((step, index) => {
    if (typeof step !== 'object' || step === null) {
      throw new HttpError(400, `Step ${index} must be an object`);
    }
    const record = step as Record<string, unknown>;
    const agentId = record['agentId'] ?? record['profileId'];
    if (typeof agentId !== 'string' || agentId.length === 0) {
      throw new HttpError(400, `Step ${index} requires "agentId" (or legacy "profileId")`);
    }
    const input = record['input'];
    return {
      agentId,
      ...(typeof input === 'string' ? { input } : {}),
    };
  });
}

function readOptionalSpec(body: unknown): TaskSpec | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const raw = (body as Record<string, unknown>)['spec'] ?? (body as Record<string, unknown>)['spec_json'];
  if (raw === undefined) return undefined;
  try {
    return parseTaskSpec(raw);
  } catch (error) {
    if (error instanceof InvalidTaskSpecError) {
      throw new HttpError(400, error.message);
    }
    throw error;
  }
}

export function tasksRouter(services: AppServices): Router {
  const router = Router();

  router.get(
    '/',
    asyncRoute(async (_req, res) => {
      res.json(await services.tasks.listTasks());
    }),
  );

  router.post(
    '/',
    asyncRoute(async (req, res) => {
      const agentId =
        optionalString(req.body, 'agent_id') ??
        optionalString(req.body, 'profile_id');
      if (!agentId) {
        throw new HttpError(400, 'Field "agent_id" (or legacy "profile_id") is required');
      }
      const task = await services.tasks.createTask({
        agentId,
        title: requireString(req.body, 'title'),
        input: requireString(req.body, 'input_text'),
        ...(optionalString(req.body, 'intent') ? { intent: optionalString(req.body, 'intent') as string } : {}),
        ...(optionalString(req.body, 'goal') ? { goal: optionalString(req.body, 'goal') as string } : {}),
        ...(readOptionalSpec(req.body) ? { spec: readOptionalSpec(req.body) as TaskSpec } : {}),
      });
      res.status(201).json(task);
    }),
  );

  router.get(
    '/:id',
    asyncRoute(async (req, res) => {
      res.json(await services.tasks.loadTask(pathParam(req, 'id')));
    }),
  );

  router.patch(
    '/:id',
    asyncRoute(async (req, res) => {
      const input = optionalString(req.body, 'input_text');
      if (input === undefined) {
        throw new HttpError(400, 'Field "input_text" is required');
      }
      res.json(await services.tasks.updateInput(pathParam(req, 'id'), input));
    }),
  );

  router.post(
    '/:id/run',
    asyncRoute(async (req, res) => {
      const response = await services.tasks.runTask(pathParam(req, 'id'));
      res.json({
        taskId: pathParam(req, 'id'),
        agentId: response.agentId,
        output: response.output,
        connector: response.connector,
        model: response.model,
        model_type: response.modelType,
        is_mock: response.isMock,
      });
    }),
  );

  router.post(
    '/:id/chain',
    asyncRoute(async (req, res) => {
      const steps = readChainSteps(req.body);
      const responses = await services.tasks.runChain(pathParam(req, 'id'), steps);
      res.json({
        taskId: pathParam(req, 'id'),
        steps: responses.map((response, index) => ({
          step: index,
          agentId: response.agentId,
          profileId: response.agentId,
          connector: response.connector,
          model: response.model,
          model_type: response.modelType,
          is_mock: response.isMock,
          output: response.output,
        })),
      });
    }),
  );

  router.get(
    '/:id/lineage',
    asyncRoute(async (req, res) => {
      res.json(await services.lineage.getLineageForTask(pathParam(req, 'id')));
    }),
  );

  router.get(
    '/:id/artifacts',
    asyncRoute(async (req, res) => {
      res.json(await services.lineage.getArtifactsForTask(pathParam(req, 'id')));
    }),
  );

  router.get(
    '/:id/messages',
    asyncRoute(async (req, res) => {
      res.json(await services.bus.getMessagesForTask(pathParam(req, 'id')));
    }),
  );

  return router;
}
