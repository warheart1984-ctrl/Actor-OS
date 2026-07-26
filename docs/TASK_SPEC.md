# TaskSpec

As implemented in `backend/src/core/TaskSpec.ts`.

Canonical work contract **before** ModelRouter. Provider quirks stay behind connectors.

```text
Intent → TaskSpec → Agent Profile → ModelRouter → Connector → Provider
```

## Shape (v1)

| Field | Purpose |
|---|---|
| `version` | Always `"1"` |
| `intent` | What the agent should do (draft, review, summarize, …) |
| `goal` | Optional outcome description |
| `agent_id` | Owning agent profile id |
| `inputs.primary` | Primary text payload |
| `constraints` | Optional tone / length / must_include |
| `success_criteria` | Optional checklist |

## Lifecycle

1. `POST /api/tasks` builds a TaskSpec (from `intent` + `input_text`, or an explicit `spec`).
2. Spec is stored on `tasks.spec_json` and as a `task_spec` artifact.
3. Lineage `task` events embed `task_spec`.
4. `run` / `chain` render the spec via `renderTaskSpecPrompt` before ModelRouter.

Connectors never receive the TaskSpec object — only the rendered prompt string.
