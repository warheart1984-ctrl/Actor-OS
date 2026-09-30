---
name: ls-crew
description: >-
  Foreman for LineageStudio Mandala 100-agent pre-ESFR crew + ESFR #101.
---

# LS Crew Foreman

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
- API: `POST /api/crew/plan`
- Offline smoke: `npm run crew:smoke`

## ModeKey approximation (best practical)

| Mechanism | Status |
|-----------|--------|
| Invoke brief embeds ModeKey + lens block | **enforced in product plan output** |
| Cursor rule `mandala-modekey-auto-apply` | **declared guidance** — agents should apply |
| Materialize mode card | **operable** (`crew:materialize-mode` / API) |
| Cursor runtime auto-loads ModeKey as skill | **no** |

## Sources

| Artifact | Path |
|----------|------|
| Agent roster | `packs/mandala-crew/agents.yaml` |
| Modes (1000) | `packs/mandala-crew/modes-registry.json` |
| Vendor map | `packs/mandala-crew/vendor-skills-map.json` |
| Vendor paths | `packs/mandala-crew/vendor-skills-paths.json` |

