let schemaReady;

// Kept in one small module so the public site, the private review area and
// scheduled checks all follow the same publishing rule. D1 runs this once per
// Worker instance; every statement is idempotent, so a fresh deployment is safe.
export function ensureEventStore(db) {
  if (!schemaReady) {
    schemaReady = db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS event_registry (
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
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS event_registry_audit_due ON event_registry(publication_status, next_audit_at)"),
      db.prepare(`CREATE TABLE IF NOT EXISTS event_overrides (
        event_id TEXT PRIMARY KEY,
        patch_json TEXT NOT NULL,
        source_url TEXT,
        verified_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS event_audits (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        checked_url TEXT NOT NULL,
        check_kind TEXT NOT NULL CHECK (check_kind IN ('official_page', 'ticket_page')),
        outcome TEXT NOT NULL CHECK (outcome IN ('reachable', 'unreachable', 'error')),
        http_status INTEGER,
        created_at TEXT NOT NULL
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS event_audits_event_created ON event_audits(event_id, created_at DESC)"),
      db.prepare(`CREATE TABLE IF NOT EXISTS automation_runs (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        outcome TEXT NOT NULL,
        checked_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`)
    ]).catch(error => {
      schemaReady = undefined;
      throw error;
    });
  }
  return schemaReady;
}

export function canonicalEventFromReview(feedback, values) {
  const id = `community-${feedback.id}`;
  const today = new Date().toISOString().slice(0, 10);
  return {
    id,
    title: values.eventName,
    date: values.eventDate,
    endDate: values.eventEndDate || undefined,
    time: "Consultar organização",
    venue: values.venue,
    city: values.city,
    district: "A confirmar",
    area: "A confirmar",
    type: "Concerto",
    genres: ["Outro"],
    age: "Consultar organização",
    tickets: values.tickets,
    ticketUrl: values.ticketUrl,
    availability: /entrada\s+(?:livre|gratuita)/i.test(values.tickets) ? "Entrada livre" : /confirmar|anunciar/i.test(values.tickets) ? "Por confirmar" : "Disponível",
    capacity: "Não divulgado",
    source: "Fonte oficial confirmada pelo Desvio",
    sourceUrl: values.officialUrl,
    image: values.posterUrl,
    posterSourceUrl: values.officialUrl,
    verifiedAt: today,
    salesCheckedAt: ""
  };
}
