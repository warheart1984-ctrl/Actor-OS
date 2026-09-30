import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { NextFunction, Request, Response } from 'express';
import type { CorsOptions } from 'cors';

export type SecurityConfig = {
  /** Shared bearer token; when unset the API is open (local development). */
  apiToken: string | null;
  /** Browser origins allowed to call the API cross-origin. */
  corsOrigins: string[];
};

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

export function readSecurityConfig(env: NodeJS.ProcessEnv = process.env): SecurityConfig {
  const token = env['LINEAGE_API_TOKEN']?.trim();
  const origins = env['CORS_ORIGINS']
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return {
    apiToken: token ? token : null,
    corsOrigins: origins?.length ? origins : DEFAULT_CORS_ORIGINS,
  };
}

export function corsOptions(config: SecurityConfig): CorsOptions {
  return { origin: config.corsOrigins };
}

function tokensMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function bearerFrom(header: string | undefined): string | null {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

/** Paths reachable without a token: liveness only, no data. */
const PUBLIC_PATHS = new Set(['/api/health']);

/** Requires `Authorization: Bearer <LINEAGE_API_TOKEN>` on /api when a token is configured. */
export function requireApiToken(config: SecurityConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const fullPath = `${req.baseUrl}${req.path}`;
    if (!config.apiToken || req.method === 'OPTIONS' || PUBLIC_PATHS.has(fullPath)) {
      next();
      return;
    }
    const provided = bearerFrom(req.headers.authorization);
    if (provided && tokensMatch(provided, config.apiToken)) {
      next();
      return;
    }
    res.status(401).json({ error: 'Missing or invalid API token' });
  };
}

/**
 * WebSocket upgrades cannot carry custom headers from a browser, so the token
 * may also come as `?token=`. Origin is checked against the CORS allowlist.
 */
export function authorizeUpgrade(config: SecurityConfig, req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (origin && !config.corsOrigins.includes(origin)) return false;
  if (!config.apiToken) return true;
  const url = new URL(req.url ?? '/', 'http://localhost');
  const provided = bearerFrom(req.headers.authorization) ?? url.searchParams.get('token');
  return provided !== null && tokensMatch(provided, config.apiToken);
}
