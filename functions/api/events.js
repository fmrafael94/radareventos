import { ensureEventStore } from "../event-store.js";

const json = (body, status = 200) => Response.json(body, {
  status,
  headers: { "Cache-Control": "public, max-age=60" }
});

// This endpoint exposes only records that passed the private review workflow.
// A public form submission is never returned by itself.
export async function onRequestGet(context) {
  if (!context.env.EVENT_RADAR_DB) return json({ items: [] });
  await ensureEventStore(context.env.EVENT_RADAR_DB);
  const { results } = await context.env.EVENT_RADAR_DB.prepare(`
    SELECT payload_json FROM event_registry
    WHERE publication_status = 'published' AND origin_kind = 'official_source'
    ORDER BY json_extract(payload_json, '$.date') ASC
    LIMIT 500
  `).all();
  const items = results.flatMap(row => {
    try {
      const event = JSON.parse(row.payload_json);
      return event?.id && event?.title && event?.date && event?.sourceUrl ? [event] : [];
    } catch {
      return [];
    }
  });
  const { results: overrideRows } = await context.env.EVENT_RADAR_DB.prepare(`
    SELECT event_id, patch_json FROM event_overrides
    ORDER BY updated_at DESC LIMIT 500
  `).all();
  const overrides = overrideRows.flatMap(row => {
    try {
      const patch = JSON.parse(row.patch_json);
      return row.event_id && patch && typeof patch === "object" ? [{ id: row.event_id, patch }] : [];
    } catch {
      return [];
    }
  });
  return json({ items, overrides });
}
