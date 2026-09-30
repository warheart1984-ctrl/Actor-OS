import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MandalaCrewEngine,
  parseAgentsYaml,
} from '../core/MandalaCrewEngine.js';

describe('MandalaCrewEngine pack invariants', () => {
  const crew = new MandalaCrewEngine();

  it('loads 100 pre-ESFR agents and ESFR as #101', () => {
    const agents = crew.listAgents();
    const esfr = crew.getEsfr();
    assert.equal(agents.length, 100);
    assert.equal(esfr.id, 'ls-esfr');
    assert.equal(esfr.order, 101);
    assert.ok(!agents.some((agent) => agent.id === 'ls-esfr'));
    assert.ok(!agents.some((agent) => agent.id === 'ls-crew-foreman'));
    assert.ok(agents.every((agent) => agent.id.startsWith('ls-')));
    assert.equal(agents[0]?.id, 'ls-problem-discovery');
    assert.equal(agents[0]?.description, 'Finds real-world problems worth solving.');
    assert.equal(agents[99]?.id, 'ls-long-term-stewardship');
  });

  it('exposes six phases covering the roster', () => {
    const phases = crew.listPhases();
    assert.equal(phases.length, 6);
    assert.deepEqual(
      phases.map((p) => p.id),
      ['vision', 'architecture', 'design', 'implementation', 'testing', 'operations'],
    );
    const status = crew.getStatus();
    assert.equal(status.phaseCount, 6);
    assert.equal(status.foreman.inRoster, false);
  });

  it('modes registry yields 1000 ModeKeys', () => {
    const status = crew.getStatus();
    assert.equal(status.modeKeyCount, 1000);
    const page = crew.listModes(undefined, 5, 0);
    assert.equal(page.total, 1000);
    assert.equal(page.items.length, 5);
    assert.ok(crew.getMode('sage__navigator__evidence-strict'));
  });

  it('vendor catalog loads full names, preferred map, and path index', () => {
    const status = crew.getStatus();
    assert.ok(status.vendorCatalogCount >= 1000, 'expected full catalog snapshot');
    assert.ok(status.vendorPreferredUnique >= 100, 'expected preferred map');
    assert.ok(status.vendorPathIndexCount >= 100, 'expected path index');
    const all = crew.searchSkills({ limit: 10, offset: 0 });
    assert.equal(all.total, status.vendorCatalogCount);
    const preferred = crew.searchSkills({ preferredOnly: true, limit: 5 });
    assert.equal(preferred.total, status.vendorPreferredUnique);
    assert.ok(preferred.items.every((item) => item.preferred));
  });

  it('plans compact pipeline by phase with ESFR last and embeds ModeKey', () => {
    const plan = crew.plan({
      goal: 'Auth for LineageStudio',
      modeKey: 'sage__navigator__evidence-strict',
      skillNames: ['auth', 'bootstrap'],
      compact: true,
      includeEsfr: true,
    });
    assert.equal(plan.steps.filter((s) => s.role === 'pre_esfr').length, 6);
    assert.equal(plan.steps[plan.steps.length - 1]?.agentId, 'ls-esfr');
    assert.equal(plan.steps[plan.steps.length - 1]?.order, 101);
    assert.equal(plan.esfrLast, true);
    assert.ok(plan.mode?.key === 'sage__navigator__evidence-strict');
    assert.match(plan.invokeBrief, /ACTIVE MODE LENS/);
    assert.match(plan.invokeBrief, /ls-esfr/);
    assert.equal(plan.honesty.modeAutoApply.status, 'approximated');
    assert.ok(plan.skillRouting.requested.includes('auth'));
    assert.ok(plan.steps[0]?.description);
  });

  it('can address full roster when compact=false', () => {
    const plan = crew.plan({
      goal: 'Full crew pass',
      compact: false,
      includeEsfr: true,
    });
    assert.equal(plan.steps.filter((step) => step.role === 'pre_esfr').length, 100);
    assert.equal(plan.steps.filter((step) => step.role === 'esfr').length, 1);
  });

  it('resolves skills with path metadata when indexed', () => {
    const sample = crew.searchSkills({ limit: 1 }).items[0];
    assert.ok(sample);
    const resolved = crew.resolveSkill(sample.name);
    assert.equal(resolved.inCatalog, true);
    assert.equal(resolved.executableInProduct, false);
    assert.match(resolved.loadHint, /SKILL\.md/);
  });
});

describe('parseAgentsYaml', () => {
  it('parses roster + phase + description + esfr gate', () => {
    const parsed = parseAgentsYaml(`
agents:
  - id: ls-problem-discovery
    name: "Problem Discovery Agent"
    description: "Finds real-world problems worth solving."
    family: vision
    phase: vision
    order: 1
    source: "lineage-100/vision"
    cursor_agent: .cursor/agents/ls-problem-discovery.md
orchestration:
  id: ls-crew-foreman
  in_pre_esfr_count: false
esfr:
  id: ls-esfr
  order: 101
  name: "ESFR Engineer Standards"
  description: "Final ship gate after the 100 pre-ESFR agents."
  cursor_agent: .cursor/agents/ls-esfr.md
modes:
  compositional_per_agent: 1000
`);
    assert.equal(parsed.agents.length, 1);
    assert.equal(parsed.agents[0]?.description, 'Finds real-world problems worth solving.');
    assert.equal(parsed.agents[0]?.phase, 'vision');
    assert.equal(parsed.esfr.order, 101);
  });
});
