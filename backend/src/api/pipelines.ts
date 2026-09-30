import { Router } from 'express';
import { PipelineNotFoundError } from '../core/CrewPipeline.js';
import { asyncRoute, HttpError, pathParam, requireString } from './http.js';
import type { AppServices } from '../services.js';

function optionalStringList(body: unknown, field: string): string[] | undefined {
  const value = (body as Record<string, unknown>)[field];
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new HttpError(400, `Field "${field}" must be an array of strings`);
  }
  const cleaned = (value as string[]).map((entry) => entry.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : undefined;
}

export function pipelinesRouter(services: AppServices): Router {
  const router = Router();

  router.get(
    '/',
    asyncRoute(async (_req, res) => {
      res.json(services.pipelines.list());
    }),
  );

  router.post(
    '/:id/run',
    asyncRoute(async (req, res) => {
      const body: unknown = req.body;
      const mustInclude = optionalStringList(body, 'must_include');
      const successCriteria = optionalStringList(body, 'success_criteria');
      try {
        const result = await services.pipelines.run(pathParam(req, 'id'), {
          title: requireString(body, 'title'),
          input: requireString(body, 'input'),
          ...(mustInclude ? { mustInclude } : {}),
          ...(successCriteria ? { successCriteria } : {}),
        });
        res.json({
          pipelineId: result.pipelineId,
          taskId: result.task.id,
          status: result.task.status,
          verdict: result.gate.verdict,
          checks: result.gate.checks,
          warnings: result.gate.warnings,
          review: result.gate.review,
          steps: result.responses.map((response, index) => ({
            step: index,
            agentId: response.agentId,
            connector: response.connector,
            model: response.model,
            is_mock: response.isMock,
            output: response.output,
          })),
          final_output: result.responses[result.responses.length - 1]?.output ?? '',
        });
      } catch (error) {
        if (error instanceof PipelineNotFoundError) throw new HttpError(404, error.message);
        throw error;
      }
    }),
  );

  return router;
}
