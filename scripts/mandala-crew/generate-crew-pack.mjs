#!/usr/bin/env node
/**
 * Generate LineageStudio Mandala crew pack:
 * - 100 pre-ESFR Cursor agents (Vision→Stewardship) + ESFR gate (#101)
 * - Optional foreman outside the 100 (orchestration only)
 * - Role-family skills + vendor skill maps/paths
 * - 1000 compositional modes per agent (shared registry)
 *
 * Evidence-bound: Cursor agent/skill wiring is declarative.
 * ModeKeys: approximated via invoke brief + Cursor rule (not runtime-enforced).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHASES, buildAgents100, FOREMAN, ESFR } from './agents-100.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const MRS = 'G:/Mandala Rendering Software';
const PACK = path.join(MRS, 'mandala-agent-pack');
const OUT = {
  agents: path.join(ROOT, '.cursor', 'agents'),
  skills: path.join(ROOT, '.cursor', 'skills'),
  rules: path.join(ROOT, '.cursor', 'rules'),
  crew: path.join(ROOT, 'packs', 'mandala-crew'),
  docs: path.join(ROOT, 'docs', 'mandala-crew'),
  commercial: path.join(ROOT, 'docs', 'commercial'),
};

const CREW_MODES = [
  'Sage', 'Trickster', 'Warrior', 'Monk', 'Researcher', 'Journalist', 'Poet',
  'Physicist', 'Theorist', 'Bard', 'Oracle', 'Cartographer', 'Artisan', 'Sentinel',
  'Scholar', 'Inventor', 'Diplomat', 'Hermit', 'Historian', 'Visionary',
];
const ACTOR_MODES = [
  'Navigator', 'Architect-Shadow', 'Catalyst', 'Librarian', 'Strategist',
  'Artisan-Logic', 'Mirror', 'Frontier', 'Anchor', 'Mythweaver',
];
const STANCES = [
  'evidence-strict',
  'exploratory',
  'ship-gate',
  'minimal-diff',
  'adversarial-probe',
];
const SC_MODES = [
  'Compiler', 'Refactorer', 'Debugger', 'Architect-Kernel', 'Integrator', 'Sandbox',
  'Protocol', 'Versioneer', 'Synthesizer', 'Optimizer', 'Pattern-Weaver',
  'Boundary-Guardian', 'Runtime-Sage', 'Schema-Artist', 'Pipeline-Conductor',
  'Modularist', 'Conformance', 'Testwright', 'Forge', 'Architect-Mirror',
  'Runtime-Cartographer', 'Dependency-Monk', 'Interface-Diplomat', 'Code-Historian',
  'Render-Physicist', 'Algorithm-Poet', 'System-Sentinel', 'Blueprint',
  'Runtime-Hermit', 'Constructor',
];

const AGENTS_100 = buildAgents100();

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function walkSkillMd(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.git'].includes(e.name)) continue;
      walkSkillMd(p, acc);
    } else if (e.name === 'SKILL.md') acc.push(p);
  }
  return acc;
}

function skillNameFromPath(p) {
  const parts = p.split(path.sep);
  const i = parts.lastIndexOf('skills');
  if (i >= 0 && parts[i + 1]) return parts[i + 1];
  return path.basename(path.dirname(p));
}

function inventoryVendor() {
  const roots = [
    path.join(process.env.USERPROFILE || '', '.cursor', 'plugins', 'cache'),
    path.join(process.env.USERPROFILE || '', '.cursor', 'skills'),
    path.join(process.env.USERPROFILE || '', '.agents', 'skills'),
    path.join(process.env.USERPROFILE || '', '.codex', 'skills'),
    // In-repo Cursor / LS role skills (always scan)
    path.join(ROOT, '.cursor', 'skills'),
  ];
  const paths = [];
  for (const r of roots) walkSkillMd(r, paths);
  const byName = new Map();
  for (const p of paths) {
    const n = skillNameFromPath(p);
    if (!byName.has(n)) byName.set(n, []);
    byName.get(n).push(p.replace(/\\/g, '/'));
  }
  return { count: paths.length, unique: byName.size, byName };
}

const LS_ROLE_SKILL_IDS = new Set([
  'ls-architect',
  'ls-builder',
  'ls-coding',
  'ls-implementor',
  'ls-reviewer',
  'ls-inspector',
  'ls-esfr',
  'ls-crew',
]);

function classifySkillSource(skillPath) {
  const norm = skillPath.replace(/\\/g, '/');
  const repoSkills = path.join(ROOT, '.cursor', 'skills').replace(/\\/g, '/');
  if (norm.includes(repoSkills) || norm.includes('/LineageStudio/.cursor/skills/')) {
    const name = skillNameFromPath(skillPath);
    return LS_ROLE_SKILL_IDS.has(name) ? 'ls-role' : 'cursor';
  }
  if (norm.includes('/.cursor/plugins/') || norm.includes('/.cursor/plugins\\')) return 'vendor';
  if (norm.includes('/.agents/skills/') || norm.includes('/.codex/skills/')) return 'cursor';
  if (norm.includes('/.cursor/skills/')) return 'cursor';
  return 'vendor';
}

/** RTS-facing unified skill catalog (vendor + cursor + ls-role). Indexed, not product-executed. */
function buildRtsSkillCatalog(vendor, vendorMap) {
  const preferredBy = new Map();
  for (const [agentId, entry] of Object.entries(vendorMap)) {
    const names = entry?.vendorSkills ?? entry?.resolved?.map((r) => r.name) ?? [];
    for (const name of names) {
      if (!preferredBy.has(name)) preferredBy.set(name, []);
      preferredBy.get(name).push(agentId);
    }
  }
  const skills = [];
  for (const [name, paths] of [...vendor.byName.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const primary = paths[0] ?? '';
    skills.push({
      name,
      path: primary,
      paths: paths.slice(0, 5),
      source: classifySkillSource(primary),
      preferredByAgents: preferredBy.get(name) ?? [],
    });
  }
  return {
    generatedAt: new Date().toISOString(),
    status: 'indexed',
    executableInProduct: false,
    count: skills.length,
    bySource: {
      vendor: skills.filter((s) => s.source === 'vendor').length,
      cursor: skills.filter((s) => s.source === 'cursor').length,
      'ls-role': skills.filter((s) => s.source === 'ls-role').length,
    },
    skills,
  };
}

function resolveVendorBuckets(buckets, byName, extraTokens = []) {
  const resolved = [];
  const missing = [];
  const tokens = [...buckets, ...extraTokens];
  for (const b of tokens) {
    if (byName.has(b)) {
      resolved.push({ name: b, paths: byName.get(b).slice(0, 3) });
      continue;
    }
    const bl = b.toLowerCase();
    const hits = [...byName.keys()].filter((n) => {
      const nl = n.toLowerCase();
      return nl.includes(bl) || (bl.length >= 5 && bl.includes(nl));
    });
    if (hits.length) {
      for (const h of hits.slice(0, 20)) {
        resolved.push({ name: h, paths: byName.get(h).slice(0, 2), matchedVia: b });
      }
    } else if (buckets.includes(b)) {
      missing.push(b);
    }
  }
  const seen = new Set();
  const unique = [];
  for (const r of resolved) {
    if (seen.has(r.name)) continue;
    seen.add(r.name);
    unique.push(r);
  }
  return { resolved: unique, missing };
}

function modeKey(crew, actor, stance) {
  return `${crew.toLowerCase()}__${actor.toLowerCase()}__${stance}`;
}

function buildModesRegistry() {
  const modes = [];
  let i = 0;
  for (const crew of CREW_MODES) {
    for (const actor of ACTOR_MODES) {
      for (const stance of STANCES) {
        i += 1;
        modes.push({
          id: i,
          key: modeKey(crew, actor, stance),
          crewMode: crew,
          actorMode: actor,
          stance,
          label: `${crew} + ${actor} (${stance})`,
        });
      }
    }
  }
  return {
    status: 'declared',
    convention:
      'Mandala modes are lenses (CREW_MODES / CECP_ACTOR_MODES / SOFTWARE_CREATION_MODES), not agents. ' +
      '1000 ModeKeys = 20 crew × 10 actor × 5 stance. Native named roster remains 60 (20+10+30 SC). ' +
      'Formula unchanged for the 100-agent roster (shared registry, not 100×1000 files).',
    nativeRoster: {
      crewModes: CREW_MODES,
      actorModes: ACTOR_MODES,
      softwareCreationModes: SC_MODES,
      totalNamed: CREW_MODES.length + ACTOR_MODES.length + SC_MODES.length,
    },
    compositional: {
      formula: 'crew(20) × actor(10) × stance(5) = 1000',
      count: modes.length,
      stances: STANCES,
    },
    modes,
    selection: {
      invoke: '"<CrewMode> + <ActorMode> (<stance>) <Agent>" e.g. Sentinel + Anchor (evidence-strict) Release Readiness',
      precedence: 'role bans > Constitution > Evidence > Profile > Mode',
      materialize: 'On demand via scripts/mandala-crew/materialize-mode.mjs — do not dump 100×1000 files',
      autoApplyApproximation:
        'Invoke brief embeds ModeKey + lens block; Cursor rule mandala-modekey-auto-apply.mdc asks agents to apply it. Not runtime-enforced.',
    },
  };
}

function agentBody(a, vendorResolved) {
  const skillLines = vendorResolved.resolved
    .slice(0, 40)
    .map((s) => `- \`${s.name}\`${s.matchedVia ? ` (via ${s.matchedVia})` : ''}`)
    .join('\n');
  const pathLines = vendorResolved.resolved
    .slice(0, 12)
    .flatMap((s) => (s.paths || []).slice(0, 1).map((p) => `- \`${s.name}\` → \`${p}\``))
    .join('\n');

  return `---
name: ${a.id}
description: >-
  Pre-ESFR Mandala crew #${String(a.pipelineOrder).padStart(3, '0')} (${a.phase}) — ${a.description}
  Modes: 1000 compositional ModeKeys via packs/mandala-crew/modes-registry.json.
model: inherit
---

# ${a.name}

**Pipeline slot:** ${a.pipelineOrder} / 100 pre-ESFR  
**Phase:** \`${a.phase}\` (${a.phaseName})  
**Role family:** \`${a.family}\`  
**Source:** ${a.source}  
**Writes product code:** ${a.writes ? 'yes (within approved scope)' : 'no (read-only / design / review)'}

## Purpose

${a.description}

## Working skills (load when relevant)

### Role-family skill
- \`.cursor/skills/${a.roleSkill}/SKILL.md\`
- Crew foreman (orchestration, not a roster slot): \`.cursor/skills/ls-crew/SKILL.md\`

### Vendor skills (preferred subset)
${skillLines || '_none resolved — see vendor-skills-map.json_'}

### Resolved SKILL.md paths (when discovered on this host)
${pathLines || '_paths unavailable offline — use GET /api/crew/skills/:name in the product_'}

Full obtainable catalog: \`packs/mandala-crew/vendor-skills-all-names.json\`.  
Product API can return path metadata; Cursor still executes by opening \`SKILL.md\`.

## Modes (1000 per agent)

Select one ModeKey from \`packs/mandala-crew/modes-registry.json\` (20×10×5 = **1000**).  
When an invoke brief includes a ModeKey, apply it as a lens (see rule \`mandala-modekey-auto-apply\`).

Precedence: **role bans > Constitution > Evidence > Profile > Mode**.

## Hand-off

- Advance by phase (vision → architecture → design → implementation → testing → operations).
- After release-readiness / inspector evidence, **only ESFR** (\`ls-esfr\`, pipeline **#101**) issues PromotionEligibility.
- ESFR and Crew Foreman are **not** among the 100.

## Drive-G-1

Assert only what code/tests/configs prove. Label declared/partial/roadmap explicitly.
`;
}

function foremanBody(vendorResolved) {
  const skillLines = vendorResolved.resolved.slice(0, 24).map((s) => `- \`${s.name}\``).join('\n');
  return `---
name: ${FOREMAN.id}
description: >-
  Orchestration only — NOT one of the 100 pre-ESFR agents. ${FOREMAN.description}
model: inherit
---

# ${FOREMAN.name}

**Pipeline slot:** outside roster (orchestrator)  
**Role:** dispatch the **100** agents by phase, then **ESFR #101**

## Purpose

${FOREMAN.description}

## Working skills

- \`.cursor/skills/ls-crew/SKILL.md\` (primary)
${skillLines}

## ModeKey approximation

When a plan/invoke brief selects a ModeKey:
1. Embed the ModeKey + lens instructions in the dispatch brief (product does this).
2. Follow \`.cursor/rules/mandala-modekey-auto-apply.mdc\` — apply the lens for the active agent.
3. This is **approximated**, not Cursor-runtime-enforced.

## Hand-off

Run ESFR (\`ls-esfr\`) last after evidence from testing/operations readiness agents.
`;
}

function esfrBody(vendorResolved) {
  const skillLines = vendorResolved.resolved.slice(0, 24).map((s) => `- \`${s.name}\``).join('\n');
  return `---
name: ls-esfr
description: >-
  ESFR (Engineer Standards Final Review) — pipeline #101 final ship gate AFTER
  the 100 pre-ESFR Mandala crew agents. Not counted in the 100.
model: inherit
---

# ESFR — Engineer Standards Final Review

**Pipeline slot:** 101 (final gate)  
**Identity:** CECP stage-06 Engineer Standards  
**Inputs:** evidence + module artifacts + trail  
**Outputs:** ESFRVerdict + PromotionEligibility + StandardsReport

## When to run

Only after the 100 pre-ESFR agents (especially testing / release-readiness) have produced evidence.
Foreman (\`ls-crew-foreman\` / \`ls-crew\`) dispatches ESFR last.

## Vendor skills

${skillLines}

## Constraints

- Read-only (no product/source edits).
- No ESFRVerdict without matrix + probe citations.
- Verdicts: PASS | PASS_WITH_GAPS | HOLD | REJECT
- PromotionEligibility: PROMOTE | PROMOTE_WITH_GAPS | HOLD | REJECT

## Modes

Same 1000 ModeKeys (lenses only). Recommended: \`sage__navigator__evidence-strict\` or \`sentinel__anchor__evidence-strict\`.
`;
}

function writeRoleSkill(name, title, body) {
  const dir = path.join(OUT.skills, name);
  ensureDir(dir);
  fs.writeFileSync(
    path.join(dir, 'SKILL.md'),
    `---
name: ${name}
description: >-
  ${title}
---

${body}
`,
  );
}

function copyMrsPointers() {
  writeRoleSkill(
    'ls-architect',
    'LineageStudio Architect — vision/architecture phase framing (design-only).',
    `# LS Architect

Use for vision & architecture phases among the 100-agent roster.

- Design framing: Intent / Scope / Contracts / Acceptance / Handoff
- Prefer not to write implementation unless the assigned agent is write-capable
- Modes: \`packs/mandala-crew/modes-registry.json\` (1000 ModeKeys)
`,
  );
  writeRoleSkill(
    'ls-builder',
    'LineageStudio Builder — design-system / UX scaffolding within approved scope.',
    `# LS Builder

- Scaffold UX/design-system seams; stubs labeled skeleton/declared
- Used by design-phase agents in the 100 roster
`,
  );
  writeRoleSkill(
    'ls-coding',
    'LineageStudio Coding — implementation agents within approved scope.',
    `# LS Coding

Working coding skill for implementation-phase agents (36–55).

1. Stay inside approved contracts / acceptance criteria
2. Prefer vendor skills from the agent map / API resolve paths
3. Tag claims Drive-G-1 (enforced / partial / declared)
`,
  );
  writeRoleSkill(
    'ls-implementor',
    'LineageStudio Implementor — operations / wiring / DX paths.',
    `# LS Implementor

- Used by operations-phase agents and integration-style work
- Report files touched, tests run, gaps with status tags
`,
  );
  writeRoleSkill(
    'ls-reviewer',
    'LineageStudio Reviewer — read-only review assistance.',
    `# LS Reviewer

- Read-only findings; no ESFR PromotionEligibility
`,
  );
  writeRoleSkill(
    'ls-inspector',
    'LineageStudio Inspector — evidence and testing-phase verification.',
    `# LS Inspector

- Used by testing-phase agents (56–75)
- Verdicts: PASS | PASS_WITH_GAPS | FAIL
- Next: ESFR (#101) only after readiness evidence
`,
  );
  writeRoleSkill(
    'ls-esfr',
    'ESFR final ship gate after 100 pre-ESFR agents (pipeline #101).',
    `# LS ESFR

- Trail: \`06-engineer-standards.md\`
- Not one of the 100 pre-ESFR agents
- Pipeline slot **#101**
`,
  );
  writeRoleSkill(
    'ls-crew',
    'Foreman for LineageStudio Mandala 100-agent pre-ESFR crew + ESFR #101.',
    `# LS Crew Foreman

Orchestrate the **100 pre-ESFR agents** by phase, then **ESFR** (#101).

**Foreman is not one of the 100.**

## Pipeline phases

1. Vision & Discovery (1–10)
2. Architecture & Specification (11–25)
3. Design & UX (26–35)
4. Implementation & Coding (36–55)
5. Testing & Verification (56–75)
6. Deployment, Operations & Evolution (76–100)
7. **ESFR last** — PromotionEligibility (#101)

## Product surfaces

- UI: Mandala crew tab
- API: \`POST /api/crew/plan\`
- Offline smoke: \`npm run crew:smoke\`

## ModeKey approximation (best practical)

| Mechanism | Status |
|-----------|--------|
| Invoke brief embeds ModeKey + lens block | **enforced in product plan output** |
| Cursor rule \`mandala-modekey-auto-apply\` | **declared guidance** — agents should apply |
| Materialize mode card | **operable** (\`crew:materialize-mode\` / API) |
| Cursor runtime auto-loads ModeKey as skill | **no** |

## Sources

| Artifact | Path |
|----------|------|
| Agent roster | \`packs/mandala-crew/agents.yaml\` |
| Modes (1000) | \`packs/mandala-crew/modes-registry.json\` |
| Vendor map | \`packs/mandala-crew/vendor-skills-map.json\` |
| Vendor paths | \`packs/mandala-crew/vendor-skills-paths.json\` |
`,
  );
}

const FAMILY_TOKENS = {
  vision: ['plan', 'architect', 'bootstrap', 'research'],
  architecture: ['architect', 'architecture', 'deploy', 'database', 'security'],
  design: ['figma', 'react', 'shadcn', 'design', 'ux'],
  implementation: ['react', 'next', 'typescript', 'api', 'sdk', 'function', 'deploy'],
  testing: ['test', 'verify', 'smoke', 'security', 'audit'],
  operations: ['deploy', 'monitor', 'sentry', 'cx-', 'ops', 'review'],
  orchestration: ['orchestrate', 'workflow', 'plan', 'verify'],
  esfr: ['review', 'standards', 'ship', 'verify'],
};

function writeAgents(vendor) {
  ensureDir(OUT.agents);
  const vendorMap = {};
  const pathIndex = {};

  // Remove obsolete ls-*.md that are not in the new roster (+ foreman + esfr)
  const keep = new Set([
    ...AGENTS_100.map((a) => `${a.id}.md`),
    `${FOREMAN.id}.md`,
    `${ESFR.id}.md`,
  ]);
  if (fs.existsSync(OUT.agents)) {
    for (const file of fs.readdirSync(OUT.agents)) {
      if (file.startsWith('ls-') && file.endsWith('.md') && !keep.has(file)) {
        fs.unlinkSync(path.join(OUT.agents, file));
      }
    }
  }

  for (const a of AGENTS_100) {
    const resolved = resolveVendorBuckets(a.vendorBuckets, vendor.byName, FAMILY_TOKENS[a.family] || []);
    vendorMap[a.id] = {
      family: a.family,
      phase: a.phase,
      pipelineOrder: a.pipelineOrder,
      description: a.description,
      bucketsRequested: a.vendorBuckets,
      missingBuckets: resolved.missing,
      vendorSkills: resolved.resolved.map((r) => r.name),
    };
    for (const r of resolved.resolved) {
      if (!pathIndex[r.name]) pathIndex[r.name] = r.paths || [];
    }
    fs.writeFileSync(path.join(OUT.agents, `${a.id}.md`), agentBody(a, resolved));
  }

  const foremanResolved = resolveVendorBuckets(FOREMAN.vendorBuckets, vendor.byName, FAMILY_TOKENS.orchestration);
  vendorMap[FOREMAN.id] = {
    family: FOREMAN.family,
    phase: FOREMAN.phase,
    pipelineOrder: 0,
    description: FOREMAN.description,
    outsideRoster: true,
    vendorSkills: foremanResolved.resolved.map((r) => r.name),
  };
  fs.writeFileSync(path.join(OUT.agents, `${FOREMAN.id}.md`), foremanBody(foremanResolved));

  const esfrResolved = resolveVendorBuckets(ESFR.vendorBuckets, vendor.byName);
  vendorMap[ESFR.id] = {
    family: 'esfr',
    phase: 'esfr',
    pipelineOrder: 101,
    description: ESFR.description,
    note: 'Final gate — not counted in the 100',
    vendorSkills: esfrResolved.resolved.map((r) => r.name),
  };
  fs.writeFileSync(path.join(OUT.agents, `${ESFR.id}.md`), esfrBody(esfrResolved));

  // Fill path index for all catalog names discovered
  for (const [name, paths] of vendor.byName.entries()) {
    if (!pathIndex[name]) pathIndex[name] = paths.slice(0, 5);
  }

  return { vendorMap, pathIndex };
}

function writeYamlRoster() {
  const lines = [
    '# LineageStudio Mandala crew — generated',
    '# 100 pre-ESFR agents; ESFR is pipeline #101 (final gate).',
    '# Crew Foreman (ls-crew-foreman) is orchestration-only and NOT in the 100.',
    'source_of_truth:',
    '  roster_module: scripts/mandala-crew/agents-100.mjs',
    '  mandala_pack: G:/Mandala Rendering Software/mandala-agent-pack',
    'pipeline:',
    '  pre_esfr_count: 100',
    '  esfr_slot: 101',
    '  esfr_counted_in_hundred: false',
    '  foreman_in_roster: false',
    'phases:',
  ];
  for (const p of PHASES) {
    lines.push(`  - id: ${p.id}`);
    lines.push(`    name: ${JSON.stringify(p.name)}`);
    lines.push(`    order_start: ${p.orderStart}`);
    lines.push(`    order_end: ${p.orderEnd}`);
    lines.push(`    family: ${p.family}`);
  }
  lines.push('agents:');
  for (const a of AGENTS_100) {
    lines.push(`  - id: ${a.id}`);
    lines.push(`    name: ${JSON.stringify(a.name)}`);
    lines.push(`    description: ${JSON.stringify(a.description)}`);
    lines.push(`    family: ${a.family}`);
    lines.push(`    phase: ${a.phase}`);
    lines.push(`    order: ${a.pipelineOrder}`);
    lines.push(`    source: ${JSON.stringify(a.source)}`);
    lines.push(`    cursor_agent: .cursor/agents/${a.id}.md`);
  }
  lines.push('orchestration:');
  lines.push(`  id: ${FOREMAN.id}`);
  lines.push(`  name: ${JSON.stringify(FOREMAN.name)}`);
  lines.push(`  description: ${JSON.stringify(FOREMAN.description)}`);
  lines.push(`  cursor_agent: .cursor/agents/${FOREMAN.id}.md`);
  lines.push(`  in_pre_esfr_count: false`);
  lines.push('esfr:');
  lines.push(`  id: ${ESFR.id}`);
  lines.push(`  order: 101`);
  lines.push(`  name: ${JSON.stringify(ESFR.name)}`);
  lines.push(`  description: ${JSON.stringify(ESFR.description)}`);
  lines.push(`  cursor_agent: .cursor/agents/${ESFR.id}.md`);
  lines.push('modes:');
  lines.push('  native_named: 60');
  lines.push('  compositional_per_agent: 1000');
  lines.push('  registry: packs/mandala-crew/modes-registry.json');
  lines.push('  formula_note: "Shared 1000 ModeKeys for every agent; not 100×1000 files"');
  return `${lines.join('\n')}\n`;
}

function writeDocs(vendor, vendorMap, modes) {
  ensureDir(OUT.docs);
  const allVendorNames = new Set();
  for (const v of Object.values(vendorMap)) {
    for (const n of v.vendorSkills || []) allVendorNames.add(n);
  }
  const phaseRows = PHASES.map(
    (p) =>
      `| ${p.name} | ${p.orderStart}–${p.orderEnd} | \`${p.family}\` | ${AGENTS_100.filter((a) => a.phase === p.id).length} |`,
  ).join('\n');

  fs.writeFileSync(
    path.join(OUT.docs, 'MANIFEST.md'),
    `# LineageStudio Mandala Crew Manifest

> **Status:** **declared_operable** for pack load / plan / route via product API+UI.
> Cursor execution of agents/ModeKeys remains an operator/foreman step.
> Drive-G-1 applies.

## Counts

| Dimension | Count | Notes |
|-----------|------:|-------|
| Pre-ESFR agents | **100** | Vision→Stewardship; \`.cursor/agents/ls-*.md\` |
| ESFR | **1** (#101) | Final gate; **not** in the 100 |
| Crew Foreman | **1** | Orchestration only; **not** in the 100 |
| Phases | **6** | vision → … → operations |
| Compositional modes per agent | **1000** | Shared registry (20×10×5) |
| Vendor skill names (host snapshot) | **${vendor.unique}** | \`vendor-skills-all-names.json\` |
| Preferred-mapped unique | **${allVendorNames.size}** | \`vendor-skills-map.json\` |

## Phases

| Phase | Orders | Family | Agents |
|-------|--------|--------|--------|
${phaseRows}

## ModeKey formula

Unchanged: **20 crew × 10 actor × 5 stance = 1000** ModeKeys shared by every agent.
`,
  );

  fs.writeFileSync(
    path.join(OUT.docs, 'INVOKE.md'),
    `# How to invoke the Mandala crew (LineageStudio)

## Quick start

1. Ask the agent to act as **Crew Foreman** (\`ls-crew-foreman\` / skill \`ls-crew\`) — **not** one of the 100.
2. State the feature/scope and optional ModeKey, e.g.  
   \`Sage + Navigator (evidence-strict) — design auth for LineageStudio\`.
3. Foreman dispatches among the **100 pre-ESFR** agents by phase (or use product plan API).
4. After readiness evidence, foreman runs **ESFR** (\`ls-esfr\`, **#101**) for PromotionEligibility.

## Product path

| Surface | Command / route | Notes |
|---------|-----------------|-------|
| Pack smoke | \`npm run crew:smoke\` | 100 agents, ESFR #101, 1000 modes |
| Plan API | \`POST /api/crew/plan\` | Returns steps + invoke brief (ModeKey embedded) |
| Skills | \`GET /api/crew/skills/:name\` | Catalog + preferred + **paths** when indexed |
| UI | Mandala crew tab | Roster / phases / plan |

Example plan body:

\`\`\`json
{
  "goal": "Ship auth for LineageStudio",
  "modeKey": "sage__navigator__evidence-strict",
  "phases": ["vision", "architecture", "implementation", "testing"],
  "compact": true,
  "includeEsfr": true
}
\`\`\`

- \`compact: true\` → one lead agent per selected phase (default all 6) + ESFR
- \`compact: false\` → full 100 (+ ESFR when included)

## ModeKey approximation

**Enforced in product:** invoke brief embeds ModeKey + lens instructions; API can materialize mode cards.  
**Declared in Cursor:** rule \`mandala-modekey-auto-apply.mdc\` + foreman skill ask agents to apply the lens.  
**Not claimed:** Cursor process auto-injects ModeKeys without operator/foreman context.
`,
  );

  fs.writeFileSync(
    path.join(OUT.docs, 'MODES.md'),
    `# Modes approach (1000 per agent)

## Formula (unchanged for 100-agent roster)

\`\`\`
ModeKey = crewMode × actorMode × stance
        = 20 × 10 × 5
        = 1000
\`\`\`

Shared registry — **not** 100×1000 markdown files.

Registry: \`packs/mandala-crew/modes-registry.json\`  
Count at generation: **${modes.compositional.count}**

## Auto-apply status

| Claim | Status |
|-------|--------|
| Registry enumerates 1000 ModeKeys | **yes** |
| Product invoke brief embeds selected ModeKey | **yes** |
| Cursor rule asks agents to apply embedded ModeKey | **declared** |
| Cursor auto-loads ModeKey as a skill | **no** |
`,
  );

  fs.writeFileSync(
    path.join(OUT.docs, 'VENDOR_SKILLS_INVENTORY.md'),
    `# Vendor skills inventory

Discovered **${vendor.count}** \`SKILL.md\` files (**${vendor.unique}** unique names) on this host.

Mapped onto the 100+ESFR+foreman agents: **${allVendorNames.size}** unique preferred names  
(\`packs/mandala-crew/vendor-skills-map.json\`).

Path index: \`packs/mandala-crew/vendor-skills-paths.json\`  
Product resolve: \`GET /api/crew/skills/:name\` returns \`paths\` + \`loadHint\`.

**Honest limit:** the product does not execute vendor skills inside Node; Cursor still opens \`SKILL.md\`.
`,
  );
}

function writeCommercialStarter() {
  ensureDir(OUT.commercial);
  fs.writeFileSync(
    path.join(OUT.commercial, 'OPS_STARTER.md'),
    `# Commercial operations starter (thin)

> **Status:** checklist / declared — **not** a billing or signup product.

## Operator checklist (local / early)

- [ ] Document who may invite users (manual allowlist)
- [ ] Record support contact for early operators
- [ ] Keep mock connectors for demos without paid keys
- [ ] Do not claim self-serve signup or metering until implemented
- [ ] Refresh \`docs/scorecards/lineage-studio.md\` when commercial surfaces land

## Explicit non-claims

- No SaaS billing
- No tenant isolation product surface
- No marketplace / paid skill execution
`,
  );
}

function writeRules() {
  ensureDir(OUT.rules);
  fs.writeFileSync(
    path.join(OUT.rules, 'mandala-crew.mdc'),
    `---
description: Mandala 100-agent pre-ESFR crew + ESFR #101 for LineageStudio
alwaysApply: false
---

# Mandala Crew (LineageStudio)

When the user asks for Mandala crew, multi-agent Vision→Stewardship, or ESFR:

1. Load \`.cursor/skills/ls-crew/SKILL.md\` (foreman — **not** one of the 100)
2. Use the **100** agents under \`.cursor/agents/ls-*.md\` (exclude \`ls-esfr\` and treat \`ls-crew-foreman\` as orchestrator)
3. Run **ESFR** (\`ls-esfr\`) only after readiness evidence — pipeline **#101**
4. Modes: pick from \`packs/mandala-crew/modes-registry.json\` (1000 ModeKeys)
5. Prefer vendor skills listed on each agent; resolve paths via pack index / API when available
6. Stay Drive-G-1 honest
`,
  );

  fs.writeFileSync(
    path.join(OUT.rules, 'mandala-modekey-auto-apply.mdc'),
    `---
description: Apply Mandala ModeKey lens when an invoke brief or plan embeds one
alwaysApply: false
---

# ModeKey auto-apply approximation

When the user message, crew plan, or invoke brief contains a **ModeKey**
(\`crew__actor__stance\`) or a materialized mode card:

1. Treat it as the active cognitive lens for the current agent turn.
2. Do **not** change write authority; precedence remains  
   role bans > Constitution > Evidence > Profile > Mode.
3. Mirror the stance bias (e.g. evidence-strict, minimal-diff) in conclusions.
4. If no ModeKey is present, continue without inventing one.

**Honesty:** This rule is guidance for Cursor agents. It is **not** a runtime
enforcer inside the LineageStudio Node process.
`,
  );
}

function main() {
  console.log('Inventory vendor skills…');
  const vendor = inventoryVendor();
  console.log(`  ${vendor.count} files, ${vendor.unique} unique names`);
  console.log(`  Agents: ${AGENTS_100.length} pre-ESFR + foreman + ESFR#101`);

  ensureDir(OUT.crew);
  ensureDir(OUT.docs);
  ensureDir(OUT.skills);
  ensureDir(OUT.agents);

  copyMrsPointers();

  const modes = buildModesRegistry();
  if (modes.compositional.count !== 1000) {
    throw new Error(`Expected 1000 modes, got ${modes.compositional.count}`);
  }
  fs.writeFileSync(path.join(OUT.crew, 'modes-registry.json'), JSON.stringify(modes, null, 2));
  fs.writeFileSync(
    path.join(OUT.crew, 'modes-index.json'),
    JSON.stringify(
      { count: modes.compositional.count, formula: modes.compositional.formula, keys: modes.modes.map((m) => m.key) },
      null,
      2,
    ),
  );

  const { vendorMap, pathIndex } = writeAgents(vendor);
  fs.writeFileSync(
    path.join(OUT.crew, 'vendor-skills-map.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), agents: vendorMap }, null, 2),
  );
  fs.writeFileSync(
    path.join(OUT.crew, 'vendor-skills-all-names.json'),
    JSON.stringify({ count: vendor.unique, names: [...vendor.byName.keys()].sort() }, null, 2),
  );
  fs.writeFileSync(
    path.join(OUT.crew, 'vendor-skills-paths.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), count: Object.keys(pathIndex).length, paths: pathIndex }, null, 2),
  );
  const rtsCatalog = buildRtsSkillCatalog(vendor, vendorMap);
  fs.writeFileSync(path.join(OUT.crew, 'rts-skill-catalog.json'), JSON.stringify(rtsCatalog, null, 2));
  console.log(
    `  RTS skill catalog: ${rtsCatalog.count} (vendor=${rtsCatalog.bySource.vendor}, cursor=${rtsCatalog.bySource.cursor}, ls-role=${rtsCatalog.bySource['ls-role']})`,
  );
  fs.writeFileSync(
    path.join(OUT.crew, 'phases.json'),
    JSON.stringify({ count: PHASES.length, phases: PHASES }, null, 2),
  );
  fs.writeFileSync(path.join(OUT.crew, 'agents.yaml'), writeYamlRoster());

  fs.writeFileSync(
    path.join(OUT.crew, 'IMPORT_SOURCES.md'),
    `# Import sources

Roster SoT: \`scripts/mandala-crew/agents-100.mjs\` (exact one-line briefs).

Optional Mandala pack references:
- \`${PACK.replace(/\\/g, '/')}/manifests/\`
- ESFR: \`G:/Mandala Rendering Software/docs/governance/esfr/\`
`,
  );

  for (const rel of ['manifests/agents.yaml', 'manifests/skills.json', 'manifests/mandala-mode.yaml']) {
    const src = path.join(PACK, rel);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(OUT.crew, 'imported', rel);
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }

  writeDocs(vendor, vendorMap, modes);
  writeCommercialStarter();
  writeRules();

  const sampleKeys = [modes.modes[0].key, modes.modes[499].key, modes.modes[999].key];
  for (const k of sampleKeys) {
    const mode = modes.modes.find((m) => m.key === k);
    const outDir = path.join(OUT.crew, 'mode-cards');
    ensureDir(outDir);
    fs.writeFileSync(
      path.join(outDir, `${mode.key}.md`),
      `# Mode: ${mode.label}\n\n- id: ${mode.id}\n- key: \`${mode.key}\`\n`,
    );
  }

  console.log('Done.');
  console.log(`  Agents: ${AGENTS_100.length} pre-ESFR + ESFR#${ESFR.pipelineOrder}`);
  console.log(`  Modes: ${modes.compositional.count}`);
  console.log(`  Path index entries: ${Object.keys(pathIndex).length}`);
}

main();
