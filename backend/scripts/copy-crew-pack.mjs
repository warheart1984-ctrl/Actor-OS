// tsc does not emit JSON/YAML assets; ship the Mandala crew pack beside dist.
import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(backendRoot);
const source = join(repoRoot, 'packs', 'mandala-crew');
const target = join(backendRoot, 'dist', 'mandala-crew');

const required = [
  'agents.yaml',
  'modes-registry.json',
  'modes-index.json',
  'phases.json',
  'vendor-skills-map.json',
  'vendor-skills-all-names.json',
  'vendor-skills-paths.json',
  'rts-skill-catalog.json',
];

await mkdir(target, { recursive: true });
for (const file of required) {
  const src = join(source, file);
  try {
    await cp(src, join(target, file));
  } catch (error) {
    if (file === 'rts-skill-catalog.json') {
      console.warn(`Optional pack file missing: ${file}`);
      continue;
    }
    throw error;
  }
}

// RTS domain pack
const rtsSource = join(source, 'rts');
const rtsTarget = join(target, 'rts');
try {
  await rm(rtsTarget, { recursive: true, force: true });
  await cp(rtsSource, rtsTarget, { recursive: true });
} catch {
  console.warn('RTS pack folder missing — catalog endpoints will fail until packs/mandala-crew/rts exists');
}

// Optional mode-cards for materialize writes when running from dist.
const modeCardsSource = join(source, 'mode-cards');
const modeCardsTarget = join(target, 'mode-cards');
try {
  await rm(modeCardsTarget, { recursive: true, force: true });
  await cp(modeCardsSource, modeCardsTarget, { recursive: true });
} catch {
  await mkdir(modeCardsTarget, { recursive: true });
}

console.log(`Copied Mandala crew pack (+ RTS) to dist/mandala-crew`);
