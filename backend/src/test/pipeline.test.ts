import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createApp } from '../app.js';
import { CrewPipelineRunner, DOC_REVIEW_PIPELINE, pipelineAgentIds } from '../core/CrewPipeline.js';
import { createProfile, listProfiles } from '../core/ProfileManager.js';
import { LineageEngine } from '../core/LineageEngine.js';
import { StandardsGate, parseVerdictLine } from '../core/StandardsGate.js';
import { TaskOrchestrator } from '../core/TaskOrchestrator.js';
import { closeDatabase, getDb, initDatabase } from '../db/Database.js';
import { ensureSeedProfiles, SEED_PROFILES, seedIfEmpty } from '../db/seed.js';
import { ModelRouter } from '../models/ModelRouter.js';
import { buildConnectorRegistry } from '../models/connectors/registry.js';
import { buildServices } from '../services.js';
import type { ModelConnector } from '../models/connectors/ModelConnector.js';

/** A "live" connector with a fixed reply, to exercise the gate's model review. */
function fixedConnector(provider: string, text: string): ModelConnector {
  return {
    provider,
    isMock: false,
    invoke: async () => ({ text, raw: { fixed: true } }),
  } as ModelConnector;
}

function runnerWith(overrides: Record<string, ModelConnector>) {
  const registry = { ...buildConnectorRegistry({}), ...overrides };
  const router = new ModelRouter(registry);
  const lineage = new LineageEngine();
  const tasks = new TaskOrchestrator(router, lineage);
  return { runner: new CrewPipelineRunner(tasks, router, lineage), lineage, tasks, router };
}

/** The gate agent is bound to anthropic in the seed data. */
function runnerWithGateReply(reply: string) {
  return runnerWith({ anthropic: fixedConnector('anthropic', reply) });
}

describe('parseVerdictLine', () => {
  it('reads the last VERDICT line and fails closed without one', () => {
    assert.equal(parseVerdictLine('ok\nVERDICT: APPROVE'), 'approve');
    assert.equal(parseVerdictLine('VERDICT: APPROVE\nsecond thoughts\nverdict: reject'), 'reject');
    assert.equal(parseVerdictLine('Looks fine to me.'), null);
  });
});

describe('Crew pipeline on the core engine', () => {
  before(async () => {
    await initDatabase({ driver: 'sqlite', location: ':memory:' });
    await seedIfEmpty();
  });

  after(async () => {
    await closeDatabase();
  });

  it('runs every step through ModelRouter and records it in lineage', async () => {
    const services = buildServices({ NODE_ENV: 'test' });
    const result = await services.pipelines.run('doc-review', {
      title: 'Launch note',
      input: 'Write a short note announcing the v1 launch.',
    });

    assert.equal(result.responses.length, DOC_REVIEW_PIPELINE.steps.length);
    assert.deepEqual(
      result.responses.map((response) => response.agentId),
      DOC_REVIEW_PIPELINE.steps.map((step) => step.agentId),
    );

    const events = await services.lineage.getLineageForTask(result.task.id);
    const steps = events.filter((event) => event.event_type === 'chain_step');
    assert.equal(steps.length, DOC_REVIEW_PIPELINE.steps.length);
    const verdictEvent = events.find((event) => event.payload_json['gate'] === 'esfr');
    assert.ok(verdictEvent, 'gate verdict is in lineage');

    const artifacts = await services.lineage.getArtifactsForTask(result.task.id);
    assert.ok(artifacts.some((artifact) => artifact.kind === 'gate_report'));
  });

  it('approves on mock connectors only via deterministic checks, and says so', async () => {
    const services = buildServices({ NODE_ENV: 'test' });
    const result = await services.pipelines.run('doc-review', {
      title: 'Mock run',
      input: 'Write two sentences about lineage.',
    });
    assert.equal(result.gate.verdict, 'approved');
    assert.equal(result.task.status, 'done');
    const review = result.gate.checks.find((check) => check.id === 'model_review');
    assert.equal(review?.status, 'skipped');
    assert.ok(result.gate.warnings.some((warning) => /mock/.test(warning)));
  });

  it('rejects when a must_include term is missing from the final output', async () => {
    // The mock connector echoes its prompt, so pin the last step (summarizer,
    // bound to mistral) to a reply that cannot contain the term.
    const { runner } = runnerWith({ mistral: fixedConnector('mistral', 'TL;DR: a note. A note.') });
    const result = await runner.run('doc-review', {
      title: 'Needs a term',
      input: 'Write a note.',
      mustInclude: ['zebra-quartz-9'],
    });
    assert.equal(result.gate.verdict, 'rejected');
    assert.equal(result.task.status, 'rejected');
    assert.equal(result.gate.checks.find((check) => check.id === 'must_include')?.status, 'failed');
  });

  it('rejects when the live gate agent says REJECT', async () => {
    const { runner } = runnerWithGateReply('Claims are unsupported.\nVERDICT: REJECT');
    const result = await runner.run('doc-review', { title: 'Live gate', input: 'Write a note.' });
    assert.equal(result.gate.verdict, 'rejected');
    assert.equal(result.gate.checks.find((check) => check.id === 'model_review')?.status, 'failed');
  });

  it('fails closed when the live gate agent gives no verdict line', async () => {
    const { runner } = runnerWithGateReply('Seems fine overall.');
    const result = await runner.run('doc-review', { title: 'No verdict', input: 'Write a note.' });
    assert.equal(result.gate.verdict, 'rejected');
  });

  it('approves when the live gate agent says APPROVE and checks pass', async () => {
    const { runner } = runnerWithGateReply('No issues.\nVERDICT: APPROVE');
    const result = await runner.run('doc-review', { title: 'Approve', input: 'Write a note.' });
    assert.equal(result.gate.verdict, 'approved');
    assert.equal(result.gate.checks.find((check) => check.id === 'model_review')?.status, 'passed');
  });

  it('detects a lineage trail that was altered after the fact', async () => {
    const router = new ModelRouter(buildConnectorRegistry({}));
    const lineage = new LineageEngine();
    const tasks = new TaskOrchestrator(router, lineage);
    const task = await tasks.createTask({ agentId: 'agent_drafter', title: 'Tamper', input: 'Draft.' });
    const responses = await tasks.runChain(task.id, [
      { agentId: 'agent_drafter' },
      { agentId: 'agent_research' },
    ]);

    const [step] = (await lineage.getLineageForTask(task.id)).filter(
      (event) => event.event_type === 'chain_step',
    );
    assert.ok(step);
    const tampered = { ...step.payload_json, output: 'rewritten after the fact' };
    await getDb().run('UPDATE lineage_events SET payload_json = ? WHERE id = ?', [
      JSON.stringify(tampered),
      step.id,
    ]);

    const verdict = await new StandardsGate(router, lineage, 'agent_gate').evaluate(task, responses);
    assert.equal(verdict.verdict, 'rejected');
    assert.equal(verdict.checks.find((check) => check.id === 'evidence_intact')?.status, 'failed');
  });

  it('exposes POST /api/pipelines/:id/run', async () => {
    const app = createApp(buildServices({ NODE_ENV: 'test' }), { apiToken: null, corsOrigins: [] });
    const server = app.listen(0);
    try {
      const addr = server.address();
      assert.ok(addr && typeof addr === 'object');
      const base = `http://127.0.0.1:${addr.port}/api/pipelines`;
      const list = (await (await fetch(base)).json()) as Array<{ id: string }>;
      assert.ok(list.some((pipeline) => pipeline.id === 'doc-review'));

      const res = await fetch(`${base}/doc-review/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'HTTP run', input: 'Write a note.' }),
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as { verdict: string; steps: unknown[] };
      assert.equal(body.verdict, 'approved');
      assert.equal(body.steps.length, DOC_REVIEW_PIPELINE.steps.length);

      const missing = await fetch(`${base}/nope/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'x', input: 'y' }),
      });
      assert.equal(missing.status, 404);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

describe('ensureSeedProfiles', () => {
  before(async () => {
    await initDatabase({ driver: 'sqlite', location: ':memory:' });
  });

  after(async () => {
    await closeDatabase();
  });

  it('adds missing pipeline agents to an older database without touching existing ones', async () => {
    const [email] = SEED_PROFILES;
    assert.ok(email);
    await createProfile({ ...email, role: 'edited by user' });

    const inserted = await ensureSeedProfiles(pipelineAgentIds());
    assert.equal(inserted, pipelineAgentIds().length);
    assert.equal(await ensureSeedProfiles(pipelineAgentIds()), 0);

    const ids = (await listProfiles()).map((profile) => profile.id);
    for (const id of pipelineAgentIds()) assert.ok(ids.includes(id), `${id} present`);
    const kept = (await listProfiles()).find((profile) => profile.id === email.id);
    assert.equal(kept?.role, 'edited by user');
  });
});
