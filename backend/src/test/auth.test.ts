import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { Server } from 'node:http';
import { createApp } from '../app.js';
import { authorizeUpgrade, readSecurityConfig } from '../api/auth.js';
import { closeDatabase, initDatabase } from '../db/Database.js';
import { seedIfEmpty } from '../db/seed.js';
import { buildServices } from '../services.js';
import type { IncomingMessage } from 'node:http';

const TOKEN = 'test-token-123';
const ALLOWED = 'http://localhost:3000';

describe('API token and CORS', () => {
  let server: Server;
  let base: string;

  before(async () => {
    await initDatabase({ driver: 'sqlite', location: ':memory:' });
    await seedIfEmpty();
    const app = createApp(buildServices({ NODE_ENV: 'test' }), {
      apiToken: TOKEN,
      corsOrigins: [ALLOWED],
    });
    server = app.listen(0);
    const addr = server.address();
    assert.ok(addr && typeof addr === 'object');
    base = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await closeDatabase();
  });

  it('leaves /api/health public', async () => {
    const res = await fetch(`${base}/api/health`);
    assert.equal(res.status, 200);
    assert.equal(((await res.json()) as { auth: string }).auth, 'token');
  });

  it('rejects data routes without a valid token', async () => {
    assert.equal((await fetch(`${base}/api/profiles`)).status, 401);
    const wrong = await fetch(`${base}/api/profiles`, { headers: { Authorization: 'Bearer nope' } });
    assert.equal(wrong.status, 401);
  });

  it('accepts the configured bearer token', async () => {
    const res = await fetch(`${base}/api/profiles`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    assert.equal(res.status, 200);
  });

  it('only grants CORS to allowlisted origins', async () => {
    const good = await fetch(`${base}/api/health`, { headers: { Origin: ALLOWED } });
    assert.equal(good.headers.get('access-control-allow-origin'), ALLOWED);
    const bad = await fetch(`${base}/api/health`, { headers: { Origin: 'https://evil.example' } });
    assert.equal(bad.headers.get('access-control-allow-origin'), null);
  });

  it('checks origin and token on WebSocket upgrades', () => {
    const config = { apiToken: TOKEN, corsOrigins: [ALLOWED] };
    const req = (url: string, origin?: string) =>
      ({ url, headers: origin ? { origin } : {} }) as unknown as IncomingMessage;
    assert.equal(authorizeUpgrade(config, req(`/ws?token=${TOKEN}`, ALLOWED)), true);
    assert.equal(authorizeUpgrade(config, req('/ws', ALLOWED)), false);
    assert.equal(authorizeUpgrade(config, req(`/ws?token=${TOKEN}`, 'https://evil.example')), false);
  });

  it('reads config from the environment', () => {
    const config = readSecurityConfig({ LINEAGE_API_TOKEN: ' abc ', CORS_ORIGINS: 'https://a, https://b' });
    assert.equal(config.apiToken, 'abc');
    assert.deepEqual(config.corsOrigins, ['https://a', 'https://b']);
    assert.equal(readSecurityConfig({}).apiToken, null);
  });
});
