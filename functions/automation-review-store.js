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

function upsertStatement(db, item) {
  const id = reviewId(item.key);
  return db.prepare(`
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
  );
}

function resolveLinkStatement(db, key) {
  return db.prepare(`
    UPDATE automation_reviews
    SET status = CASE WHEN status IN ('new', 'reviewing') THEN 'resolved' ELSE status END,
        resolved_at = CASE WHEN status IN ('new', 'reviewing') THEN datetime('now') ELSE resolved_at END,
        last_seen_at = datetime('now')
    WHERE dedupe_key = ?
  `).bind(key);
}

function sourceSnapshotStatement(db, sourceUrl, fingerprint, pageTitle) {
  return db.prepare(`
    INSERT INTO source_watch_snapshots (source_url, fingerprint, page_title, checked_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(source_url) DO UPDATE SET fingerprint = excluded.fingerprint, page_title = excluded.page_title, checked_at = excluded.checked_at
  `).bind(sourceUrl, fingerprint, pageTitle || null);
}

function linkSnapshotStatement(db, key, fingerprint) {
  return db.prepare(`
    INSERT INTO link_audit_snapshots (audit_key, fingerprint, checked_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(audit_key) DO UPDATE SET fingerprint = excluded.fingerprint, checked_at = excluded.checked_at
  `).bind(key, fingerprint);
}

async function batchInChunks(db, statements, size = 500) {
  const results = [];
  for (let index = 0; index < statements.length; index += size) {
    results.push(...await db.batch(statements.slice(index, index + size)));
  }
  return results;
}

function firstRow(result) {
  return Array.isArray(result?.results) ? result.results[0] : null;
}

function uniqueByKey(items) {
  return [...new Map(items.map(item => [item.key, item])).values()];
}

export async function ingestAutomationReport(db, reportKind, report) {
  await ensureAutomationReviewStore(db);
  const results = Array.isArray(report?.results) ? report.results : [];
  let queued = 0;
  let resolved = 0;

  if (reportKind === "link_audit") {
    const items = uniqueByKey(results.map(item => {
      const url = text(item?.url, 1600);
      if (!url) return null;
      const key = `link:${text(item.kind, 60)}:${url}`;
      const fingerprint = [text(item?.finalUrl, 1600), text(item?.etag, 300), text(item?.lastModified, 300), text(item?.contentLength, 80)].join("|");
      return { item, url, key, fingerprint, hasFingerprint: Boolean(fingerprint.replace(/\|/g, "")) };
    }).filter(Boolean));
    const snapshots = items.filter(({ item, hasFingerprint }) => item.ok === true && hasFingerprint);
    const existing = await batchInChunks(db, snapshots.map(({ key }) =>
      db.prepare("SELECT fingerprint FROM link_audit_snapshots WHERE audit_key = ?").bind(key)
    ));
    const changed = new Map(snapshots.map((snapshot, index) => [
      snapshot.key,
      Boolean(firstRow(existing[index]) && firstRow(existing[index]).fingerprint !== snapshot.fingerprint)
    ]));
    const writes = [];
    for (const entry of items) {
      const { item, url, key, fingerprint, hasFingerprint } = entry;
      if (item.ok === true) {
        if (hasFingerprint) writes.push(linkSnapshotStatement(db, key, fingerprint));
        if (!changed.get(key)) {
          writes.push(resolveLinkStatement(db, key));
          resolved += 1;
          continue;
        }
        writes.push(upsertStatement(db, {
          key,
          category: "link",
          eventId: text(item.id, 180),
          targetKind: text(item.kind, 60),
          title: text(item.title, 240) || "Evento sem título",
          detail: `${text(item.kind, 60) || "Página"} alterou-se desde a última verificação. Confirma manualmente se houve mudança de bilheteira, cartaz ou informação do evento.`,
          url,
          result: "Página alterada"
        }));
        queued += 1;
        continue;
      }
      writes.push(upsertStatement(db, {
        key,
        category: "link",
        eventId: text(item.id, 180),
        targetKind: text(item.kind, 60),
        title: text(item.title, 240) || "Evento sem título",
        detail: `${text(item.kind, 60) || "Link"} devolveu ${resultLabel(item)}. Confirma manualmente: algumas plataformas bloqueiam verificações automáticas.`,
        url,
        result: resultLabel(item)
      }));
      queued += 1;
    }
    await batchInChunks(db, writes);
  } else if (reportKind === "source_watch") {
    const items = uniqueByKey(results.map(item => {
      const url = text(item?.url, 1600);
      if (!url) return null;
      const key = `source:${url}`;
      const fingerprint = text(item?.fingerprint, 100);
      return { item, url, key, fingerprint };
    }).filter(Boolean));
    const snapshots = items.filter(({ item, fingerprint }) => item.ok === true && fingerprint);
    const existing = await batchInChunks(db, snapshots.map(({ url }) =>
      db.prepare("SELECT fingerprint FROM source_watch_snapshots WHERE source_url = ?").bind(url)
    ));
    const changed = new Map(snapshots.map((snapshot, index) => [
      snapshot.key,
      Boolean(firstRow(existing[index]) && firstRow(existing[index]).fingerprint !== snapshot.fingerprint)
    ]));
    const writes = [];
    for (const entry of items) {
      const { item, url, key, fingerprint } = entry;
      if (item.ok === true && fingerprint) {
        writes.push(sourceSnapshotStatement(db, url, fingerprint, text(item?.pageTitle, 300)));
      }
      const sourceWasChanged = item.ok === true && Boolean(fingerprint) && changed.get(key);
      if (item.ok === true && !sourceWasChanged) continue;
      const checkResult = item.ok === true ? "Página alterada desde a última ronda" : resultLabel(item);
      writes.push(upsertStatement(db, {
        key,
        category: "source",
        title: text(item.name, 240) || "Fonte sem nome",
        detail: item.ok === true
          ? `A página desta fonte mudou desde a última ronda. Procura novos eventos em ${text(item.focus, 180) || "esta fonte"} antes de criar qualquer entrada.`
          : `Ronda diária: a fonte precisa de atenção (${checkResult}). Confirma manualmente antes de a usar.`,
        url,
        result: checkResult
      }));
      queued += 1;
    }
    await batchInChunks(db, writes);
  } else {
    throw new Error("Tipo de relatório inválido.");
  }

  return { queued, resolved, checked: results.length };
}
