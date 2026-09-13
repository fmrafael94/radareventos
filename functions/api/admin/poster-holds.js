import { requireAdmin } from "../../admin-auth.js";
import { ensureEventStore } from "../../event-store.js";
import { validHttpUrl } from "../../publication-readiness.js";

const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const idPattern = /^[a-z0-9-]{1,180}$/i;
const text = (value, limit = 1600) => typeof value === "string" ? value.trim().slice(0, limit) : "";

const assetText = async (request, env, path) => {
  const url = new URL(request.url);
  url.pathname = path;
  url.search = "";
  const response = await env.ASSETS.fetch(new Request(url.toString()));
  if (!response.ok) throw new Error("Catálogo indisponível.");
  return response.text();
};

const holdIds = source => {
  const literal = source.match(/window\.POSTER_PUBLICATION_HOLDS\s*=\s*(\[[\s\S]*?\]);/i)?.[1];
  try {
    const ids = JSON.parse(literal || "[]");
    return Array.isArray(ids) ? ids.filter(id => typeof id === "string" && idPattern.test(id)) : [];
  } catch {
    return [];
  }
};

const eventLiteral = (source, id) => {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp(`\\{\\s*id:\\s*"${escaped}"[\\s\\S]*?\\}(?=,|\\))`))?.[0] || "";
};

const eventField = (literal, name) => literal.match(new RegExp(`${name}:\\s*"((?:\\\\.|[^"\\\\])*)"`))?.[1]?.replace(/\\"/g, '"') || "";

const catalogue = source => holdIds(source).map(id => {
  const literal = eventLiteral(source, id);
  return {
    id,
    title: eventField(literal, "title") || id,
    date: eventField(literal, "date"),
    endDate: eventField(literal, "endDate"),
    city: eventField(literal, "city"),
    venue: eventField(literal, "venue"),
    sourceUrl: eventField(literal, "sourceUrl")
  };
}).filter(item => item.title);

async function pendingHolds(context) {
  const source = await assetText(context.request, context.env, "/events.js");
  const all = catalogue(source);
  await ensureEventStore(context.env.EVENT_RADAR_DB);
  const { results = [] } = await context.env.EVENT_RADAR_DB.prepare("SELECT event_id, patch_json, source_url, updated_at FROM event_overrides").all();
  const overrides = new Map(results.flatMap(row => {
    try {
      const patch = JSON.parse(row.patch_json || "{}");
      return row.event_id ? [[row.event_id, { patch, sourceUrl: row.source_url || "", updatedAt: row.updated_at || "" }]] : [];
    } catch {
      return [];
    }
  }));
  return all.filter(item => !validHttpUrl(overrides.get(item.id)?.patch?.image));
}

export async function onRequestGet(context) {
  const session = await requireAdmin(context);
  if (session.response) return session.response;
  if (!context.env.EVENT_RADAR_DB) return json({ message: "Base de dados ainda não ligada." }, 503);
  try {
    const items = await pendingHolds(context);
    return json({ items, meta: { pending: items.length } });
  } catch {
    return json({ message: "Não foi possível ler os cartazes retidos." }, 503);
  }
}

export async function onRequestPost(context) {
  const session = await requireAdmin(context);
  if (session.response) return session.response;
  if (!context.env.EVENT_RADAR_DB) return json({ message: "Base de dados ainda não ligada." }, 503);
  let payload;
  try { payload = await context.request.json(); } catch { return json({ message: "Pedido inválido." }, 400); }
  const id = text(payload?.id, 180);
  const posterUrl = validHttpUrl(payload?.posterUrl);
  if (!idPattern.test(id) || !posterUrl) return json({ message: "Indica um evento e o link HTTPS/HTTP direto do cartaz oficial." }, 400);
  try {
    const source = await assetText(context.request, context.env, "/events.js");
    const event = catalogue(source).find(item => item.id === id);
    if (!event) return json({ message: "Este evento não está retido por falta de cartaz." }, 404);
    const sourceUrl = validHttpUrl(payload?.sourceUrl) || validHttpUrl(event.sourceUrl);
    if (!sourceUrl) return json({ message: "Indica também uma página oficial que confirme o cartaz." }, 400);
    await ensureEventStore(context.env.EVENT_RADAR_DB);
    const existing = await context.env.EVENT_RADAR_DB.prepare("SELECT patch_json FROM event_overrides WHERE event_id = ?").bind(id).first();
    let previous = {};
    try { previous = JSON.parse(existing?.patch_json || "{}"); } catch { /* replace malformed legacy data */ }
    const patch = { ...previous, image: posterUrl, posterSourceUrl: sourceUrl, sourceUrl };
    await context.env.EVENT_RADAR_DB.prepare(`
      INSERT INTO event_overrides (event_id, patch_json, source_url, verified_at, updated_at)
      VALUES (?, ?, ?, date('now'), datetime('now'))
      ON CONFLICT(event_id) DO UPDATE SET
        patch_json = excluded.patch_json,
        source_url = excluded.source_url,
        verified_at = date('now'),
        updated_at = datetime('now')
    `).bind(id, JSON.stringify(patch), sourceUrl).run();
    return json({ ok: true, id, message: "Cartaz guardado. O evento passa a estar disponível na agenda." });
  } catch {
    return json({ message: "Não foi possível guardar este cartaz." }, 503);
  }
}
