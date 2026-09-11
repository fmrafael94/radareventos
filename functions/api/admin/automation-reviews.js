import { ensureAutomationReviewStore } from "../../automation-review-store.js";
import { ensureEventStore } from "../../event-store.js";
import { requireAdmin } from "../../admin-auth.js";
import { publicationChecklist, reviewValuesFrom, samePublishedEvent } from "../../publication-readiness.js";
import { staticCatalogueWithPosters } from "../../published-event-duplicates.js";

const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
// "applied" is a view of accepted signals with an agenda timestamp; it is
// deliberately not a second database status. That keeps automated rounds
// able to reopen a signal if its source changes later.
const statuses = new Set(["new", "reviewing", "resolved", "applied", "ignored"]);
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

function eventFallback(event = {}) {
  return {
    event_name: event.title,
    event_date: event.date,
    end_date: event.endDate,
    city: event.city,
    venue: event.venue,
    tickets: event.tickets,
    ticket_url: event.ticketUrl,
    poster_url: event.image,
    official_url: event.sourceUrl
  };
}

function editorialValues(event, reviewData = {}) {
  return reviewValuesFrom(reviewData, eventFallback(event));
}

function availabilityFromTickets(tickets) {
  if (/entrada\s+(?:livre|gratuita)/i.test(tickets)) return "Entrada livre";
  if (/confirmar|anunciar/i.test(tickets)) return "Por confirmar";
  return "Disponível";
}

async function applyAgendaPatch(db, item, values, proposalUrl = "") {
  const ticketUrl = values.ticketUrl || (item.target_kind === "Bilheteira" ? proposalUrl : "");
  const sourceUrl = values.officialUrl || (item.target_kind !== "Bilheteira" ? proposalUrl : "");
  const patch = {
    title: values.eventName,
    date: values.eventDate,
    city: values.city,
    venue: values.venue,
    tickets: values.tickets,
    image: values.posterUrl,
    sourceUrl,
    posterSourceUrl: sourceUrl,
    availability: availabilityFromTickets(values.tickets)
  };
  if (values.eventEndDate) patch.endDate = values.eventEndDate;
  if (ticketUrl) patch.ticketUrl = ticketUrl;
  await db.prepare(`
    INSERT INTO event_overrides (event_id, patch_json, source_url, verified_at, updated_at)
    VALUES (?, ?, ?, date('now'), datetime('now'))
    ON CONFLICT(event_id) DO UPDATE SET
      patch_json = json_patch(event_overrides.patch_json, excluded.patch_json),
      source_url = excluded.source_url,
      verified_at = date('now'),
      updated_at = datetime('now')
  `).bind(item.event_id, JSON.stringify(patch), sourceUrl || proposalUrl || null).run();
}

async function eventCatalogue(context) {
  const staticEvents = await staticCatalogueWithPosters(context.env, context.request);
  let published = [];
  let overrides = new Map();
  try {
    await ensureEventStore(context.env.EVENT_RADAR_DB);
    const { results = [] } = await context.env.EVENT_RADAR_DB.prepare(`
      SELECT id, payload_json FROM event_registry
      WHERE publication_status = 'published' AND origin_kind = 'official_source' LIMIT 500
    `).all();
    published = results.flatMap(row => {
      try { const event = JSON.parse(row.payload_json); return event?.id ? [event] : []; } catch { return []; }
    });
    const { results: overrideRows = [] } = await context.env.EVENT_RADAR_DB.prepare(`
      SELECT event_id, patch_json FROM event_overrides LIMIT 500
    `).all();
    overrides = new Map(overrideRows.flatMap(row => {
      try {
        const patch = JSON.parse(row.patch_json);
        return row.event_id && patch && typeof patch === "object" ? [[row.event_id, patch]] : [];
      } catch { return []; }
    }));
  } catch { /* Static catalogue remains a useful complete fallback. */ }
  return [...staticEvents, ...published].map(event => ({ ...event, ...(overrides.get(event.id) || {}) }));
}

function publicationForItem(catalogue, item) {
  const event = catalogue.find(candidate => candidate.id === item.event_id);
  if (!event) return null;
  const review = editorialValues(event, item.review_data);
  const values = {
    title: review.eventName,
    date: review.eventDate,
    city: review.city,
    venue: review.venue,
    image: review.posterUrl,
    tickets: review.tickets,
    sourceUrl: review.officialUrl
  };
  const duplicates = catalogue
    .filter(candidate => candidate.id !== event.id && samePublishedEvent(values, candidate))
    .slice(0, 3)
    .map(candidate => ({ id: candidate.id, title: candidate.title, date: candidate.date, city: candidate.city, venue: candidate.venue }));
  const items = publicationChecklist(values);
  return {
    event_snapshot: { id: event.id, title: review.eventName, date: review.eventDate, city: review.city, venue: review.venue },
    review_data: review,
    publication: { items, duplicate: duplicates, ready: !duplicates.length && items.every(check => check.present) }
  };
}

async function publicationSnapshots(context, items) {
  const catalogue = await eventCatalogue(context);
  return items.map(item => {
    const publication = publicationForItem(catalogue, item);
    if (!publication) return item;
    const values = {
      ...item,
      ...publication
    };
    return values;
  });
}

async function reviewDataByEvent(db, eventIds) {
  const ids = [...new Set(eventIds.filter(Boolean))];
  if (!ids.length) return new Map();
  const placeholders = ids.map(() => "?").join(", ");
  const { results = [] } = await db.prepare(`
    SELECT event_id, review_data_json FROM automation_event_edits
    WHERE event_id IN (${placeholders})
  `).bind(...ids).all();
  return new Map(results.flatMap(row => {
    try {
      const values = JSON.parse(row.review_data_json);
      return row.event_id && values && typeof values === "object" ? [[row.event_id, values]] : [];
    } catch { return []; }
  }));
}

async function saveReviewData(db, eventId, values) {
  if (!eventId) return;
  await db.prepare(`
    INSERT INTO automation_event_edits (event_id, review_data_json, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(event_id) DO UPDATE SET
      review_data_json = excluded.review_data_json,
      updated_at = datetime('now')
  `).bind(eventId, JSON.stringify(values)).run();
}

function itemWithReviewData(item, edits) {
  return { ...item, review_data: edits.get(item.event_id) || {} };
}

function agendaEligibility(catalogue, item) {
  if (item.category !== "link" || !item.event_id) {
    return { eligible: false, reason: "Este sinal não está associado a um evento da agenda." };
  }
  const snapshot = publicationForItem(catalogue, item);
  if (!snapshot) {
    return { eligible: false, reason: "Não foi possível encontrar este evento na agenda." };
  }
  if (snapshot.publication.duplicate.length) {
    return { eligible: false, reason: "Este evento parece duplicar uma entrada já publicada.", duplicate: true };
  }
  const missing = snapshot.publication.items.filter(check => !check.present).map(check => check.label);
  if (missing.length) {
    return { eligible: false, reason: `Falta: ${missing.join(", ")}.`, incomplete: true, missing };
  }
  return { eligible: true, snapshot };
}

export async function onRequestGet(context) {
  const session = await requireAdmin(context);
  if (session.response) return session.response;
  if (!context.env.EVENT_RADAR_DB) return json({ message: "Base de dados ainda não ligada." }, 503);
  await ensureAutomationReviewStore(context.env.EVENT_RADAR_DB);
  const url = new URL(context.request.url);
  const status = statuses.has(url.searchParams.get("status")) ? url.searchParams.get("status") : "new";
  const where = status === "applied"
    ? "status = 'resolved' AND applied_at IS NOT NULL"
    : status === "resolved"
      ? "status = 'resolved' AND applied_at IS NULL"
      : "status = ?";
  const statement = context.env.EVENT_RADAR_DB.prepare(`
    SELECT id, category, event_id, target_kind, title, detail, url, result, proposal_title,
      proposal_url, editor_note, status,
      first_seen_at, last_seen_at, resolved_at, applied_at
    FROM automation_reviews WHERE ${where}
    ORDER BY last_seen_at DESC LIMIT 1000
  `);
  const { results } = await (where === "status = ?" ? statement.bind(status) : statement).all();
  const rawItems = results || [];
  const edits = await reviewDataByEvent(context.env.EVENT_RADAR_DB, rawItems.map(item => item.event_id));
  const items = groupAutomationItems(rawItems).map(item => itemWithReviewData(item, edits));
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
  if (!id || !statuses.has(status) || status === "applied") return json({ message: "Pedido inválido." }, 400);
  const proposalTitle = text(payload.proposalTitle, 240);
  const proposalUrl = validUrl(text(payload.proposalUrl, 1600));
  if (payload.proposalUrl && !proposalUrl) return json({ message: "Indica uma ligação válida, começada por https://." }, 400);
  const applyToAgenda = payload.applyToAgenda === true;
  const hasEditorialPayload = ["eventName", "eventDate", "eventEndDate", "city", "venue", "tickets", "ticketUrl", "posterUrl", "officialUrl"]
    .some(key => Object.hasOwn(payload, key));
  await ensureAutomationReviewStore(context.env.EVENT_RADAR_DB);
  const item = await context.env.EVENT_RADAR_DB.prepare(`
    SELECT category, event_id, target_kind, title, proposal_url FROM automation_reviews WHERE id = ?
  `).bind(id).first();
  if (!item) return json({ message: "Item não encontrado." }, 404);
  const catalogue = await eventCatalogue(context);
  const event = catalogue.find(candidate => candidate.id === item.event_id);
  const edits = await reviewDataByEvent(context.env.EVENT_RADAR_DB, [item.event_id]);
  const savedReview = edits.get(item.event_id) || {};
  const reviewInput = hasEditorialPayload
    ? { ...savedReview, eventName: payload.eventName, eventDate: payload.eventDate, eventEndDate: payload.eventEndDate, city: payload.city, venue: payload.venue, tickets: payload.tickets, ticketUrl: payload.ticketUrl, posterUrl: payload.posterUrl, officialUrl: payload.officialUrl }
    : savedReview;
  const values = event ? editorialValues(event, reviewInput) : null;
  if (hasEditorialPayload && !event) return json({ message: "Só é possível completar dados num sinal associado a um evento existente." }, 400);
  if (hasEditorialPayload && values) await saveReviewData(context.env.EVENT_RADAR_DB, item.event_id, values);
  if (applyToAgenda) {
    const confirmedUrl = proposalUrl || values?.officialUrl || "";
    if (item.category !== "link" || !item.event_id || !confirmedUrl || !values) {
      return json({ message: "Para aplicar à agenda, confirma primeiro os dados do evento e uma página oficial válida." }, 400);
    }
    const eligibility = agendaEligibility(catalogue, { ...item, review_data: values });
    if (!eligibility.eligible) return json({ message: `Este evento não pode entrar ainda na agenda. ${eligibility.reason}` }, 400);
    await ensureEventStore(context.env.EVENT_RADAR_DB);
    await applyAgendaPatch(context.env.EVENT_RADAR_DB, item, values, confirmedUrl);
  }
  const result = await context.env.EVENT_RADAR_DB.prepare(`
    UPDATE automation_reviews
    SET status = ?, proposal_title = ?, proposal_url = ?, editor_note = ?,
        resolved_at = CASE WHEN ? IN ('resolved', 'ignored') THEN datetime('now') ELSE NULL END,
        applied_at = CASE
          WHEN ? = 1 THEN datetime('now')
          WHEN ? != 'resolved' THEN NULL
          ELSE applied_at
        END
    WHERE id = ?
  `).bind(
    status,
    proposalTitle || null,
    proposalUrl || null,
    text(payload.editorNote, 1500) || null,
    status,
    applyToAgenda ? 1 : 0,
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
  const where = status === "resolved" ? "status = 'resolved' AND applied_at IS NULL" : "status = ?";
  const statement = context.env.EVENT_RADAR_DB.prepare(`
    SELECT id, category, event_id, target_kind, title, proposal_title, proposal_url
    FROM automation_reviews WHERE ${where} ORDER BY last_seen_at DESC LIMIT 1000
  `);
  const { results = [] } = await (where === "status = ?" ? statement.bind(status) : statement).all();
  if (!results.length) return json({ ok: true, resolved: 0, applied: 0, skipped: 0 });

  if (action === "resolve") {
    await context.env.EVENT_RADAR_DB.batch(results.map(item => context.env.EVENT_RADAR_DB.prepare(`
      UPDATE automation_reviews SET status = 'resolved', resolved_at = datetime('now') WHERE id = ?
    `).bind(item.id)));
    return json({ ok: true, resolved: results.length, applied: 0, skipped: 0 });
  }

  const catalogue = await eventCatalogue(context);
  const edits = await reviewDataByEvent(context.env.EVENT_RADAR_DB, results.map(item => item.event_id));
  let incomplete = 0;
  let duplicates = 0;
  let skipped = 0;
  const eligible = results.flatMap(item => {
    const event = catalogue.find(candidate => candidate.id === item.event_id);
    const values = event ? editorialValues(event, edits.get(item.event_id) || {}) : null;
    const proposalUrl = validUrl(item.proposal_url || "") || values?.officialUrl || "";
    if (!proposalUrl) {
      skipped += 1;
      return [];
    }
    const eligibility = agendaEligibility(catalogue, { ...item, review_data: values || {} });
    if (!eligibility.eligible) {
      if (eligibility.duplicate) duplicates += 1;
      else if (eligibility.incomplete) incomplete += 1;
      else skipped += 1;
      return [];
    }
    return [{ item, proposalUrl, values }];
  });
  if (!eligible.length) return json({ ok: true, resolved: 0, applied: 0, incomplete, duplicates, skipped });
  await ensureEventStore(context.env.EVENT_RADAR_DB);
  for (const { item, proposalUrl, values } of eligible) {
    await applyAgendaPatch(context.env.EVENT_RADAR_DB, item, values, proposalUrl);
  }
  await context.env.EVENT_RADAR_DB.batch(eligible.map(({ item }) => context.env.EVENT_RADAR_DB.prepare(`
    UPDATE automation_reviews
    SET status = 'resolved', resolved_at = datetime('now'), applied_at = datetime('now')
    WHERE id = ?
  `).bind(item.id)));
  return json({ ok: true, resolved: eligible.length, applied: eligible.length, incomplete, duplicates, skipped });
}
