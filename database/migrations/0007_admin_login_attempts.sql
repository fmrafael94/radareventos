-- Limits repeated password attempts without retaining the visitor's raw IP.
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  window_started INTEGER NOT NULL
);
