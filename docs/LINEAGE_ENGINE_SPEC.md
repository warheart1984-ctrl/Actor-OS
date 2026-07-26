# Lineage engine

As implemented in `backend/src/core/LineageEngine.ts`.

## Event types recorded today

| Type | When |
|---|---|
| `task` | Task created |
| `decision` | Task status transition (`pending` → `running` → `done` / `failed`) |
| `artifact` | Model response recorded (also writes an `artifacts` row on success) |
| `chain_step` | One step of a multi-profile chain (`payload.step` is the index) |
| `interaction` | Cross-agent handoff via `AgentCollaborationEngine` |
| `evidence` | Errors and other system evidence |

Every payload that carries produced text includes an `evidence` object with `source`, `content_sha256`, and `recorded_at` (`backend/src/core/Evidence.ts`).

## Streaming

`LineageEngine.onEvent` fans out to the WebSocket layer (`backend/src/ws.ts`), which broadcasts `{ type: "lineage_event", event }` on `/ws`. The frontend hook `useLineageStream` consumes that stream.
