# Model router

As implemented in `backend/src/models/ModelRouter.ts`.

## Addressing

**Agent profiles** are the addressable unit. Each profile has a swappable **binding**
`{ connector, model }` (stored as `model_type` = `connector:model` for schema compat).

```text
Agent Profile → ModelRouter → Connector → Provider model
```

Swapping OpenAI → Anthropic changes the binding only — agent id, name, role, and lineage stay put.

## Methods

- `send({ agentId, input, … })` — invoke one agent.
- `chain(steps, onStep?)` — ordered multi-agent pipeline. Empty step input inherits the previous step's output. Each step receives `context.previous_steps` with `{ agent, summary }`.

Upstream, TaskOrchestrator builds a **TaskSpec** and renders it to prompt text before calling the router. See `docs/TASK_SPEC.md`.

## Connectors

| Connector | Module | Live when |
|---|---|---|
| `openai` | `OpenAIConnector` | `OPENAI_API_KEY` set |
| `anthropic` | `AnthropicConnector` | `ANTHROPIC_API_KEY` set |
| `gemini` | `GeminiConnector` | `GEMINI_API_KEY` set |
| `mistral` | `OpenAICompatibleConnector` | `MISTRAL_API_KEY` set |
| `ollama` | `LocalConnector` | `OLLAMA_ENABLED=true` |
| (fallback) | `MockConnector` | credentials missing |

Registered by `buildConnectorRegistry`. Health at `GET /api/health` reports `live` vs `mock` per connector.
