/**
 * End-to-end smoke against a running API (default http://localhost:4000).
 * Exercise create → run → chain → agent send → lineage with TaskSpec.
 *
 * Usage: npm --workspace backend run smoke
 */
const base = (process.env['API_URL'] ?? 'http://localhost:4000').replace(/\/$/, '');

async function call(method: string, path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const health = (await call('GET', '/api/health')) as {
  status: string;
  database: string;
};
assert(health.status === 'ok', 'health check failed');
console.log(`health ok (db=${health.database})`);

const profiles = (await call('GET', '/api/profiles')) as Array<{
  id: string;
  name: string;
  binding?: { connector: string; model: string };
}>;
assert(profiles.length >= 2, 'expected seeded agent profiles');
assert(profiles.every((p) => p.binding?.connector), 'profiles should expose binding');

const email =
  profiles.find((p) => p.id === 'agent_email') ??
  profiles.find((p) => p.id === 'gpt_email') ??
  profiles[0];
const research =
  profiles.find((p) => p.id === 'agent_research') ??
  profiles.find((p) => p.id === 'claude_research') ??
  profiles[1];
const summary =
  profiles.find((p) => p.id === 'agent_summary') ??
  profiles.find((p) => p.id === 'mistral_summary') ??
  profiles[profiles.length - 1];

assert(email && research && summary, 'need at least three agents');
console.log(`agents: ${email.name} → ${research.name} → ${summary.name}`);

const task = (await call('POST', '/api/tasks', {
  agent_id: email.id,
  title: 'Smoke roadmap email',
  intent: 'draft',
  input_text: 'Draft a short client email about the roadmap.',
})) as { id: string; spec_json: { intent: string; agent_id: string } | null };

assert(task.spec_json?.intent === 'draft', 'task should store TaskSpec');
assert(task.spec_json?.agent_id === email.id, 'TaskSpec.agent_id should match owner');
console.log('task_spec ok');

const run = (await call('POST', `/api/tasks/${task.id}/run`)) as {
  output: string;
  is_mock: boolean;
  agentId: string;
  connector: string;
};
assert(typeof run.output === 'string' && run.output.length > 0, 'run produced no output');
assert(run.agentId === email.id, 'run should address the agent, not a vendor name');
console.log(`run ok (agent=${run.agentId}, connector=${run.connector}, mock=${run.is_mock})`);

const chain = (await call('POST', `/api/tasks/${task.id}/chain`, {
  steps: [{ agentId: research.id }, { agentId: summary.id }],
})) as { steps: Array<{ agentId: string }> };
assert(chain.steps.length === 2, 'chain should return 2 steps');
console.log(`chain ok (${chain.steps.map((s) => s.agentId).join(' → ')})`);

const sent = (await call('POST', '/api/agents/send', {
  taskId: task.id,
  fromAgentId: email.id,
  toAgentId: research.id,
  content: 'Review the draft for tone.',
  intent: 'review',
})) as { status: string; response?: { output: string; agentId: string } };
assert(sent.status === 'sent', 'agent send failed');
assert(sent.response?.output, 'agent reply missing');
console.log('agent send ok');

const lineage = (await call('GET', `/api/tasks/${task.id}/lineage`)) as Array<{
  event_type: string;
  payload_json: Record<string, unknown>;
}>;
const types = new Set(lineage.map((event) => event.event_type));
for (const required of ['task', 'decision', 'chain_step', 'interaction', 'artifact']) {
  assert(types.has(required), `lineage missing ${required}`);
}
const taskEvent = lineage.find((event) => event.event_type === 'task');
assert(taskEvent?.payload_json['task_spec'], 'lineage task event should embed TaskSpec');
console.log(`lineage ok (${lineage.length} events: ${[...types].join(', ')})`);

const artifacts = (await call('GET', `/api/tasks/${task.id}/artifacts`)) as Array<{ kind: string }>;
assert(
  artifacts.some((artifact) => artifact.kind === 'task_spec'),
  'expected task_spec artifact',
);

const graph = (await call('GET', '/api/agents/graph')) as {
  nodes: Array<{ binding?: { connector: string } }>;
  edges: unknown[];
};
assert(graph.nodes.length >= 2, 'graph needs nodes');
assert(graph.nodes.every((node) => node.binding?.connector), 'graph nodes need binding');
assert(graph.edges.length >= 1, 'graph needs at least one edge after agent send');
console.log(`graph ok (nodes=${graph.nodes.length}, edges=${graph.edges.length})`);

console.log('SMOKE PASSED');
