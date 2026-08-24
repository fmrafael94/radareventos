const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const statuses = new Set(["new", "reviewing", "published", "rejected", "closed"]);
const text = (value, limit) => typeof value === "string" ? value.trim().slice(0, limit) : "";

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
  const url = new URL(context.request.url);
  const status = statuses.has(url.searchParams.get("status")) ? url.searchParams.get("status") : "new";
  const { results } = await context.env.EVENT_RADAR_DB.prepare(`
    SELECT id, kind, event_name, event_date, city, official_url, poster_url,
      poster_object_key, poster_file_name, message, sender_name, sender_email,
      status, staff_note, created_at, reviewed_at
    FROM feedback WHERE status = ? ORDER BY created_at DESC LIMIT 100
  `).bind(status).all();
  return json({ items: results });
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
  const result = await context.env.EVENT_RADAR_DB.prepare(`
    UPDATE feedback SET status = ?, staff_note = ?, reviewed_at = datetime('now') WHERE id = ?
  `).bind(status, text(payload.staffNote, 1500) || null, id).run();
  if (!result.meta.changes) return json({ message: "Pedido não encontrado." }, 404);
  return json({ ok: true });
}
