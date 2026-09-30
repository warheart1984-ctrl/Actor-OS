# Drive-G maturity scorecard — LineageStudio
# Template: G:\docs\governance\MATURITY_SCORECARD_TEMPLATE.md (when present)

| Dimension | Rating | Audience | Evidence |
|---|---|---|---|
| Constitutional model | Early | operators | Lineage + evidence hashes (`Evidence.ts`, `LineageEngine`); no constitutional runtime gates |
| Governance methodology | Early | operators | Docs evidence-bound (Drive-G-1); Mandala 100-agent crew + ESFR #101 as **declared** final gate in plans — not an automated promotion enforcer |
| Reference implementation | Working local MVP | operators | Backend engines, connectors, Express API, React studio, Mandala crew runtime (`MandalaCrewEngine`, `/api/crew`, Mandala Crew UI); Business RTS pack + session API (`RtsEngine`, `/api/rts`, `rts-app`) — `npm run dev` / `npm test` / `npm run crew:smoke` / `npm run rts:smoke` |
| Platform engineering | Early | operators | SQLite default; optional Docker/Postgres compose; no CI deploy pipeline in-repo |
| Commercial operations | Early starter | operators | Thin checklist only — `docs/commercial/OPS_STARTER.md`; **no** signup, billing, or self-serve |

## Business RTS

| Slice | Rating | Evidence |
|---|---|---|
| Data / import | Declared operable | `rts-skill-catalog.json`, `.cursor/mandala-crew/rts/*`, `GET /api/rts/catalog` |
| Standalone sim | Local operator MVP | In-memory sessions, mission→crew plan, `rts-app` |
| Studio overlay | Local operator MVP | LineageStudio `rts` view reuses session API |
| Commercial game / multiplayer | Not claimed | — |

## Operator readiness

Deploy & run locally: **yes** (mock or live API keys). Docker path prepared, not required.
Mandala crew pack: **operable locally** (100 agents / 6 phases / plan / route via API/UI); Cursor execution of agents/ModeKeys remains an **operator step** (ModeKey auto-apply approximated via invoke brief + Cursor rule).
Business RTS: **operable locally** as governed sim overlay; not a self-serve commercial product.

## User / commercial readiness

Signup & self-serve: **not claimed**. Commercial starter is operator checklist only.

## Notes

The engine (router, lineage, collaboration, 100-agent crew pack routing) exists; the factory (production ops, commercial) is early.
Do not collapse “Mandala crew imported” into “production-ready multi-agent product” across all dimensions.
