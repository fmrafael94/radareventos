import { canonicalEventFromReview, ensureEventStore } from "../../event-store.js";
import { requireAdmin } from "../../admin-auth.js";
import { sendFeedbackDecisionEmail } from "../../feedback-notification.js";
import { publicationChecklist, publishingReady, reviewValuesFrom } from "../../publication-readiness.js";
import { findPublishedDuplicates } from "../../published-event-duplicates.js";

const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const statuses = new Set(["new", "reviewing", "published", "rejected", "closed"]);
const text = (value, limit) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const validUrl = value => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};

const parseReviewData = (raw, fallback = {}) => {
  try { return reviewValuesFrom(JSON.parse(raw || "{}"), fallback); } catch { return reviewValuesFrom({}, fallback); }
};
const checklistState = (values, duplicate = []) => ({
  items: publicationChecklist(values),
  duplicate,
  ready: publishingReady(values) && !duplicate.length
});

async function publishReview(context, feedback, values) {
  if (!publishingReady(values)) return { error: "Para publicar, confirma título, data, cidade, local, cartaz, bilheteira/entrada e uma página oficial direta." };
  const eventId = `community-${feedback.id}`;
  const duplicates = await findPublishedDuplicates({
    db: context.env.EVENT_RADAR_DB,
    env: context.env,
    request: context.request,
    values,
    excludeId: eventId
  });
  if (duplicates.length) return { error: `Este evento já existe na agenda: ${duplicates[0].title} (${duplicates[0].date}).`, duplicate: duplicates };
  await ensureEventStore(context.env.EVENT_RADAR_DB);
  const event = canonicalEventFromReview(feedback, values);
  await context.env.EVENT_RADAR_DB.prepare(`
    INSERT INTO event_registry (
      id, payload_json, origin_kind, source_url, ticket_url,
      source_verified_at, publication_status, next_audit_at, created_at, updated_at
    ) VALUES (?, ?, 'official_source', ?, ?, date('now'), 'published', datetime('now', '+2 hours'), datetime('now'), datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      payload_json = excluded.payload_json,
      source_url = excluded.source_url,
      ticket_url = excluded.ticket_url,
      source_verified_at = excluded.source_verified_at,
      publication_status = 'published',
      next_audit_at = datetime('now', '+2 hours'),
      updated_at = datetime('now')
  `).bind(event.id, JSON.stringify(event), event.sourceUrl, event.ticketUrl).run();
  return { event };
}

// Corrections are attached to an existing agenda entry, so publishing one
// should update that entry rather than creating a second copy. It is still
// held behind the exact same completeness gate as a new suggestion.
async function applyCorrection(context, feedback, values) {
  if (!feedback.event_id || feedback.event_id === "promoter-page") {
    return { error: "Esta correção não está associada a um evento da agenda." };
  }
  if (!publishingReady(values)) {
    return { error: "Para aplicar a correção, confirma título, data, cidade, local, cartaz, bilheteira/entrada e uma página oficial direta." };
  }
  const patch = {
    title: values.eventName,
    date: values.eventDate,
    city: values.city,
    venue: values.venue,
    tickets: values.tickets,
    ticketUrl: values.ticketUrl,
    image: values.posterUrl,
    sourceUrl: values.officialUrl,
    posterSourceUrl: values.officialUrl,
    availability: /entrada\s+(?:livre|gratuita)/i.test(values.tickets) ? "Entrada livre" : /confirmar|anunciar/i.test(values.tickets) ? "Por confirmar" : "Disponível"
  };
  if (values.eventEndDate) patch.endDate = values.eventEndDate;
  await ensureEventStore(context.env.EVENT_RADAR_DB);
  await context.env.EVENT_RADAR_DB.prepare(`
    INSERT INTO event_overrides (event_id, patch_json, source_url, verified_at, updated_at)
    VALUES (?, ?, ?, date('now'), datetime('now'))
    ON CONFLICT(event_id) DO UPDATE SET
      patch_json = json_patch(event_overrides.patch_json, excluded.patch_json),
      source_url = excluded.source_url,
      verified_at = date('now'),
      updated_at = datetime('now')
  `).bind(feedback.event_id, JSON.stringify(patch), values.officialUrl).run();
  return { patch };
}

export async function onRequestGet(context) {
  const session = await requireAdmin(context);
  if (session.response) return session.response;
  if (!context.env.EVENT_RADAR_DB) return json({ message: "Base de dados ainda não ligada." }, 503);
  const url = new URL(context.request.url);
  const status = statuses.has(url.searchParams.get("status")) ? url.searchParams.get("status") : "new";
  const { results } = await context.env.EVENT_RADAR_DB.prepare(`
    SELECT id, kind, event_id, event_name, event_date, city, official_url, poster_url,
      poster_object_key, poster_file_name, image_moderation_status, image_moderation_reason, message, sender_name, sender_email, review_data_json,
      status, staff_note, created_at, reviewed_at
    FROM feedback WHERE status = ? ORDER BY created_at DESC LIMIT 100
  `).bind(status).all();
  return json({ items: (results || []).map(item => {
    const values = parseReviewData(item.review_data_json, item);
    return { ...item, review_data: values, publication: checklistState(values) };
  }) });
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

  const feedback = await context.env.EVENT_RADAR_DB.prepare(`
    SELECT id, kind, event_id, event_name, event_date, city, official_url, poster_url, poster_object_key, sender_name, sender_email, status, review_data_json
    FROM feedback WHERE id = ?
  `).bind(id).first();
  if (!feedback) return json({ message: "Pedido não encontrado." }, 404);

  const previousValues = parseReviewData(feedback.review_data_json, feedback);
  const reviewValues = reviewValuesFrom({
    eventName: text(payload.eventName, 180) || previousValues.eventName,
    eventDate: text(payload.eventDate, 10) || previousValues.eventDate,
    eventEndDate: text(payload.eventEndDate, 10) || previousValues.eventEndDate,
    city: text(payload.city, 100) || previousValues.city,
    venue: text(payload.venue, 180) || previousValues.venue,
    tickets: text(payload.tickets, 220) || previousValues.tickets,
    ticketUrl: validUrl(text(payload.ticketUrl, 1000)) || previousValues.ticketUrl,
    posterUrl: validUrl(text(payload.posterUrl, 1000)) || previousValues.posterUrl,
    officialUrl: validUrl(text(payload.officialUrl, 1000)) || previousValues.officialUrl
  }, feedback);
  if (status === "published" && feedback.kind === "suggestion" && feedback.event_id !== "promoter-page") {
    const published = await publishReview(context, feedback, reviewValues);
    if (published.error) return json({ message: published.error, publication: checklistState(reviewValues, published.duplicate || []) }, published.duplicate ? 409 : 400);
  }
  if (status === "published" && feedback.kind === "correction") {
    const corrected = await applyCorrection(context, feedback, reviewValues);
    if (corrected.error) return json({ message: corrected.error, publication: checklistState(reviewValues) }, 400);
  }

  const result = await context.env.EVENT_RADAR_DB.prepare(`
    UPDATE feedback SET
      status = ?, staff_note = ?, event_name = ?, event_date = ?, city = ?, official_url = ?, review_data_json = ?, reviewed_at = datetime('now')
    WHERE id = ?
  `).bind(
    status,
    text(payload.staffNote, 1500) || null,
    reviewValues.eventName || null,
    reviewValues.eventDate || null,
    reviewValues.city || null,
    reviewValues.officialUrl || null,
    JSON.stringify(reviewValues),
    id
  ).run();
  if (!result.meta.changes) return json({ message: "Pedido não encontrado." }, 404);
  const shouldNotify = feedback.status !== status && ["published", "rejected"].includes(status) && feedback.sender_email;
  const notification = shouldNotify
    ? await sendFeedbackDecisionEmail(context.env, { ...feedback, event_name: reviewValues.eventName || feedback.event_name }, status)
    : "not_needed";
  return json({ ok: true, notification, publication: checklistState(reviewValues) });
}

// A bulk publication is deliberately narrower than "accept all": it only
// touches suggestions whose saved editorial checklist is complete and which
// do not match a public event. Everything else stays in the queue with no
// loss of the editor's notes.
export async function onRequestPostBulk(context) {
  const session = await requireAdmin(context, { ownerOnly: true });
  if (session.response) return session.response;
  if (!context.env.EVENT_RADAR_DB) return json({ message: "Base de dados ainda não ligada." }, 503);
  let payload;
  try { payload = await context.request.json(); } catch { return json({ message: "Pedido inválido." }, 400); }
  const status = text(payload.status, 20);
  if (payload.action !== "publish-ready" || !new Set(["new", "reviewing"]).has(status)) return json({ message: "Pedido inválido." }, 400);
  const { results = [] } = await context.env.EVENT_RADAR_DB.prepare(`
    SELECT id, kind, event_id, event_name, event_date, city, official_url, poster_url,
      sender_name, sender_email, review_data_json, status
    FROM feedback
    WHERE status = ? AND kind = 'suggestion' AND (event_id IS NULL OR event_id != 'promoter-page')
    ORDER BY created_at ASC LIMIT 100
  `).bind(status).all();
  if (!results.length) return json({ ok: true, published: 0, incomplete: 0, duplicates: 0, notifications: 0 });

  let published = 0;
  let incomplete = 0;
  let duplicates = 0;
  let notifications = 0;
  const batchKeys = [];
  for (const feedback of results) {
    const values = parseReviewData(feedback.review_data_json, feedback);
    if (!publishingReady(values)) { incomplete += 1; continue; }
    // Catch copies inside the same bulk action before their registry writes
    // become visible to a subsequent query.
    const fingerprint = [values.eventName, values.eventDate, values.city, values.venue].map(value => String(value || "").toLocaleLowerCase()).join("|");
    if (batchKeys.includes(fingerprint)) { duplicates += 1; continue; }
    const outcome = await publishReview(context, feedback, values);
    if (outcome.duplicate) { duplicates += 1; continue; }
    if (outcome.error) { incomplete += 1; continue; }
    batchKeys.push(fingerprint);
    await context.env.EVENT_RADAR_DB.prepare(`
      UPDATE feedback
      SET status = 'published', event_name = ?, event_date = ?, city = ?, official_url = ?, review_data_json = ?, reviewed_at = datetime('now')
      WHERE id = ?
    `).bind(values.eventName, values.eventDate, values.city, values.officialUrl, JSON.stringify(values), feedback.id).run();
    published += 1;
    if (feedback.sender_email) {
      const notification = await sendFeedbackDecisionEmail(context.env, { ...feedback, event_name: values.eventName }, "published");
      if (notification === "sent") notifications += 1;
    }
  }
  return json({ ok: true, published, incomplete, duplicates, notifications });
}
