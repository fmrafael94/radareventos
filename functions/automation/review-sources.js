import { ensureEventStore } from "../event-store.js";

const maxChecksPerRun = 20;
const auditDelayHours = 24;

async function inspect(url) {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": "Desvio-source-review/1.0 (+https://odesvio.pt)" }
    });
    return { outcome: response.ok ? "reachable" : "unreachable", status: response.status };
  } catch {
    return { outcome: "error", status: null };
  }
}

// This is intentionally conservative: it checks that an official page or a
// direct ticket link is still reachable, but never infers sale availability
// from an ambiguous page and never creates or publishes a new event.
export async function reviewOfficialSources(env, kind = "two_hour_review") {
  if (!env.EVENT_RADAR_DB) return;
  const db = env.EVENT_RADAR_DB;
  await ensureEventStore(db);
  const now = new Date().toISOString();
  const { results } = await db.prepare(`
    SELECT id, source_url, ticket_url FROM event_registry
    WHERE publication_status = 'published'
      AND next_audit_at IS NOT NULL
      AND next_audit_at <= datetime('now')
    ORDER BY next_audit_at ASC
    LIMIT ?
  `).bind(maxChecksPerRun).all();

  let checked = 0;
  for (const event of results) {
    const targets = [
      [event.source_url, "official_page"],
      ...(event.ticket_url && event.ticket_url !== event.source_url ? [[event.ticket_url, "ticket_page"]] : [])
    ];
    for (const [url, checkKind] of targets) {
      const result = await inspect(url);
      await db.prepare(`
        INSERT INTO event_audits (id, event_id, checked_url, check_kind, outcome, http_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(crypto.randomUUID(), event.id, url, checkKind, result.outcome, result.status, now).run();
      checked += 1;
    }
    await db.prepare(`
      UPDATE event_registry
      SET last_audit_at = ?, next_audit_at = datetime('now', '+${auditDelayHours} hours'), updated_at = datetime('now')
      WHERE id = ?
    `).bind(now, event.id).run();
  }
  await db.prepare(`
    INSERT INTO automation_runs (id, kind, outcome, checked_count, created_at)
    VALUES (?, ?, 'completed', ?, ?)
  `).bind(crypto.randomUUID(), kind, checked, now).run();
}
