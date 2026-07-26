# Database schema

As implemented in `backend/src/db/schema.sql` (SQLite) and `schema.postgres.sql` (Postgres).

| Table | Purpose |
|---|---|
| `profiles` | Model personas (`model_type` = `provider:model`, `settings_json`) |
| `tasks` | Work units owned by a profile |
| `lineage_events` | Immutable event log (`task`, `decision`, `evidence`, `interaction`, `artifact`, `chain_step`) |
| `artifacts` | Produced text / documents linked to a task |
| `agent_messages` | Persisted cross-profile messages |

JSON columns are stored as `TEXT` on SQLite and `JSONB` on Postgres. The data access layer in `backend/src/db/Database.ts` normalizes both to objects.

Default driver: SQLite file at `SQLITE_PATH` (or `./data/lineage.sqlite`). Set `DATABASE_DRIVER=postgres` + `DATABASE_URL` for Postgres.
