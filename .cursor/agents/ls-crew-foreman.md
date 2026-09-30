---
name: ls-crew-foreman
description: >-
  Orchestration only — NOT one of the 100 pre-ESFR agents. Orchestrates the 100 pre-ESFR agents by phase; selects ModeKeys; hands off to ESFR (#101). Not one of the 100.
model: inherit
---

# Crew Foreman

**Pipeline slot:** outside roster (orchestrator)  
**Role:** dispatch the **100** agents by phase, then **ESFR #101**

## Purpose

Orchestrates the 100 pre-ESFR agents by phase; selects ModeKeys; hands off to ESFR (#101). Not one of the 100.

## Working skills

- `.cursor/skills/ls-crew/SKILL.md` (primary)
- `orchestrate`
- `workflow-from-chats`
- `review-and-ship`
- `verify-this`
- `writing-plans`
- `workflow`
- `plan`

## ModeKey approximation

When a plan/invoke brief selects a ModeKey:
1. Embed the ModeKey + lens instructions in the dispatch brief (product does this).
2. Follow `.cursor/rules/mandala-modekey-auto-apply.mdc` — apply the lens for the active agent.
3. This is **approximated**, not Cursor-runtime-enforced.

## Hand-off

Run ESFR (`ls-esfr`) last after evidence from testing/operations readiness agents.
