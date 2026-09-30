# Business RTS — Governance Pipeline

> **Status:** declared mapping for LineageStudio Business RTS.  
> Skills are **indexed**, not product-executed. ModeKey auto-apply is **approximated**.  
> Drive-G-1 applies.

## Pipeline

```
Brief (operator)
  → Cursor Foreman (ls-crew — outside the 100)
  → Structures unlock unit roles / drones / phase affinity
  → Units (Mandala agents) command Drones
  → Mission action → POST /api/crew/plan (phases → ESFR #101 last)
  → Invoke brief embeds ModeKey lens (actorMode = Actor lens)
  → Evidence + constitutionalCompliance meters update (sim)
  → Operator runs agents in Cursor with SKILL.md + mode card
```

## Mapping

| RTS step | Product evidence |
|----------|------------------|
| Structures / units / drones | `packs/mandala-crew/rts/*.json` + `GET /api/rts/catalog` |
| Skills tech tree | `rts-skill-catalog.json` (vendor + cursor + ls-role) |
| Lenses | ModeKeys in `modes-registry.json` (`crew × actor × stance`) |
| Mission | `POST /api/rts/sessions/:id/action` `{ type: "start_mission" }` → `MandalaCrewEngine.plan` |
| Battles / incidents | Session incidents; clear with Responder/Fix drone |
| Win: constitutional compliance | Resource meter + scoreboard — **not** an automated PromotionEligibility enforcer |
| ESFR | Plan step role `esfr` last when `includeEsfr` |

## Honesty

- Catalog import refreshes names/paths from host Cursor plugins and in-repo `.cursor/skills`.
- Cursor still executes by opening `SKILL.md`; the Node API does not run vendor skills.
- Commercial signup/billing is **not** claimed.
