# How to invoke the Mandala crew (LineageStudio)

## Quick start

1. Ask the agent to act as **Crew Foreman** (`ls-crew-foreman` / skill `ls-crew`) — **not** one of the 100.
2. State the feature/scope and optional ModeKey, e.g.  
   `Sage + Navigator (evidence-strict) — design auth for LineageStudio`.
3. Foreman dispatches among the **100 pre-ESFR** agents by phase (or use product plan API).
4. After readiness evidence, foreman runs **ESFR** (`ls-esfr`, **#101**) for PromotionEligibility.

## Product path

| Surface | Command / route | Notes |
|---------|-----------------|-------|
| Pack smoke | `npm run crew:smoke` | 100 agents, ESFR #101, 1000 modes |
| Plan API | `POST /api/crew/plan` | Returns steps + invoke brief (ModeKey embedded) |
| Skills | `GET /api/crew/skills/:name` | Catalog + preferred + **paths** when indexed |
| UI | Mandala crew tab | Roster / phases / plan |

Example plan body:

```json
{
  "goal": "Ship auth for LineageStudio",
  "modeKey": "sage__navigator__evidence-strict",
  "phases": ["vision", "architecture", "implementation", "testing"],
  "compact": true,
  "includeEsfr": true
}
```

- `compact: true` → one lead agent per selected phase (default all 6) + ESFR
- `compact: false` → full 100 (+ ESFR when included)

## ModeKey approximation

**Enforced in product:** invoke brief embeds ModeKey + lens instructions; API can materialize mode cards.  
**Declared in Cursor:** rule `mandala-modekey-auto-apply.mdc` + foreman skill ask agents to apply the lens.  
**Not claimed:** Cursor process auto-injects ModeKeys without operator/foreman context.
