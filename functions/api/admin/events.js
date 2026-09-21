import { requireAdmin } from "../../admin-auth.js";
import { ensureEventStore } from "../../event-store.js";
import { publishingReady, validHttpUrl, validIsoDate, validPosterUrl } from "../../publication-readiness.js";

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
    return new Set(JSON.parse(literal || "[]"));
  } catch {
    return new Set();
  }
};

const eventField = (literal, name) => literal.match(new RegExp(`${name}:\\s*"((?:\\\\.|[^"\\\\])*)"`))?.[1]?.replace(/\\"/g, '"') || "";
const eventLiteral = (source, id) => {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp(`\\{\\s*id:\\s*"${escaped}"[\\s\\S]*?\\}(?=,|\\))`))?.[0] || "";
};
const catalogue = source => [...source.matchAll(/\{\s*id:\s*"([a-z0-9-]{1,180})"[^\n]*/gi)]
  .filter(match => !/\bseriesId:\s*"/i.test(match[0]))
  .map(match => {
    const literal = eventLiteral(source, match[1]) || match[0];
    return {
      id: match[1],
      title: eventField(literal, "title") || match[1],
      date: eventField(literal, "date"),
      endDate: eventField(literal, "endDate"),
      city: eventField(literal, "city"),
      venue: eventField(literal, "venue"),
      tickets: eventField(literal, "tickets"),
      ticketUrl: eventField(literal, "ticketUrl"),
      image: eventField(literal, "image"),
      sourceUrl: eventField(literal, "sourceUrl")
    };
  });

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
const imageFromCatalogueUpdate = (source, id) => {
  const start = source.indexOf(`"${id}": {`);
  if (start < 0) return "";
  return source.slice(start, start + 4_000).match(/\bimage:\s*"((?:\\.|[^"\\])*)"/)?.[1]?.replace(/\\"/g, '"') || "";
};

const parseJson = value => {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const valuesFromPayload = payload => ({
  eventName: text(payload?.eventName, 180),
  eventDate: text(payload?.eventDate, 10),
  eventEndDate: text(payload?.eventEndDate, 10),
  city: text(payload?.city, 100),
  venue: text(payload?.venue, 180),
  tickets: text(payload?.tickets, 220),
  ticketUrl: validHttpUrl(payload?.ticketUrl),
  posterUrl: validPosterUrl(payload?.posterUrl),
  officialUrl: validHttpUrl(payload?.officialUrl)
});

async function records(context) {
  const [source, appSource] = await Promise.all([
    assetText(context.request, context.env, "/events.js"),
    assetText(context.request, context.env, "/app.js")
  ]);
  const holds = holdIds(source);
  await ensureEventStore(context.env.EVENT_RADAR_DB);
  const [{ results: overrideRows = [] }, { results: registryRows = [] }] = await Promise.all([
    context.env.EVENT_RADAR_DB.prepare("SELECT event_id, patch_json, updated_at FROM event_overrides").all(),
    context.env.EVENT_RADAR_DB.prepare("SELECT id, payload_json, publication_status, updated_at FROM event_registry WHERE origin_kind = 'official_source'").all()
  ]);
  const overrides = new Map(overrideRows.map(row => [row.event_id, { patch: parseJson(row.patch_json), updatedAt: row.updated_at || "" }]));
  const staticItems = catalogue(source).flatMap(event => {
    const override = overrides.get(event.id);
    const patch = override?.patch || {};
    const merged = {
      ...event,
      image: event.image || imageFromCatalogueUpdate(source, event.id) || imageFromApp(appSource, event.id) || sharedImageFromApp(appSource, event.id),
      ...patch
    };
    let status = text(patch.publicationStatus, 30) || (holds.has(event.id) ? "poster_pending" : "published");
    if (status === "poster_pending" && publishingReady({
      eventName: merged.title,
      eventDate: merged.date,
      city: merged.city,
      venue: merged.venue,
      tickets: merged.tickets,
      posterUrl: merged.image,
      officialUrl: merged.sourceUrl
    })) status = "published";
    return status === "poster_pending" ? [] : [{ ...merged, publicationStatus: status, origin: "catalogue", updatedAt: override?.updatedAt || "" }];
  });
  const registryItems = registryRows.flatMap(row => {
    const event = parseJson(row.payload_json);
    if (!event.id) return [];
    const override = overrides.get(event.id);
    return [{ ...event, ...(override?.patch || {}), publicationStatus: row.publication_status, origin: "registry", updatedAt: override?.updatedAt || row.updated_at || "" }];
  });
  const unique = new Map([...staticItems, ...registryItems].map(item => [item.id, item]));
  return [...unique.values()];
}

export async function onRequestGet(context) {
  const session = await requireAdmin(context);
  if (session.response) return session.response;
  if (!context.env.EVENT_RADAR_DB) return json({ message: "Base de dados ainda não ligada." }, 503);
  try {
    const url = new URL(context.request.url);
    const status = url.searchParams.get("status") === "archived" ? "archived" : "published";
    const query = text(url.searchParams.get("q"), 100).toLocaleLowerCase("pt-PT");
    const items = (await records(context))
      .filter(item => item.publicationStatus === status)
      .filter(item => !query || [item.title, item.venue, item.city].some(value => String(value || "").toLocaleLowerCase("pt-PT").includes(query)))
      .sort((left, right) => String(left.date || "").localeCompare(String(right.date || "")) || String(left.title || "").localeCompare(String(right.title || ""), "pt"));
    return json({ items, meta: { total: items.length, status } });
  } catch {
    return json({ message: "Não foi possível carregar a agenda publicada." }, 503);
  }
}

export async function onRequestPatch(context) {
  const session = await requireAdmin(context);
  if (session.response) return session.response;
  if (!context.env.EVENT_RADAR_DB) return json({ message: "Base de dados ainda não ligada." }, 503);
  let payload;
  try { payload = await context.request.json(); } catch { return json({ message: "Pedido inválido." }, 400); }
  const id = text(payload?.id, 180);
  const action = text(payload?.action, 20) || "update";
  if (!idPattern.test(id) || !new Set(["update", "archive", "restore"]).has(action)) return json({ message: "Pedido inválido." }, 400);
  try {
    await ensureEventStore(context.env.EVENT_RADAR_DB);
    const source = await assetText(context.request, context.env, "/events.js");
    const staticEvent = catalogue(source).find(item => item.id === id);
    const registry = await context.env.EVENT_RADAR_DB.prepare("SELECT id, payload_json FROM event_registry WHERE id = ? AND origin_kind = 'official_source'").bind(id).first();
    if (!staticEvent && !registry) return json({ message: "Evento não encontrado." }, 404);
    const existing = await context.env.EVENT_RADAR_DB.prepare("SELECT patch_json FROM event_overrides WHERE event_id = ?").bind(id).first();
    const previous = parseJson(existing?.patch_json);
    if (action === "archive") {
      if (registry) {
        await context.env.EVENT_RADAR_DB.prepare("UPDATE event_registry SET publication_status = 'archived', updated_at = datetime('now') WHERE id = ?").bind(id).run();
      } else {
        const patch = { ...previous, publicationStatus: "archived" };
        await context.env.EVENT_RADAR_DB.prepare(`
          INSERT INTO event_overrides (event_id, patch_json, source_url, verified_at, updated_at)
          VALUES (?, ?, ?, date('now'), datetime('now'))
          ON CONFLICT(event_id) DO UPDATE SET patch_json = excluded.patch_json, updated_at = excluded.updated_at
        `).bind(id, JSON.stringify(patch), previous.sourceUrl || staticEvent.sourceUrl || null).run();
      }
      return json({ ok: true, message: "Evento arquivado. Deixou de aparecer na agenda pública." });
    }
    if (action === "restore") {
      if (registry) {
        await context.env.EVENT_RADAR_DB.prepare("UPDATE event_registry SET publication_status = 'published', updated_at = datetime('now') WHERE id = ?").bind(id).run();
      } else {
        const merged = { ...staticEvent, ...previous };
        const ready = publishingReady({
          eventName: merged.title,
          eventDate: merged.date,
          city: merged.city,
          venue: merged.venue,
          tickets: merged.tickets,
          posterUrl: merged.image,
          officialUrl: merged.sourceUrl
        });
        const returnToReview = holdIds(source).has(id) && !ready;
        const patch = { ...previous, publicationStatus: returnToReview ? "poster_pending" : "published" };
        await context.env.EVENT_RADAR_DB.prepare(`
          INSERT INTO event_overrides (event_id, patch_json, source_url, verified_at, updated_at)
          VALUES (?, ?, ?, date('now'), datetime('now'))
          ON CONFLICT(event_id) DO UPDATE SET patch_json = excluded.patch_json, updated_at = excluded.updated_at
        `).bind(id, JSON.stringify(patch), previous.sourceUrl || staticEvent.sourceUrl || null).run();
        if (returnToReview) return json({ ok: true, message: "Sugestão restaurada na fila de informação em falta." });
      }
      return json({ ok: true, message: "Evento restaurado na agenda." });
    }
    const values = valuesFromPayload(payload);
    if (!validIsoDate(values.eventDate) || (values.eventEndDate && !validIsoDate(values.eventEndDate)) || !publishingReady(values)) {
      return json({ message: "Completa título, data, cidade, local, bilheteira/entrada, cartaz oficial e página oficial antes de guardar." }, 400);
    }
    const patch = {
      ...previous,
      title: values.eventName,
      date: values.eventDate,
      ...(values.eventEndDate ? { endDate: values.eventEndDate } : { endDate: "" }),
      city: values.city,
      venue: values.venue,
      tickets: values.tickets,
      ticketUrl: values.ticketUrl,
      image: values.posterUrl,
      sourceUrl: values.officialUrl,
      posterSourceUrl: values.officialUrl,
      publicationStatus: "published"
    };
    await context.env.EVENT_RADAR_DB.prepare(`
      INSERT INTO event_overrides (event_id, patch_json, source_url, verified_at, updated_at)
      VALUES (?, ?, ?, date('now'), datetime('now'))
      ON CONFLICT(event_id) DO UPDATE SET patch_json = excluded.patch_json, source_url = excluded.source_url,
        verified_at = excluded.verified_at, updated_at = excluded.updated_at
    `).bind(id, JSON.stringify(patch), values.officialUrl).run();
    return json({ ok: true, message: "Alterações guardadas na agenda." });
  } catch {
    return json({ message: "Não foi possível atualizar este evento." }, 503);
  }
}
