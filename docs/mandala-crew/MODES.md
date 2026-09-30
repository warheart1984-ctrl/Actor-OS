# Modes approach (1000 per agent)

## Formula (unchanged for 100-agent roster)

```
ModeKey = crewMode × actorMode × stance
        = 20 × 10 × 5
        = 1000
```

Shared registry — **not** 100×1000 markdown files.

Registry: `.cursor/mandala-crew/modes-registry.json`  
Count at generation: **1000**

## Auto-apply status

| Claim | Status |
|-------|--------|
| Registry enumerates 1000 ModeKeys | **yes** |
| Product invoke brief embeds selected ModeKey | **yes** |
| Cursor rule asks agents to apply embedded ModeKey | **declared** |
| Cursor auto-loads ModeKey as a skill | **no** |
