import { canonicalEventFromReview, ensureEventStore } from "../../event-store.js";
import { requireAdmin } from "../../admin-auth.js";
import { sendFeedbackDecisionEmail } from "../../feedback-notification.js";

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

export async function onRequestGet(context) {
  const session = await requireAdmin(context);
  if (session.response) return session.response;
  if (!context.env.EVENT_RADAR_DB) return json({ message: "Base de dados ainda não ligada." }, 503);
  const url = new URL(context.request.url);
  const status = statuses.has(url.searchParams.get("status")) ? url.searchParams.get("status") : "new";
  const { results } = await context.env.EVENT_RADAR_DB.prepare(`
    SELECT id, kind, event_id, event_name, event_date, city, official_url, poster_url,
      poster_object_key, poster_file_name, image_moderation_status, image_moderation_reason, message, sender_name, sender_email,
      status, staff_note, created_at, reviewed_at
    FROM feedback WHERE status = ? ORDER BY created_at DESC LIMIT 100
  `).bind(status).all();
  return json({ items: results });
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
    SELECT id, kind, event_id, event_name, event_date, city, official_url, sender_name, sender_email, status
    FROM feedback WHERE id = ?
  `).bind(id).first();
  if (!feedback) return json({ message: "Pedido não encontrado." }, 404);

  const reviewValues = {
    eventName: text(payload.eventName, 180) || feedback.event_name || "",
    eventDate: text(payload.eventDate, 10) || feedback.event_date || "",
    city: text(payload.city, 100) || feedback.city || "",
    officialUrl: validUrl(text(payload.officialUrl, 1000) || feedback.official_url || "")
  };
  if (status === "published" && feedback.kind === "suggestion" && feedback.event_id !== "promoter-page") {
    if (!reviewValues.eventName || !/^\d{4}-\d{2}-\d{2}$/.test(reviewValues.eventDate) || !reviewValues.city || !reviewValues.officialUrl) {
      return json({ message: "Para publicar, confirma título, data, cidade e uma página oficial direta." }, 400);
    }
    await ensureEventStore(context.env.EVENT_RADAR_DB);
    const event = canonicalEventFromReview(feedback, reviewValues);
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
  }

  const result = await context.env.EVENT_RADAR_DB.prepare(`
    UPDATE feedback SET
      status = ?, staff_note = ?, event_name = ?, event_date = ?, city = ?, official_url = ?, reviewed_at = datetime('now')
    WHERE id = ?
  `).bind(
    status,
    text(payload.staffNote, 1500) || null,
    reviewValues.eventName || null,
    reviewValues.eventDate || null,
    reviewValues.city || null,
    reviewValues.officialUrl || null,
    id
  ).run();
  if (!result.meta.changes) return json({ message: "Pedido não encontrado." }, 404);
  const shouldNotify = feedback.status !== status && ["published", "rejected"].includes(status) && feedback.sender_email;
  const notification = shouldNotify
    ? await sendFeedbackDecisionEmail(context.env, { ...feedback, event_name: reviewValues.eventName || feedback.event_name }, status)
    : "not_needed";
  return json({ ok: true, notification });
}
