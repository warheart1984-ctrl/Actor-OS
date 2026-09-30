import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MandalaCrewEngine } from '../core/MandalaCrewEngine.js';
import { RtsEngine } from '../core/RtsEngine.js';
import { RtsSessionEngine } from '../core/RtsSessionEngine.js';
import { createApp } from '../app.js';
import { buildServices } from '../services.js';

const packRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../packs/mandala-crew',
);

describe('RTS catalog and sessions', () => {
  it('loads RTS pack from mandala-crew', () => {
    const rts = new RtsEngine(packRoot);
    const catalog = rts.getCatalog(10);
    assert.equal(catalog.status, 'declared_operable');
    assert.equal(catalog.structures.length, 8);
    assert.equal(catalog.drones.length, 8);
    assert.ok(catalog.skills.count >= 100);
    assert.equal(catalog.skills.executableInProduct, false);
  });

  it('mission action routes through crew plan with ESFR last', () => {
    const rts = new RtsEngine(packRoot);
    const crew = new MandalaCrewEngine(packRoot);
    const sessions = new RtsSessionEngine(rts, crew);
    const session = sessions.createSession();
    const next = sessions.applyAction(session.id, {
      type: 'start_mission',
      goal: 'Test governed ship',
      compact: true,
    });
    assert.ok(next.missions[0]?.plan);
    assert.equal(next.missions[0]?.plan?.esfrLast, true);
    assert.ok((next.missions[0]?.plan?.steps.length ?? 0) >= 2);
  });

  it('exposes GET /api/rts/catalog', async () => {
    const services = buildServices({ ...process.env, MANDALA_CREW_ROOT: packRoot });
    const app = createApp(services);
    const server = app.listen(0);
    try {
      const addr = server.address();
      assert.ok(addr && typeof addr === 'object');
      const res = await fetch(`http://127.0.0.1:${addr.port}/api/rts/catalog`);
      assert.equal(res.status, 200);
      const body = (await res.json()) as { structures: unknown[]; skills: { count: number } };
      assert.equal(body.structures.length, 8);
      assert.ok(body.skills.count >= 100);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
