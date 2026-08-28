let schemaReady;

// Items created by the GitHub checks are kept apart from public suggestions.
// They are only a private work queue: an automated check never changes an
// event, its ticket status or its poster by itself.
export function ensureAutomationReviewStore(db) {
  if (!schemaReady) {
    schemaReady = db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS automation_reviews (
        id TEXT PRIMARY KEY,
        dedupe_key TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL CHECK (category IN ('link', 'source')),
        event_id TEXT,
        target_kind TEXT,
        title TEXT NOT NULL,
        detail TEXT,
        url TEXT NOT NULL,
        result TEXT,
        proposal_title TEXT,
        proposal_url TEXT,
        editor_note TEXT,
        status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved', 'ignored')),
        first_seen_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        resolved_at TEXT
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS automation_reviews_status_seen ON automation_reviews(status, last_seen_at DESC)"),
      db.prepare(`CREATE TABLE IF NOT EXISTS source_watch_snapshots (
        source_url TEXT PRIMARY KEY,
        fingerprint TEXT NOT NULL,
        page_title TEXT,
        checked_at TEXT NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS link_audit_snapshots (
        audit_key TEXT PRIMARY KEY,
        fingerprint TEXT NOT NULL,
        checked_at TEXT NOT NULL
      )`)
    ]).catch(error => {
      schemaReady = undefined;
      throw error;
    });
  }
  return schemaReady;
}

const text = (value, limit = 1000) => typeof value === "string" ? value.trim().slice(0, limit) : "";

function reviewId(key) {
  let hash = 2166136261;
  for (const character of key) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `auto-${(hash >>> 0).toString(36)}`;
}

function resultLabel(item) {
  return text(item.status, 40) || text(item.error, 120) || "Sem resposta";
}

async function upsert(db, item) {
  const id = reviewId(item.key);
  await db.prepare(`
    INSERT INTO automation_reviews (
      id, dedupe_key, category, event_id, target_kind, title, detail, url, result,
      proposal_title, proposal_url,
      status, first_seen_at, last_seen_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', datetime('now'), datetime('now'))
    ON CONFLICT(dedupe_key) DO UPDATE SET
      event_id = excluded.event_id,
      target_kind = excluded.target_kind,
      title = excluded.title,
      detail = excluded.detail,
      url = excluded.url,
      result = excluded.result,
      last_seen_at = datetime('now'),
      status = CASE
        WHEN automation_reviews.status = 'resolved' THEN 'new'
        ELSE automation_reviews.status
      END,
      resolved_at = NULL
  `).bind(
    id, item.key, item.category, item.eventId || null, item.targetKind || null, item.title,
    item.detail || null, item.url, item.result || null, item.title, item.url
  ).run();
}

async function resolveLink(db, key) {
  await db.prepare(`
    UPDATE automation_reviews
    SET status = CASE WHEN status IN ('new', 'reviewing') THEN 'resolved' ELSE status END,
        resolved_at = CASE WHEN status IN ('new', 'reviewing') THEN datetime('now') ELSE resolved_at END,
        last_seen_at = datetime('now')
    WHERE dedupe_key = ?
  `).bind(key).run();
}

async function sourceChanged(db, item) {
  const sourceUrl = text(item?.url, 1600);
  const fingerprint = text(item?.fingerprint, 100);
  if (!sourceUrl || !fingerprint) return false;
  const existing = await db.prepare("SELECT fingerprint FROM source_watch_snapshots WHERE source_url = ?").bind(sourceUrl).first();
  await db.prepare(`
    INSERT INTO source_watch_snapshots (source_url, fingerprint, page_title, checked_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(source_url) DO UPDATE SET fingerprint = excluded.fingerprint, page_title = excluded.page_title, checked_at = excluded.checked_at
  `).bind(sourceUrl, fingerprint, text(item?.pageTitle, 300) || null).run();
  return Boolean(existing && existing.fingerprint !== fingerprint);
}

async function linkChanged(db, item) {
  const key = `link:${text(item?.kind, 60)}:${text(item?.url, 1600)}`;
  const fingerprint = [text(item?.finalUrl, 1600), text(item?.etag, 300), text(item?.lastModified, 300), text(item?.contentLength, 80)].join("|");
  if (!text(item?.url, 1600) || !fingerprint.replace(/\|/g, "")) return false;
  const existing = await db.prepare("SELECT fingerprint FROM link_audit_snapshots WHERE audit_key = ?").bind(key).first();
  await db.prepare(`
    INSERT INTO link_audit_snapshots (audit_key, fingerprint, checked_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(audit_key) DO UPDATE SET fingerprint = excluded.fingerprint, checked_at = excluded.checked_at
  `).bind(key, fingerprint).run();
  return Boolean(existing && existing.fingerprint !== fingerprint);
}

export async function ingestAutomationReport(db, reportKind, report) {
  await ensureAutomationReviewStore(db);
  const results = Array.isArray(report?.results) ? report.results : [];
  let queued = 0;
  let resolved = 0;

  if (reportKind === "link_audit") {
    for (const item of results) {
      const url = text(item?.url, 1600);
      if (!url) continue;
      const key = `link:${text(item.kind, 60)}:${url}`;
      if (item.ok === true) {
        const changed = await linkChanged(db, item);
        if (!changed) {
          await resolveLink(db, key);
          resolved += 1;
          continue;
        }
        await upsert(db, {
          key,
          category: "link",
          eventId: text(item.id, 180),
          targetKind: text(item.kind, 60),
          title: text(item.title, 240) || "Evento sem título",
          detail: `${text(item.kind, 60) || "Página"} alterou-se desde a última verificação. Confirma manualmente se houve mudança de bilheteira, cartaz ou informação do evento.`,
          url,
          result: "Página alterada"
        });
        queued += 1;
        continue;
      }
      await upsert(db, {
        key,
        category: "link",
        eventId: text(item.id, 180),
        targetKind: text(item.kind, 60),
        title: text(item.title, 240) || "Evento sem título",
        detail: `${text(item.kind, 60) || "Link"} devolveu ${resultLabel(item)}. Confirma manualmente: algumas plataformas bloqueiam verificações automáticas.`,
        url,
        result: resultLabel(item)
      });
      queued += 1;
    }
  } else if (reportKind === "source_watch") {
    for (const item of results) {
      const url = text(item?.url, 1600);
      if (!url) continue;
      const key = `source:${url}`;
      const changed = item.ok === true ? await sourceChanged(db, item) : false;
      if (item.ok === true && !changed) continue;
      const checkResult = item.ok === true ? "Página alterada desde a última ronda" : resultLabel(item);
      await upsert(db, {
        key,
        category: "source",
        title: text(item.name, 240) || "Fonte sem nome",
        detail: item.ok === true
          ? `A página desta fonte mudou desde a última ronda. Procura novos eventos em ${text(item.focus, 180) || "esta fonte"} antes de criar qualquer entrada.`
          : `Ronda diária: a fonte precisa de atenção (${checkResult}). Confirma manualmente antes de a usar.`,
        url,
        result: checkResult
      });
      queued += 1;
    }
  } else {
    throw new Error("Tipo de relatório inválido.");
  }

  return { queued, resolved, checked: results.length };
}
