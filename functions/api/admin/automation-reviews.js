import { ensureAutomationReviewStore } from "../../automation-review-store.js";
import { ensureEventStore } from "../../event-store.js";
import { requireAdmin } from "../../admin-auth.js";
import { publicationChecklist, samePublishedEvent } from "../../publication-readiness.js";
import { staticCatalogueWithPosters } from "../../published-event-duplicates.js";

const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const statuses = new Set(["new", "reviewing", "resolved", "ignored"]);
const text = (value, limit) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const validUrl = value => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};

function groupAutomationItems(items) {
  const groups = new Map();
  for (const item of items) {
    // One event can legitimately produce separate checks for its official
    // page, ticketing and poster. In the review UI those are one editorial
    // subject, not three repeated events.
    const key = item.event_id ? `event:${item.event_id}` : `source:${item.url}`;
    const current = groups.get(key);
    if (!current) {
      groups.set(key, { ...item, group_ids: [item.id], signal_count: 1, target_kinds: item.target_kind ? [item.target_kind] : [] });
      continue;
    }
    current.group_ids.push(item.id);
    current.signal_count += 1;
    if (item.target_kind && !current.target_kinds.includes(item.target_kind)) current.target_kinds.push(item.target_kind);
    if (item.result && !String(current.result || "").includes(item.result)) current.result = [current.result, item.result].filter(Boolean).join(" · ");
  }
  return [...groups.values()];
}

async function applyAgendaPatch(db, item, proposalUrl, proposalTitle = "") {
  const patch = item.target_kind === "Bilheteira"
    ? { ticketUrl: proposalUrl, tickets: "Consultar bilheteira oficial", availability: "Bilhetes a confirmar" }
    : { sourceUrl: proposalUrl };
  if (proposalTitle && proposalTitle !== item.title) patch.title = proposalTitle;
  await db.prepare(`
    INSERT INTO event_overrides (event_id, patch_json, source_url, verified_at, updated_at)
    VALUES (?, ?, ?, date('now'), datetime('now'))
    ON CONFLICT(event_id) DO UPDATE SET
      patch_json = json_patch(event_overrides.patch_json, excluded.patch_json),
      source_url = excluded.source_url,
      verified_at = date('now'),
      updated_at = datetime('now')
  `).bind(item.event_id, JSON.stringify(patch), proposalUrl).run();
}

async function publicationSnapshots(context, items) {
  const staticEvents = await staticCatalogueWithPosters(context.env, context.request);
  let published = [];
  try {
    await ensureEventStore(context.env.EVENT_RADAR_DB);
    const { results = [] } = await context.env.EVENT_RADAR_DB.prepare(`
      SELECT id, payload_json FROM event_registry
      WHERE publication_status = 'published' AND origin_kind = 'official_source' LIMIT 500
    `).all();
    published = results.flatMap(row => {
      try { const event = JSON.parse(row.payload_json); return event?.id ? [event] : []; } catch { return []; }
    });
  } catch { /* Static catalogue remains a useful complete fallback. */ }
  const catalogue = [...staticEvents, ...published];
  const byId = new Map(catalogue.map(event => [event.id, event]));
  return items.map(item => {
    const event = byId.get(item.event_id);
    if (!event) return item;
    const values = {
      title: event.title,
      date: event.date,
      city: event.city,
      venue: event.venue,
      image: event.image,
      tickets: event.tickets,
      sourceUrl: event.sourceUrl
    };
    const duplicates = catalogue
      .filter(candidate => candidate.id !== event.id && samePublishedEvent(values, candidate))
      .slice(0, 3)
      .map(candidate => ({ id: candidate.id, title: candidate.title, date: candidate.date, city: candidate.city, venue: candidate.venue }));
    return {
      ...item,
      event_snapshot: { id: event.id, title: event.title, date: event.date, city: event.city, venue: event.venue },
      publication: { items: publicationChecklist(values), duplicate: duplicates, ready: !duplicates.length && publicationChecklist(values).every(check => check.present) }
    };
  });
}

export async function onRequestGet(context) {
  const session = await requireAdmin(context);
  if (session.response) return session.response;
  if (!context.env.EVENT_RADAR_DB) return json({ message: "Base de dados ainda não ligada." }, 503);
  await ensureAutomationReviewStore(context.env.EVENT_RADAR_DB);
  const url = new URL(context.request.url);
  const status = statuses.has(url.searchParams.get("status")) ? url.searchParams.get("status") : "new";
  const { results } = await context.env.EVENT_RADAR_DB.prepare(`
    SELECT id, category, event_id, target_kind, title, detail, url, result, proposal_title,
      proposal_url, editor_note, status,
      first_seen_at, last_seen_at, resolved_at
    FROM automation_reviews WHERE status = ?
    ORDER BY last_seen_at DESC LIMIT 1000
  `).bind(status).all();
  const rawItems = results || [];
  const items = groupAutomationItems(rawItems);
  return json({ items: await publicationSnapshots(context, items), meta: { signals: rawItems.length, events: items.length } });
}

export async function onRequestPatch(context) {
  const session = await requireAdmin(context);
  if (session.response) return session.response;
  if (!context.env.EVENT_RADAR_DB) return json({ message: "Base de dados ainda não ligada." }, 503);
  let payload;
  try { payload = await context.request.json(); } catch { return json({ message: "Pedido inválido." }, 400); }
  const id = text(payload.id, 80);
  const status = text(payload.status, 20);
  if (!id || !statuses.has(status)) return json({ message: "Pedido inválido." }, 400);
  const proposalTitle = text(payload.proposalTitle, 240);
  const proposalUrl = validUrl(text(payload.proposalUrl, 1600));
  if (payload.proposalUrl && !proposalUrl) return json({ message: "Indica uma ligação válida, começada por https://." }, 400);
  const applyToAgenda = payload.applyToAgenda === true;
  await ensureAutomationReviewStore(context.env.EVENT_RADAR_DB);
  const item = await context.env.EVENT_RADAR_DB.prepare(`
    SELECT category, event_id, target_kind, title FROM automation_reviews WHERE id = ?
  `).bind(id).first();
  if (!item) return json({ message: "Item não encontrado." }, 404);
  if (applyToAgenda) {
    if (item.category !== "link" || !item.event_id || !proposalUrl) {
      return json({ message: "Para aplicar à agenda, confirma primeiro um link direto e válido para este evento." }, 400);
    }
    await ensureEventStore(context.env.EVENT_RADAR_DB);
    await applyAgendaPatch(context.env.EVENT_RADAR_DB, item, proposalUrl, proposalTitle);
  }
  const result = await context.env.EVENT_RADAR_DB.prepare(`
    UPDATE automation_reviews
    SET status = ?, proposal_title = ?, proposal_url = ?, editor_note = ?,
        resolved_at = CASE WHEN ? IN ('resolved', 'ignored') THEN datetime('now') ELSE NULL END
    WHERE id = ?
  `).bind(
    status,
    proposalTitle || null,
    proposalUrl || null,
    text(payload.editorNote, 1500) || null,
    status,
    id
  ).run();
  if (!result.meta.changes) return json({ message: "Item não encontrado." }, 404);
  return json({ ok: true });
}

// Bulk review intentionally has two distinct modes. "resolve" only clears
// the visible queue; "apply-confirmed" changes the public agenda exclusively
// for link reviews that already carry a saved, valid confirmed URL.
export async function onRequestPost(context) {
  const session = await requireAdmin(context);
  if (session.response) return session.response;
  if (!context.env.EVENT_RADAR_DB) return json({ message: "Base de dados ainda não ligada." }, 503);
  let payload;
  try { payload = await context.request.json(); } catch { return json({ message: "Pedido inválido." }, 400); }
  const status = text(payload.status, 20);
  const action = text(payload.action, 32);
  if (!new Set(["new", "reviewing", "resolved"]).has(status) || !new Set(["resolve", "apply-confirmed"]).has(action) || (status === "resolved" && action !== "apply-confirmed")) {
    return json({ message: "Pedido inválido." }, 400);
  }
  await ensureAutomationReviewStore(context.env.EVENT_RADAR_DB);
  const { results = [] } = await context.env.EVENT_RADAR_DB.prepare(`
    SELECT id, category, event_id, target_kind, title, proposal_title, proposal_url
    FROM automation_reviews WHERE status = ? ORDER BY last_seen_at DESC LIMIT 1000
  `).bind(status).all();
  if (!results.length) return json({ ok: true, resolved: 0, applied: 0, skipped: 0 });

  if (action === "resolve") {
    await context.env.EVENT_RADAR_DB.batch(results.map(item => context.env.EVENT_RADAR_DB.prepare(`
      UPDATE automation_reviews SET status = 'resolved', resolved_at = datetime('now') WHERE id = ?
    `).bind(item.id)));
    return json({ ok: true, resolved: results.length, applied: 0, skipped: 0 });
  }

  const eligible = results.flatMap(item => {
    const proposalUrl = validUrl(item.proposal_url || "");
    return item.category === "link" && item.event_id && proposalUrl ? [{ item, proposalUrl }] : [];
  });
  if (!eligible.length) return json({ message: "Não há ligações confirmadas guardadas nesta fila para aplicar." }, 400);
  await ensureEventStore(context.env.EVENT_RADAR_DB);
  for (const { item, proposalUrl } of eligible) {
    await applyAgendaPatch(context.env.EVENT_RADAR_DB, item, proposalUrl, text(item.proposal_title, 240));
  }
  await context.env.EVENT_RADAR_DB.batch(eligible.map(({ item }) => context.env.EVENT_RADAR_DB.prepare(`
    UPDATE automation_reviews SET status = 'resolved', resolved_at = datetime('now') WHERE id = ?
  `).bind(item.id)));
  return json({ ok: true, resolved: eligible.length, applied: eligible.length, skipped: results.length - eligible.length });
}
