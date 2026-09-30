#!/usr/bin/env node
/**
 * Offline RTS pack + session invariants (no HTTP server required).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PACK = path.join(ROOT, 'packs', 'mandala-crew');
const RTS = path.join(PACK, 'rts');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const required = [
  'structures.json',
  'unit-roles.json',
  'drones.json',
  'resources.json',
  'territories.json',
  'win-conditions.json',
];
for (const file of required) {
  assert(fs.existsSync(path.join(RTS, file)), `missing ${file}`);
}

const structures = JSON.parse(fs.readFileSync(path.join(RTS, 'structures.json'), 'utf8'));
assert(structures.structures?.length === 8, 'expected 8 structures');

const drones = JSON.parse(fs.readFileSync(path.join(RTS, 'drones.json'), 'utf8'));
assert(drones.drones?.length === 8, 'expected 8 drone types');

const resources = JSON.parse(fs.readFileSync(path.join(RTS, 'resources.json'), 'utf8'));
assert(resources.resources?.some((r) => r.id === 'evidence'), 'evidence resource required');
assert(
  resources.resources?.some((r) => r.id === 'constitutionalCompliance'),
  'constitutionalCompliance resource required',
);

const catalogPath = path.join(PACK, 'rts-skill-catalog.json');
assert(fs.existsSync(catalogPath), 'rts-skill-catalog.json missing — run npm run crew:generate');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
assert(catalog.count >= 100, `skill catalog too small: ${catalog.count}`);
assert(catalog.executableInProduct === false, 'catalog must declare non-executable');

const { pathToFileURL } = await import('node:url');
const engineUrl = pathToFileURL(path.join(ROOT, 'backend/src/core/RtsEngine.ts')).href;
const sessionUrl = pathToFileURL(path.join(ROOT, 'backend/src/core/RtsSessionEngine.ts')).href;
const crewUrl = pathToFileURL(path.join(ROOT, 'backend/src/core/MandalaCrewEngine.ts')).href;
const { RtsEngine } = await import(engineUrl);
const { MandalaCrewEngine } = await import(crewUrl);
const { RtsSessionEngine } = await import(sessionUrl);
const rts = new RtsEngine(PACK);
const crew = new MandalaCrewEngine(PACK);
const sessions = new RtsSessionEngine(rts, crew);
const cat = rts.getCatalog(5);
assert(cat.structures.length === 8, 'engine catalog structures');
assert(cat.skills.count === catalog.count, 'engine skill count mismatch');
const session = sessions.createSession();
assert(session.resources.budget > 0, 'session resources');
const afterBuild = sessions.applyAction(session.id, {
  type: 'build_structure',
  structureId: 'engineering-hub',
});
assert(afterBuild.structures.some((s) => s.structureId === 'engineering-hub'), 'structure built');
const agentId = crew.listAgents()[0]?.id;
assert(agentId, 'need at least one crew agent');
const afterTrain = sessions.applyAction(afterBuild.id, {
  type: 'train_unit',
  roleId: 'builder',
  agentId,
});
assert(afterTrain.units.length >= 1, 'unit trained');
const after = sessions.applyAction(afterTrain.id, {
  type: 'start_mission',
  goal: 'Smoke mission: verify governance plan wiring',
  compact: true,
});
assert(after.missions.length >= 1, 'mission created');
assert(after.missions[0].plan?.esfrLast === true, 'ESFR last on plan');
assert(after.missions[0].plan?.steps?.length >= 2, 'plan has steps');

console.log('RTS smoke OK');
console.log(`  structures: ${structures.structures.length}`);
console.log(`  drones: ${drones.drones.length}`);
console.log(`  skills: ${catalog.count}`);
console.log(`  session mission steps: ${after.missions[0].plan.steps.length}`);
