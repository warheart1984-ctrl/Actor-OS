---
name: ls-database-implementation
description: >-
  Pre-ESFR Mandala crew #039 (implementation) — Implements schemas, queries, and migrations.
  Modes: 1000 compositional ModeKeys via packs/mandala-crew/modes-registry.json.
model: inherit
---

# Database Implementation Agent

**Pipeline slot:** 39 / 100 pre-ESFR  
**Phase:** `implementation` (Implementation & Coding)  
**Role family:** `implementation`  
**Source:** lineage-100/implementation  
**Writes product code:** yes (within approved scope)

## Purpose

Implements schemas, queries, and migrations.

## Working skills (load when relevant)

### Role-family skill
- `.cursor/skills/ls-coding/SKILL.md`
- Crew foreman (orchestration, not a roster slot): `.cursor/skills/ls-crew/SKILL.md`

### Vendor skills (preferred subset)
- `database`
- `netlify-database`
- `vercel-storage`
- `create-database-row`
- `clerk-react-patterns` (via react)
- `clerk-react-router-patterns` (via react)
- `gsap-react` (via react)
- `setup-react-app` (via react)
- `setup-react-native-app` (via react)
- `improve-react` (via react)
- `react-doctor` (via react)
- `react-email` (via react)
- `react-best-practices` (via react)
- `clerk-nextjs-patterns` (via next)
- `next-cache-components` (via next)
- `next-forge` (via next)
- `next-upgrade` (via next)
- `nextjs` (via next)
- `appwrite-typescript` (via typescript)
- `typescript-best-practices` (via typescript)
- `api`
- `azure-hosted-copilot-sdk` (via sdk)
- `agents-sdk` (via sdk)
- `sandbox-sdk` (via sdk)
- `cursor-sdk` (via sdk)
- `hz-iwsdk-webxr` (via sdk)
- `hz-platform-sdk` (via sdk)
- `hz-spatial-sdk` (via sdk)
- `diagnosing-sdk-health` (via sdk)
- `sdk-getting-started` (via sdk)
- `data-capture-sdk` (via sdk)
- `sentry-sdk-upgrade` (via sdk)
- `get-visual-embed-sdk-reference` (via sdk)
- `ai-sdk` (via sdk)
- `chat-sdk` (via sdk)
- `aws-lambda-durable-functions` (via function)
- `aws-step-functions` (via function)
- `function-creator` (via function)
- `functions` (via function)
- `netlify-edge-functions` (via function)

### Resolved SKILL.md paths (when discovered on this host)
- `database` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/encore/ded36605dbd2d6b1459f66c95843f927892ff9a0/skills/database/SKILL.md`
- `netlify-database` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/netlify-skills/22025ef6c9dc9ef88d0c9c047980c10cacb178ee/codex/skills/netlify-database/SKILL.md`
- `vercel-storage` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/vercel/3d9d9cd0fe5d1bdaedb891135a5c45f19190b83f/skills/vercel-storage/SKILL.md`
- `create-database-row` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/notion-workspace/cf1324609edba6d617164f1dec138aeb43f26735/skills/create-database-row/SKILL.md`
- `clerk-react-patterns` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/clerk/release_v0.2.0/skills/clerk-react-patterns/SKILL.md`
- `clerk-react-router-patterns` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/clerk/release_v0.2.0/skills/clerk-react-router-patterns/SKILL.md`
- `gsap-react` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/gsap-skills/aed9cfd3277740755f6bfc1155c7aa645403b760/skills/gsap-react/SKILL.md`
- `setup-react-app` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/phantom-connect/4162aa88131f0a6b6f0c050b176736f0773d038c/skills/setup-react-app/SKILL.md`
- `setup-react-native-app` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/phantom-connect/4162aa88131f0a6b6f0c050b176736f0773d038c/skills/setup-react-native-app/SKILL.md`
- `improve-react` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/react-doctor/54ba416f830952c30b6ddae7985ede8a251f0a5b/skills/improve-react/SKILL.md`
- `react-doctor` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/react-doctor/54ba416f830952c30b6ddae7985ede8a251f0a5b/skills/react-doctor/SKILL.md`
- `react-email` → `C:/Users/My PC/.cursor/plugins/cache/cursor-public/resend/2caefffaf938c3c4ed539d5b29e3cd2bd2555bbe/skills/react-email/SKILL.md`

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
