import { samePublishedEvent } from "./publication-readiness.js";

const field = (source, name) => source.match(new RegExp(`${name}:\\s*"((?:\\\\.|[^"\\\\])*)"`))?.[1]?.replace(/\\"/g, '"') || "";

// events.js is deliberately a static, offline-safe catalogue. We only extract
// the small identity subset here; no untrusted source is executed in the
// Worker. Daily programme children are omitted because they are not public
// agenda cards.
export function staticCatalogueIdentities(source = "") {
  const records = [];
  const pattern = /\{\s*id:\s*"([a-z0-9-]{1,180})"([\s\S]*?)\}(?=\s*,|\s*\))/gi;
  for (const match of source.matchAll(pattern)) {
    const body = match[0];
    if (/\bseriesId\s*:/i.test(body)) continue;
    const candidate = {
      id: match[1],
      title: field(body, "title"),
      date: field(body, "date"),
      city: field(body, "city"),
      venue: field(body, "venue"),
      sourceUrl: field(body, "sourceUrl"),
      tickets: field(body, "tickets"),
      image: field(body, "image")
    };
    if (candidate.title && candidate.date) records.push(candidate);
  }
  return records;
}

export function posterFromAppSource(source = "", id = "") {
  const escaped = String(id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp(`["']${escaped}["']\\s*:\\s*\\[\\s*["']([^"']+)`, "i"))?.[1] || "";
}

export async function staticCatalogueWithPosters(env, request) {
  if (!env.ASSETS) return [];
  try {
    const url = new URL(request.url);
    const asset = path => {
      const next = new URL(url);
      next.pathname = path;
      next.search = "";
      return env.ASSETS.fetch(new Request(next.toString()));
    };
    const [eventsResponse, appResponse] = await Promise.all([asset("/events.js"), asset("/app.js")]);
    if (!eventsResponse.ok) return [];
    const [eventsSource, appSource] = await Promise.all([eventsResponse.text(), appResponse.ok ? appResponse.text() : ""]);
    return staticCatalogueIdentities(eventsSource).map(event => ({ ...event, image: event.image || posterFromAppSource(appSource, event.id) }));
  } catch {
    return [];
  }
}

async function staticCatalogue(env, request) {
  return staticCatalogueWithPosters(env, request);
}

async function registryCatalogue(db) {
  const { results = [] } = await db.prepare(`
    SELECT id, payload_json FROM event_registry
    WHERE publication_status = 'published' AND origin_kind = 'official_source'
    LIMIT 500
  `).all();
  return results.flatMap(row => {
    try {
      const event = JSON.parse(row.payload_json);
      return event?.id && event?.title && event?.date ? [event] : [];
    } catch {
      return [];
    }
  });
}

export async function findPublishedDuplicates({ db, env, request, values, excludeId = "" }) {
  const [staticEvents, registryEvents] = await Promise.all([
    staticCatalogue(env, request),
    registryCatalogue(db)
  ]);
  return [...staticEvents, ...registryEvents]
    .filter(event => event.id !== excludeId && samePublishedEvent(values, event))
    .slice(0, 3)
    .map(event => ({ id: event.id, title: event.title, date: event.date, city: event.city, venue: event.venue }));
}
