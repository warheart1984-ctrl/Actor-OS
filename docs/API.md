# HTTP API

All routes are under `/api`. Request and response bodies are JSON.

Agent profiles are the addressable unit. Prefer `agent_id` / `agentId` / `binding`; legacy `profile_id` / `profileId` / `model_type` are accepted where noted.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Status, DB dialect, provider live/mock map |
| GET | `/profiles` | List agents (includes `binding`) |
| POST | `/profiles` | Create agent (`binding` or `model_type`, name, role, settings) |
| GET | `/profiles/:id` | Load agent |
| PATCH | `/profiles/:id` | Update role / binding / model_type / settings_json |
| GET | `/profiles/:id/tasks` | Tasks for an agent |
| GET | `/profiles/:id/lineage` | Recent lineage for an agent |
| GET | `/tasks` | Recent tasks |
| POST | `/tasks` | Create task (`agent_id` or legacy `profile_id`, `title`, `input_text`, optional `intent` / `spec`) |
| GET | `/tasks/:id` | Load task (includes `spec_json` when present) |
| PATCH | `/tasks/:id` | Update `input_text` |
| POST | `/tasks/:id/run` | Run TaskSpec through the task's agent → connector |
| POST | `/tasks/:id/chain` | Run ordered steps `[{ agentId, input? }]` (legacy `profileId` ok) |
| GET | `/tasks/:id/lineage` | Lineage for a task |
| GET | `/tasks/:id/artifacts` | Artifacts for a task |
| GET | `/tasks/:id/messages` | Agent messages for a task |
| GET | `/lineage?limit=` | Recent lineage across all tasks |
| POST | `/agents/send` | Cross-agent handoff (shorthand or `envelope`) |
| GET | `/agents/graph` | Nodes + directed message edges (nodes include `binding`) |
| GET | `/agents/messages?a=&b=` | Messages between two agents |

WebSocket: `WS /ws` — frames `{ type: "lineage_event", event }` and an initial `{ type: "connected" }`.

See also: `docs/TASK_SPEC.md`, `docs/MODEL_ROUTER.md`.
