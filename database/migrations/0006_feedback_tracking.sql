-- Run once on the existing D1 database before publishing the request tracker.
ALTER TABLE feedback ADD COLUMN tracking_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS feedback_tracking_code ON feedback(tracking_code);

CREATE TABLE IF NOT EXISTS request_rate_limits (
  scope TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (scope, fingerprint, window_start)
);
CREATE INDEX IF NOT EXISTS request_rate_limits_expiry ON request_rate_limits(window_start);
