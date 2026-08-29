-- Run once in Cloudflare D1 before enabling the public forms.
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('suggestion', 'correction')),
  event_id TEXT,
  event_name TEXT,
  event_date TEXT,
  city TEXT,
  official_url TEXT,
  poster_url TEXT,
  poster_object_key TEXT,
  poster_file_name TEXT,
  image_moderation_status TEXT NOT NULL DEFAULT 'not_applicable' CHECK (image_moderation_status IN ('not_applicable', 'approved', 'review', 'rejected')),
  image_moderation_reason TEXT,
  message TEXT NOT NULL,
  sender_name TEXT,
  sender_email TEXT,
  tracking_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'published', 'rejected', 'closed')),
  staff_note TEXT,
  created_at TEXT NOT NULL,
  reviewed_at TEXT
);

CREATE INDEX IF NOT EXISTS feedback_status_created_at ON feedback(status, created_at DESC);

CREATE TABLE IF NOT EXISTS request_rate_limits (
  scope TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (scope, fingerprint, window_start)
);

CREATE INDEX IF NOT EXISTS request_rate_limits_expiry ON request_rate_limits(window_start);

CREATE TABLE IF NOT EXISTS admin_users (
  email TEXT PRIMARY KEY COLLATE NOCASE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
