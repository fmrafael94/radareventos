-- The Worker applies this schema defensively on first use as well. Keeping it
-- here documents the permanent data model and permits a normal D1 migration.
CREATE TABLE IF NOT EXISTS event_registry (
  id TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  origin_kind TEXT NOT NULL CHECK (origin_kind IN ('official_source')),
  source_url TEXT NOT NULL,
  ticket_url TEXT,
  source_verified_at TEXT NOT NULL,
  publication_status TEXT NOT NULL DEFAULT 'published' CHECK (publication_status IN ('published', 'paused', 'archived')),
  last_audit_at TEXT,
  next_audit_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS event_registry_audit_due ON event_registry(publication_status, next_audit_at);

CREATE TABLE IF NOT EXISTS event_audits (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  checked_url TEXT NOT NULL,
  check_kind TEXT NOT NULL CHECK (check_kind IN ('official_page', 'ticket_page')),
  outcome TEXT NOT NULL CHECK (outcome IN ('reachable', 'unreachable', 'error')),
  http_status INTEGER,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS event_audits_event_created ON event_audits(event_id, created_at DESC);

CREATE TABLE IF NOT EXISTS automation_runs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  outcome TEXT NOT NULL,
  checked_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
