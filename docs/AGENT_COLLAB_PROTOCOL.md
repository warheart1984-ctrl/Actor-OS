# Agent collaboration protocol

As implemented in `backend/src/core/AgentCollaborationEngine.ts`.

## Envelope

```json
{
  "type": "agent_task",
  "from_profile": "gpt_email",
  "to_profile": "claude_research",
  "task_id": "optional-task-id",
  "intent": "review",
  "subject": "optional",
  "input": "text handed to the receiving profile",
  "constraints": { "tone": "neutral" },
  "context": {}
}
```

Validated by `parseAgentTaskEnvelope`. Required fields: `from_profile`, `to_profile`, `input`. Default intent: `refine`.

## Delivery

1. Message persisted on `agent_messages` with `metadata.type = "agent_task"`.
2. Lineage `interaction` event recorded.
3. When `execute` is true (default), the receiving profile's model runs and a reply is recorded as an artifact + return message (`metadata.type = "agent_reply"`).

HTTP surface: `POST /api/agents/send` (shorthand body or full `envelope`).
