-- LineageStudio schema (SQLite dialect).
-- JSON columns are stored as TEXT and parsed by the data access layer.

CREATE TABLE IF NOT EXISTS profiles (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  model_type    TEXT NOT NULL,
  role          TEXT,
  settings_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS tasks (
  id         TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  title      TEXT NOT NULL,
  input_text TEXT NOT NULL,
  spec_json  TEXT,
  status     TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lineage_events (
  id           TEXT PRIMARY KEY,
  task_id      TEXT REFERENCES tasks(id),
  profile_id   TEXT REFERENCES profiles(id),
  event_type   TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
  id            TEXT PRIMARY KEY,
  task_id       TEXT REFERENCES tasks(id),
  profile_id    TEXT REFERENCES profiles(id),
  kind          TEXT NOT NULL,
  content_text  TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_messages (
  id            TEXT PRIMARY KEY,
  from_profile  TEXT NOT NULL REFERENCES profiles(id),
  to_profile    TEXT NOT NULL REFERENCES profiles(id),
  task_id       TEXT REFERENCES tasks(id),
  content_text  TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_profile ON tasks(profile_id);
CREATE INDEX IF NOT EXISTS idx_lineage_task ON lineage_events(task_id);
CREATE INDEX IF NOT EXISTS idx_lineage_profile ON lineage_events(profile_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_task ON artifacts(task_id);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON agent_messages(from_profile, to_profile);
