---
name: ls-design-governance
description: >-
  Pre-ESFR Mandala crew #035 (design) — Ensures design decisions remain coherent and documented.
  Modes: 1000 compositional ModeKeys via packs/mandala-crew/modes-registry.json.
model: inherit
---

# Design Governance Agent

**Pipeline slot:** 35 / 100 pre-ESFR  
**Phase:** `design` (Design & UX)  
**Role family:** `design`  
**Source:** lineage-100/design  
**Writes product code:** no (read-only / design / review)

## Purpose

Ensures design decisions remain coherent and documented.

## Working skills (load when relevant)

### Role-family skill
- `.cursor/skills/ls-builder/SKILL.md`
- Crew foreman (orchestration, not a roster slot): `.cursor/skills/ls-crew/SKILL.md`

### Vendor skills (preferred subset)
- `figma-use`
- `ce-doc-review`
- `review-and-ship`
- `figma-code-connect` (via figma)
- `figma-create-new-file` (via figma)
- `figma-design-to-code` (via figma)
- `figma-generate-design` (via figma)
- `figma-generate-diagram` (via figma)
- `figma-generate-library` (via figma)
- `figma-implement-motion` (via figma)
- `figma-swiftui` (via figma)
- `figma-use-figjam` (via figma)
- `figma-use-motion` (via figma)
- `figma-use-slides` (via figma)
- `clerk-react-patterns` (via react)
- `clerk-react-router-patterns` (via react)
- `gsap-react` (via react)
- `setup-react-app` (via react)
- `setup-react-native-app` (via react)
- `improve-react` (via react)
- `react-doctor` (via react)
- `react-email` (via react)
- `react-best-practices` (via react)
- `shadcn`
- `query-and-schema-design` (via design)
- `hz-immersive-designer` (via design)
- `mongodb-schema-design` (via design)
- `code-to-design` (via design)
- `design-to-code` (via design)
- `principle-exhaust-the-design-space` (via design)
- `principle-redesign-from-first-principles` (via design)
- `designer-extension-command` (via design)
- `wix-design-system` (via design)
- `replay-ux-audit` (via ux)
- `clerk-nuxt-patterns` (via ux)

### Resolved SKILL.md paths (when discovered on this host)
- `figma-use` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/figma/07316dd2920d61303ca0e52812b31f5f341e7b15/skills/figma-use/SKILL.md`
- `ce-doc-review` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/compound-engineering/b3c38a21a457c692da0cb14b92b2c4fb50a912d5/skills/ce-doc-review/SKILL.md`
- `review-and-ship` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/cursor-team-kit/45c66fde1f1681a902a30d1ae8bca1cc64465d6e/skills/review-and-ship/SKILL.md`
- `figma-code-connect` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/figma/07316dd2920d61303ca0e52812b31f5f341e7b15/skills/figma-code-connect/SKILL.md`
- `figma-create-new-file` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/figma/07316dd2920d61303ca0e52812b31f5f341e7b15/skills/figma-create-new-file/SKILL.md`
- `figma-design-to-code` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/figma/07316dd2920d61303ca0e52812b31f5f341e7b15/skills/figma-design-to-code/SKILL.md`
- `figma-generate-design` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/figma/07316dd2920d61303ca0e52812b31f5f341e7b15/skills/figma-generate-design/SKILL.md`
- `figma-generate-diagram` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/figma/07316dd2920d61303ca0e52812b31f5f341e7b15/skills/figma-generate-diagram/SKILL.md`
- `figma-generate-library` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/figma/07316dd2920d61303ca0e52812b31f5f341e7b15/skills/figma-generate-library/SKILL.md`
- `figma-implement-motion` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/figma/07316dd2920d61303ca0e52812b31f5f341e7b15/skills/figma-implement-motion/SKILL.md`
- `figma-swiftui` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/figma/07316dd2920d61303ca0e52812b31f5f341e7b15/skills/figma-swiftui/SKILL.md`
- `figma-use-figjam` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/figma/07316dd2920d61303ca0e52812b31f5f341e7b15/skills/figma-use-figjam/SKILL.md`

Full obtainable catalog: `packs/mandala-crew/vendor-skills-all-names.json`.  
Product API can return path metadata; Cursor still executes by opening `SKILL.md`.

## Modes (1000 per agent)

Select one ModeKey from `packs/mandala-crew/modes-registry.json` (20×10×5 = **1000**).  
When an invoke brief includes a ModeKey, apply it as a lens (see rule `mandala-modekey-auto-apply`).

Precedence: **role bans > Constitution > Evidence > Profile > Mode**.

## Hand-off

- Advance by phase (vision → architecture → design → implementation → testing → operations).
- After release-readiness / inspector evidence, **only ESFR** (`ls-esfr`, pipeline **#101**) issues PromotionEligibility.
- ESFR and Crew Foreman are **not** among the 100.

## Drive-G-1

Assert only what code/tests/configs prove. Label declared/partial/roadmap explicitly.
