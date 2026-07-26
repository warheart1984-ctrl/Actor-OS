import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { closeDatabase, initDatabase } from '../db/Database.js';
import { seedIfEmpty } from '../db/seed.js';
import { buildServices } from '../services.js';
import { parseBinding, serializeBinding } from '../core/ModelBinding.js';
import {
  buildTaskSpec,
  parseTaskSpec,
  renderTaskSpecPrompt,
  InvalidTaskSpecError,
} from '../core/TaskSpec.js';
import {
  parseAgentTaskEnvelope,
  renderEnvelopePrompt,
  InvalidEnvelopeError,
} from '../core/AgentCollaborationEngine.js';

describe('ModelBinding', () => {
  it('round-trips connector and model', () => {
    assert.deepEqual(parseBinding('openai:gpt-4.1'), { connector: 'openai', model: 'gpt-4.1' });
    assert.equal(serializeBinding({ connector: 'anthropic', model: 'claude' }), 'anthropic:claude');
  });
});

describe('TaskSpec', () => {
  it('builds and renders a stable prompt contract', () => {
    const spec = buildTaskSpec({
      agentId: 'agent_email',
      intent: 'draft',
      primaryInput: 'Tell the client about the roadmap.',
      goal: 'A short professional email',
      constraints: { tone: 'professional', length: 'short' },
    });
    assert.equal(spec.version, '1');
    const prompt = renderTaskSpecPrompt(spec);
    assert.match(prompt, /Intent: draft/);
    assert.match(prompt, /Goal: A short professional email/);
    assert.match(prompt, /tone: professional/);
  });

  it('rejects incomplete specs', () => {
    assert.throws(() => parseTaskSpec({ intent: 'x' }), InvalidTaskSpecError);
  });
});

describe('ModelRouter', () => {
  before(async () => {
    await initDatabase({ driver: 'sqlite', location: ':memory:' });
    await seedIfEmpty();
  });

  after(async () => {
    await closeDatabase();
  });

  it('send routes through the mock connector when no keys are set', async () => {
    const services = buildServices({ NODE_ENV: 'test' });
    const response = await services.router.send({
      agentId: 'agent_email',
      input: 'Write a short greeting.',
    });
    assert.equal(response.agentId, 'agent_email');
    assert.equal(response.connector, 'openai');
    assert.equal(response.isMock, true);
    assert.match(response.output, /\[mock:openai\//);
  });

  it('chain feeds later steps from earlier outputs', async () => {
    const services = buildServices({ NODE_ENV: 'test' });
    const observed: string[] = [];
    const responses = await services.router.chain(
      [
        { agentId: 'agent_email', input: 'Draft a one-line status update.' },
        { agentId: 'agent_research', input: '' },
        { agentId: 'agent_summary', input: '' },
      ],
      async (index, request) => {
        observed.push(`${index}:${request.agentId}`);
        if (index > 0) {
          assert.ok(request.input.includes('[mock:'), 'later steps should inherit prior mock output');
        }
      },
    );
    assert.equal(responses.length, 3);
    assert.deepEqual(observed, ['0:agent_email', '1:agent_research', '2:agent_summary']);
  });

  it('swapping binding keeps agent identity', async () => {
    const { updateProfile, loadProfile } = await import('../core/ProfileManager.js');
    await updateProfile('agent_email', {
      binding: { connector: 'anthropic', model: 'claude-sonnet-4-20250514' },
    });
    const profile = await loadProfile('agent_email');
    assert.equal(profile.id, 'agent_email');
    assert.equal(profile.name, 'Email Drafter');
    assert.deepEqual(profile.binding, { connector: 'anthropic', model: 'claude-sonnet-4-20250514' });

    const services = buildServices({ NODE_ENV: 'test' });
    const response = await services.router.send({
      agentId: 'agent_email',
      input: 'Still the same agent.',
    });
    assert.equal(response.agentId, 'agent_email');
    assert.equal(response.connector, 'anthropic');
    assert.match(response.output, /\[mock:anthropic\//);

    // restore for later suites in the same process if any share state
    await updateProfile('agent_email', {
      binding: { connector: 'openai', model: 'gpt-4.1' },
    });
  });
});

describe('LineageEngine', () => {
  before(async () => {
    await initDatabase({ driver: 'sqlite', location: ':memory:' });
    await seedIfEmpty();
  });

  after(async () => {
    await closeDatabase();
  });

  it('records task_spec, chain_step, interaction, and artifact event types', async () => {
    const services = buildServices({ NODE_ENV: 'test' });
    const received: string[] = [];
    services.lineage.onEvent((event) => received.push(event.event_type));

    const task = await services.tasks.createTask({
      agentId: 'agent_email',
      title: 'Lineage coverage',
      input: 'Produce a short status note.',
      intent: 'draft',
    });
    assert.ok(task.spec_json);
    assert.equal(task.spec_json?.intent, 'draft');

    await services.tasks.runChain(task.id, [
      { agentId: 'agent_email' },
      { agentId: 'agent_research' },
    ]);
    await services.agents.dispatch(
      {
        type: 'agent_task',
        from_profile: 'agent_email',
        to_profile: 'agent_research',
        task_id: task.id,
        intent: 'review',
        input: 'Please review this note.',
      },
      true,
    );

    const events = await services.lineage.getLineageForTask(task.id);
    const types = new Set(events.map((event) => event.event_type));
    assert.ok(types.has('task'));
    assert.ok(types.has('decision'));
    assert.ok(types.has('chain_step'));
    assert.ok(types.has('interaction'));
    assert.ok(types.has('artifact'));
    assert.ok(received.includes('chain_step'));

    const created = events.find((event) => event.event_type === 'task');
    assert.ok(created?.payload_json['task_spec']);

    const artifacts = await services.lineage.getArtifactsForTask(task.id);
    assert.ok(artifacts.some((artifact) => artifact.kind === 'task_spec'));
    assert.ok(artifacts.some((artifact) => artifact.kind === 'response'));
  });
});

describe('MessageBus', () => {
  before(async () => {
    await initDatabase({ driver: 'sqlite', location: ':memory:' });
    await seedIfEmpty();
  });

  after(async () => {
    await closeDatabase();
  });

  it('persists messages and builds an agent graph with bindings', async () => {
    const services = buildServices({ NODE_ENV: 'test' });
    let delivered = false;
    services.bus.subscribe('agent_research', () => {
      delivered = true;
    });

    await services.bus.send({
      fromProfileId: 'agent_email',
      toProfileId: 'agent_research',
      content: 'hello agent',
      metadata: { type: 'agent_task', intent: 'refine' },
    });

    assert.equal(delivered, true);
    const graph = await services.bus.getGraph();
    assert.ok(graph.nodes.length >= 2);
    assert.ok(graph.nodes.every((node) => node.binding.connector.length > 0));
    assert.ok(
      graph.edges.some((edge) => edge.from === 'agent_email' && edge.to === 'agent_research'),
    );
  });
});

describe('agent_task protocol', () => {
  it('parses and renders a valid envelope', () => {
    const envelope = parseAgentTaskEnvelope({
      from_profile: 'agent_email',
      to_profile: 'agent_research',
      intent: 'fact_check',
      input: 'Check these claims.',
      constraints: { tone: 'neutral', must_include: ['sources'] },
    });
    assert.equal(envelope.type, 'agent_task');
    assert.equal(envelope.intent, 'fact_check');
    const prompt = renderEnvelopePrompt(envelope);
    assert.match(prompt, /Intent: fact_check/);
    assert.match(prompt, /must_include: sources/);
  });

  it('rejects incomplete envelopes', () => {
    assert.throws(() => parseAgentTaskEnvelope({ from_profile: 'a' }), InvalidEnvelopeError);
  });
});
