import { requireAdmin } from "../../admin-auth.js";
import { ensureEventStore } from "../../event-store.js";
import { publicationChecklist, publishingReady, validHttpUrl, validIsoDate } from "../../publication-readiness.js";

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

const catalogueRecord = (id, literal) => {
  return {
    id,
    title: eventField(literal, "title") || id,
    date: eventField(literal, "date"),
    endDate: eventField(literal, "endDate"),
    city: eventField(literal, "city"),
    venue: eventField(literal, "venue"),
    tickets: eventField(literal, "tickets"),
    ticketUrl: eventField(literal, "ticketUrl"),
    image: eventField(literal, "image"),
    sourceUrl: eventField(literal, "sourceUrl")
  };
};

const catalogue = source => {
  const records = new Map([...source.matchAll(/\{\s*id:\s*"([a-z0-9-]{1,180})"[\s\S]*?\}(?=,|\))/gi)]
    .map(match => catalogueRecord(match[1], match[0]))
    .filter(item => item.title && !/\bseriesId:\s*"/i.test(eventLiteral(source, item.id)))
    .map(item => [item.id, item]));
  // Regex iteration skips an item after a nested programme object. Holds must
  // never disappear from moderation, so add each declared hold explicitly.
  for (const id of holdIds(source)) {
    if (!records.has(id)) records.set(id, catalogueRecord(id, eventLiteral(source, id)));
  }
  return [...records.values()];
};

const imageFromApp = (source, id) => {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp(`["']${escaped}["']\\s*:\\s*\\[\\s*["']([^"']+)`))?.[1] || "";
};

const sharedImageFromApp = (source, id) => {
  const block = source.match(/const sharedProgrammePosters = \{([\s\S]*?)\n\};/)?.[1] || "";
  for (const match of block.matchAll(/"([a-z0-9-]+)"\s*:\s*\[([^\]]*)\]/gi)) {
    const children = [...match[2].matchAll(/"([a-z0-9-]+)"/gi)].map(child => child[1]);
    if (children.includes(id)) return imageFromApp(source, match[1]);
  }
  return "";
};

// Some catalogue records are completed later in events.js with Object.assign.
// We only need the explicit image field, which appears before any nested
// programme data in that editorial update.
const imageFromCatalogueUpdate = (source, id) => {
  const start = source.indexOf(`"${id}": {`);
  if (start < 0) return "";
  return source.slice(start, start + 4_000).match(/\bimage:\s*"((?:\\.|[^"\\])*)"/)?.[1]?.replace(/\\"/g, '"') || "";
};

const valuesFor = (event, patch = {}, appSource = "", catalogueSource = "", held = false) => ({
  eventName: text(patch.title || event.title, 180),
  eventDate: text(patch.date || event.date, 10),
  eventEndDate: text(patch.endDate || event.endDate, 10),
  city: text(patch.city || event.city, 100),
  venue: text(patch.venue || event.venue, 180),
  tickets: text(patch.tickets || event.tickets, 220),
  ticketUrl: validHttpUrl(patch.ticketUrl || event.ticketUrl),
  posterUrl: held ? "" : validHttpUrl(patch.image || event.image || imageFromCatalogueUpdate(catalogueSource, event.id) || imageFromApp(appSource, event.id) || sharedImageFromApp(appSource, event.id)),
  officialUrl: validHttpUrl(patch.sourceUrl || event.sourceUrl)
});

async function publicationIssues(context) {
  const source = await assetText(context.request, context.env, "/events.js");
  const appSource = await assetText(context.request, context.env, "/app.js");
  const all = catalogue(source);
  const holds = new Set(holdIds(source));
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
  return all.flatMap(event => {
    const override = overrides.get(event.id);
    const held = holds.has(event.id);
    const values = valuesFor(event, override?.patch, appSource, source, held);
    const publication = { items: publicationChecklist(values), ready: publishingReady(values) && !held };
    return held || !publication.ready ? [{ ...event, values, publication, held }] : [];
  });
}

export async function onRequestGet(context) {
  const session = await requireAdmin(context);
  if (session.response) return session.response;
  if (!context.env.EVENT_RADAR_DB) return json({ message: "Base de dados ainda não ligada." }, 503);
  try {
    const items = await publicationIssues(context);
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
  if (!idPattern.test(id)) return json({ message: "Indica o evento a completar." }, 400);
  try {
    const source = await assetText(context.request, context.env, "/events.js");
    const appSource = await assetText(context.request, context.env, "/app.js");
    const event = catalogue(source).find(item => item.id === id);
    if (!event) return json({ message: "Este evento não pertence ao catálogo que pode ser completado aqui." }, 404);
    await ensureEventStore(context.env.EVENT_RADAR_DB);
    const existing = await context.env.EVENT_RADAR_DB.prepare("SELECT patch_json FROM event_overrides WHERE event_id = ?").bind(id).first();
    let previous = {};
    try { previous = JSON.parse(existing?.patch_json || "{}"); } catch { /* replace malformed legacy data */ }
    const held = new Set(holdIds(source)).has(id);
    const values = valuesFor(event, {
      ...previous,
      title: text(payload?.eventName, 180) || previous.title,
      date: validIsoDate(payload?.eventDate) ? payload.eventDate : previous.date,
      endDate: validIsoDate(payload?.eventEndDate) ? payload.eventEndDate : previous.endDate,
      city: text(payload?.city, 100) || previous.city,
      venue: text(payload?.venue, 180) || previous.venue,
      tickets: text(payload?.tickets, 220) || previous.tickets,
      ticketUrl: validHttpUrl(payload?.ticketUrl) || previous.ticketUrl,
      image: validHttpUrl(payload?.posterUrl) || previous.image,
      sourceUrl: validHttpUrl(payload?.officialUrl) || previous.sourceUrl
    }, appSource, source, false);
    if (!publishingReady(values)) return json({ message: "Completa título, data, cidade, local, bilheteira/entrada, cartaz oficial e página oficial antes de publicar." }, 400);
    const patch = {
      ...previous,
      title: values.eventName,
      date: values.eventDate,
      ...(values.eventEndDate ? { endDate: values.eventEndDate } : {}),
      city: values.city,
      venue: values.venue,
      tickets: values.tickets,
      ticketUrl: values.ticketUrl,
      image: values.posterUrl,
      sourceUrl: values.officialUrl,
      posterSourceUrl: values.officialUrl
    };
    await context.env.EVENT_RADAR_DB.prepare(`
      INSERT INTO event_overrides (event_id, patch_json, source_url, verified_at, updated_at)
      VALUES (?, ?, ?, date('now'), datetime('now'))
      ON CONFLICT(event_id) DO UPDATE SET
        patch_json = excluded.patch_json,
        source_url = excluded.source_url,
        verified_at = date('now'),
        updated_at = datetime('now')
    `).bind(id, JSON.stringify(patch), values.officialUrl).run();
    return json({ ok: true, id, message: held ? "Informação completa. O evento passa a estar disponível na agenda." : "Informação atualizada." });
  } catch {
    return json({ message: "Não foi possível guardar este cartaz." }, 503);
  }
}
