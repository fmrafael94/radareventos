import fs from "node:fs";
import vm from "node:vm";

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("../events.js", import.meta.url), "utf8"), context);

const appSource = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const posterLiteral = appSource.match(/const officialPosters = \{[\s\S]*?\n\};/)?.[0]
  ?.replace(/^const officialPosters = /, "")
  .replace(/;$/, "");
const mappedPosters = posterLiteral ? vm.runInNewContext(`(${posterLiteral})`) : {};
const events = context.window.EVENTS || [];
const posterPublicationHolds = new Set(context.window.POSTER_PUBLICATION_HOLDS || []);
const editorialStatus = context.window.EVENT_EDITORIAL_STATUS || {};
const today = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit"
}).format(new Date());
const childrenFor = event => events.filter(item => item.seriesId === event.id);
const issues = {
  noSource: [],
  noTicketState: [],
  noVisual: [],
  posterPending: [],
  noProgramme: []
};
const editorialQueue = { actionable: [], expired: [], archived: [], dateUnverified: [] };

for (const event of events) {
  if (!event.sourceUrl) issues.noSource.push(event.id);
  if (!event.tickets && !event.availability) issues.noTicketState.push(event.id);
  if (!event.seriesId && !event.image && !mappedPosters[event.id]) {
    (posterPublicationHolds.has(event.id) ? issues.posterPending : issues.noVisual).push(event.id);
  }
  if (!event.seriesId && posterPublicationHolds.has(event.id) && !issues.posterPending.includes(event.id)) issues.posterPending.push(event.id);
  if (event.type === "Festival" && event.endDate && !(event.programme?.length || childrenFor(event).length)) {
    issues.noProgramme.push(event.id);
  }
}

for (const id of posterPublicationHolds) {
  const event = events.find(item => item.id === id);
  const status = editorialStatus[id]?.status || "missing_poster";
  const row = {
    id,
    title: event?.title || id,
    date: event?.date || "",
    status,
    reason: editorialStatus[id]?.reason || "Cartaz oficial em falta"
  };
  if (status === "archived_source") editorialQueue.archived.push(row);
  else if (status === "date_unverified") editorialQueue.dateUnverified.push(row);
  else if (status === "expired_unresolved" || (event?.endDate || event?.date || "") < today) editorialQueue.expired.push(row);
  else editorialQueue.actionable.push(row);
}

console.log(JSON.stringify({
  events: events.length,
  mainEvents: events.filter(event => !event.seriesId).length,
  today,
  editorialQueue,
  ...Object.fromEntries(Object.entries(issues).map(([key, value]) => [key, { count: value.length, ids: value }]))
}, null, 2));

// A record with no cartaz must explicitly be on hold. This makes a new
// incomplete event fail the audit instead of silently reaching the public UI.
if (issues.noSource.length || issues.noTicketState.length || issues.noVisual.length || issues.noProgramme.length) process.exitCode = 1;
