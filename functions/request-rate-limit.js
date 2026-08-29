let storeReady;

function ensureStore(db) {
  if (!storeReady) {
    storeReady = db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS request_rate_limits (
        scope TEXT NOT NULL,
        fingerprint TEXT NOT NULL,
        window_start INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (scope, fingerprint, window_start)
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS request_rate_limits_expiry ON request_rate_limits(window_start)")
    ]).catch(error => {
      storeReady = undefined;
      throw error;
    });
  }
  return storeReady;
}

async function fingerprint(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

// The raw IP is never written to D1. Each scope has a short, independent
// window, so a busy public form cannot exhaust Workers AI or D1 resources.
export async function withinRequestLimit(db, request, { scope, limit, windowMs }) {
  await ensureStore(db);
  const windowStart = Math.floor(Date.now() / windowMs);
  const key = await fingerprint(request);
  await db.prepare("DELETE FROM request_rate_limits WHERE window_start < ?").bind(windowStart - 2).run();
  const row = await db.prepare(`
    INSERT INTO request_rate_limits (scope, fingerprint, window_start, attempts)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(scope, fingerprint, window_start) DO UPDATE SET attempts = attempts + 1
    RETURNING attempts
  `).bind(scope, key, windowStart).first();
  return Number(row?.attempts || 0) <= limit;
}
