# Vendor skills inventory

Discovered **1240** `SKILL.md` files (**1042** unique names) on this host.

Mapped onto the 100+ESFR+foreman agents: **174** unique preferred names  
(`packs/mandala-crew/vendor-skills-map.json`).

Path index: `packs/mandala-crew/vendor-skills-paths.json`  
Product resolve: `GET /api/crew/skills/:name` returns `paths` + `loadHint`.

**Honest limit:** the product does not execute vendor skills inside Node; Cursor still opens `SKILL.md`.
