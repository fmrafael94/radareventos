import { ensureAutomationReviewStore } from "../../automation-review-store.js";
import { ensureEventStore } from "../../event-store.js";

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

function accessRequired(context) {
  if (!context.request.headers.get("Cf-Access-Jwt-Assertion")) {
    return json({ message: "Esta área só pode ser usada através do acesso privado configurado no Cloudflare." }, 403);
  }
  return null;
}

export async function onRequestGet(context) {
  const denied = accessRequired(context);
  if (denied) return denied;
  if (!context.env.EVENT_RADAR_DB) return json({ message: "Base de dados ainda não ligada." }, 503);
  await ensureAutomationReviewStore(context.env.EVENT_RADAR_DB);
  const url = new URL(context.request.url);
  const status = statuses.has(url.searchParams.get("status")) ? url.searchParams.get("status") : "new";
  const { results } = await context.env.EVENT_RADAR_DB.prepare(`
    SELECT id, category, event_id, target_kind, title, detail, url, result, proposal_title,
      proposal_url, editor_note, status,
      first_seen_at, last_seen_at, resolved_at
    FROM automation_reviews WHERE status = ?
    ORDER BY last_seen_at DESC LIMIT 250
  `).bind(status).all();
  return json({ items: results || [] });
}

export async function onRequestPatch(context) {
  const denied = accessRequired(context);
  if (denied) return denied;
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
    const patch = item.target_kind === "Bilheteira"
      ? { ticketUrl: proposalUrl, tickets: "Consultar bilheteira oficial", availability: "Bilhetes a confirmar" }
      : { sourceUrl: proposalUrl };
    if (proposalTitle && proposalTitle !== item.title) patch.title = proposalTitle;
    await ensureEventStore(context.env.EVENT_RADAR_DB);
    await context.env.EVENT_RADAR_DB.prepare(`
      INSERT INTO event_overrides (event_id, patch_json, source_url, verified_at, updated_at)
      VALUES (?, ?, ?, date('now'), datetime('now'))
      ON CONFLICT(event_id) DO UPDATE SET
        patch_json = json_patch(event_overrides.patch_json, excluded.patch_json),
        source_url = excluded.source_url,
        verified_at = date('now'),
        updated_at = datetime('now')
    `).bind(item.event_id, JSON.stringify(patch), proposalUrl).run();
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
