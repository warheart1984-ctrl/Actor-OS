import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** Forwards rejected promises from async route handlers to the error middleware. */
export function asyncRoute(
  handler: (req: Request, res: Response) => Promise<unknown>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req, res).catch(next);
  };
}

/** Express types path params as possibly-undefined under strict index access. */
export function pathParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new HttpError(400, `Missing path parameter "${name}"`);
  }
  return value;
}

export function requireString(body: unknown, field: string): string {
  if (typeof body !== 'object' || body === null) {
    throw new HttpError(400, 'Request body must be a JSON object');
  }
  const value = (body as Record<string, unknown>)[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(400, `Field "${field}" is required and must be a non-empty string`);
  }
  return value;
}

export function optionalString(body: unknown, field: string): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const value = (body as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : undefined;
}

export function errorMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  const notFound = /not found/i.test(message);
  if (!notFound) {
    console.error('[api] unhandled error:', error);
  }
  res.status(notFound ? 404 : 500).json({ error: message });
}
