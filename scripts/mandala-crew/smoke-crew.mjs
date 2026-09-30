#!/usr/bin/env node
/**
 * Offline smoke for Mandala crew pack invariants (no API server required).
 * Usage: node scripts/mandala-crew/smoke-crew.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pack = path.join(root, '.cursor/mandala-crew');

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
}

const yaml = fs.readFileSync(path.join(pack, 'agents.yaml'), 'utf8');
const agentIds = [...yaml.matchAll(/^\s*-\s+id:\s*(ls-[\w-]+)\s*$/gm)].map((m) => m[1]);
assert(agentIds.length === 100, `expected 100 pre-ESFR agents, got ${agentIds.length}`);
assert(!agentIds.includes('ls-esfr'), 'ESFR must not be in the 100');
assert(!agentIds.includes('ls-crew-foreman'), 'foreman must not be in the 100');
assert(/esfr:\s*\n\s*id:\s*ls-esfr/.test(yaml), 'ESFR id missing');
assert(/order:\s*101/.test(yaml), 'ESFR order should be 101');
assert(/pre_esfr_count:\s*100/.test(yaml), 'pipeline.pre_esfr_count should be 100');
assert(/foreman_in_roster:\s*false/.test(yaml), 'foreman_in_roster should be false');

// Exact brief samples
assert(
  yaml.includes('Finds real-world problems worth solving.'),
  'missing Problem Discovery canonical brief',
);
assert(
  yaml.includes('Holds responsibility for the system’s legacy.') ||
    yaml.includes("Holds responsibility for the system's legacy."),
  'missing Long-Term Stewardship canonical brief',
);

const phases = JSON.parse(fs.readFileSync(path.join(pack, 'phases.json'), 'utf8'));
assert(Array.isArray(phases.phases) && phases.phases.length === 6, 'expected 6 phases');

const modes = JSON.parse(fs.readFileSync(path.join(pack, 'modes-registry.json'), 'utf8'));
assert(Array.isArray(modes.modes) && modes.modes.length === 1000, 'modes registry must have 1000 keys');
assert(modes.compositional?.count === 1000, 'compositional.count must be 1000');

const all = JSON.parse(fs.readFileSync(path.join(pack, 'vendor-skills-all-names.json'), 'utf8'));
assert(typeof all.count === 'number' && all.count === all.names.length, 'vendor catalog count mismatch');
assert(all.count >= 1000, `vendor catalog too small: ${all.count}`);

const map = JSON.parse(fs.readFileSync(path.join(pack, 'vendor-skills-map.json'), 'utf8'));
const preferred = new Set();
for (const entry of Object.values(map.agents ?? {})) {
  for (const name of entry.vendorSkills ?? []) preferred.add(name);
}
assert(preferred.size >= 100, `preferred map too small: ${preferred.size}`);

const paths = JSON.parse(fs.readFileSync(path.join(pack, 'vendor-skills-paths.json'), 'utf8'));
assert(typeof paths.paths === 'object' && paths.count >= 100, 'vendor paths index missing/too small');

const index = JSON.parse(fs.readFileSync(path.join(pack, 'modes-index.json'), 'utf8'));
assert(index.count === 1000 && index.keys?.length === 1000, 'modes-index must list 1000 keys');

const agentFiles = fs
  .readdirSync(path.join(root, '.cursor/agents'))
  .filter((f) => f.startsWith('ls-') && f.endsWith('.md'));
assert(agentFiles.includes('ls-esfr.md'), 'ls-esfr.md missing');
assert(agentFiles.includes('ls-crew-foreman.md'), 'ls-crew-foreman.md missing');
assert(agentFiles.includes('ls-problem-discovery.md'), 'ls-problem-discovery.md missing');
assert(agentFiles.includes('ls-long-term-stewardship.md'), 'ls-long-term-stewardship.md missing');
// 100 roster + esfr + foreman = 102
assert(agentFiles.length === 102, `expected 102 ls-*.md files (100+foreman+esfr), got ${agentFiles.length}`);

console.log(
  JSON.stringify(
    {
      ok: true,
      preEsfrAgents: agentIds.length,
      esfr: 'ls-esfr#101',
      foremanInRoster: false,
      phases: phases.phases.length,
      modeKeys: modes.modes.length,
      vendorCatalog: all.count,
      vendorPreferredUnique: preferred.size,
      vendorPathIndex: paths.count,
      agentMarkdownFiles: agentFiles.length,
    },
    null,
    2,
  ),
);
console.log('CREW PACK SMOKE PASSED');
