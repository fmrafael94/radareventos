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
      sourceUrl: field(body, "sourceUrl")
    };
    if (candidate.title && candidate.date) records.push(candidate);
  }
  return records;
}

async function staticCatalogue(env, request) {
  if (!env.ASSETS) return [];
  try {
    const url = new URL(request.url);
    url.pathname = "/events.js";
    url.search = "";
    const response = await env.ASSETS.fetch(new Request(url.toString()));
    return response.ok ? staticCatalogueIdentities(await response.text()) : [];
  } catch {
    return [];
  }
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
