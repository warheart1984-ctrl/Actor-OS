# Drive-G maturity scorecard — LineageStudio
# Template: G:\docs\governance\MATURITY_SCORECARD_TEMPLATE.md (when present)

| Dimension | Rating | Audience | Evidence |
|---|---|---|---|
| Constitutional model | Early | operators | Lineage + evidence hashes (`Evidence.ts`, `LineageEngine`); no constitutional runtime gates |
| Governance methodology | Early | operators | Docs evidence-bound (Drive-G-1); no formal change / review process coded |
| Reference implementation | Working local MVP | operators | Backend engines, connectors, Express API, React studio — `npm run dev` / `npm test` / smoke script |
| Platform engineering | Early | operators | SQLite default; optional Docker/Postgres compose; no CI deploy pipeline in-repo |
| Commercial operations | Not started | users | No signup, billing, or self-serve surface |

## Operator readiness

Deploy & run locally: **yes** (mock or live API keys). Docker path prepared, not required.

## User / commercial readiness

Signup & self-serve: **not claimed**.

## Notes

The engine (router, lineage, collaboration) exists; the factory (production ops, commercial) is early.
