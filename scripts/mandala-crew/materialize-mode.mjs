#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const reg = JSON.parse(fs.readFileSync(path.join(root, "packs/mandala-crew/modes-registry.json"), "utf8"));
const key = process.argv[2];
if (!key) {
  console.error("Usage: node materialize-mode.mjs <modeKey>");
  process.exit(1);
}
const mode = reg.modes.find((m) => m.key === key || String(m.id) === key);
if (!mode) {
  console.error("Mode not found:", key);
  process.exit(2);
}
const outDir = path.join(root, "packs/mandala-crew/mode-cards");
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `${mode.key}.md`);
fs.writeFileSync(out, `# Mode: ${mode.label}

- id: ${mode.id}
- key: \`${mode.key}\`
- crewMode: ${mode.crewMode}
- actorMode: ${mode.actorMode}
- stance: ${mode.stance}

## Lens instructions

Apply as an optional cognitive lens on the current agent role.
Do not change write authority. Precedence: role bans > Constitution > Evidence > Mode.

### Crew emphasis
Use the ${mode.crewMode} lens from Mandala CREW_MODES.

### Actor emphasis
Use the ${mode.actorMode} lens from Mandala CECP_ACTOR_MODES.

### Stance
Operate with **${mode.stance}** bias for evidence and scope.
`);
console.log("Wrote", out);
