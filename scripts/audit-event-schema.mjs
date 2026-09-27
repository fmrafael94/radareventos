#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "events.js"), "utf8"), context, { timeout: 3_000 });

const events = context.window.EVENTS || [];
const held = new Set(context.window.POSTER_PUBLICATION_HOLDS || []);
const editorial = context.window.EVENT_EDITORIAL_STATUS || {};
const today = process.argv.find(value => value.startsWith("--today="))?.split("=")[1] ||
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
const required = ["id", "title", "date", "time", "venue", "city", "district", "type", "tickets", "availability", "source", "sourceUrl", "verifiedAt"];
const hardFailures = [];
const warnings = [];
const ids = new Set();
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

const addFailure = (event, issue) => hardFailures.push({ id: event?.id || "unknown", issue });
const addWarning = (event, issue) => warnings.push({ id: event?.id || "unknown", issue });

for (const event of events) {
  if (!event || typeof event !== "object") {
    addFailure(event, "invalid_record");
    continue;
  }
  if (ids.has(event.id)) addFailure(event, "duplicate_id");
  ids.add(event.id);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(event.id || "")) addFailure(event, "invalid_id");
  if (!isoDate.test(event.date || "")) addFailure(event, "invalid_date");
  if (event.endDate && (!isoDate.test(event.endDate) || event.endDate < event.date)) addFailure(event, "invalid_end_date");
  if (event.verifiedAt && (!isoDate.test(event.verifiedAt) || event.verifiedAt > today)) addFailure(event, "invalid_verified_at");
  if (event.sourceUrl && !/^https:\/\//i.test(event.sourceUrl)) addFailure(event, "source_must_use_https");
  if (event.ticketUrl && !/^https:\/\//i.test(event.ticketUrl)) addFailure(event, "ticket_must_use_https");
  if (event.image && !/^(https:\/\/|\/)/i.test(event.image)) addFailure(event, "invalid_image_url");

  const futureMain = !event.seriesId && (event.endDate || event.date || "") >= today;
  if (futureMain && !held.has(event.id)) {
    for (const field of required) {
      if (!String(event[field] || "").trim()) addFailure(event, `missing_${field}`);
    }
    const verifiedAge = Math.floor((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${event.verifiedAt}T12:00:00Z`)) / 86_400_000);
    if (Number.isFinite(verifiedAge) && verifiedAge > 45) addWarning(event, `verification_is_${verifiedAge}_days_old`);
    if (/consultar|confirmar|não divulgado/i.test(event.time || "")) addWarning(event, "time_pending");
    if (/consultar|confirmar|não divulgado/i.test(event.age || "")) addWarning(event, "age_pending");
  }
}

for (const id of held) {
  if (!ids.has(id)) hardFailures.push({ id, issue: "hold_without_event" });
  if (!editorial[id]?.status || !editorial[id]?.reason) hardFailures.push({ id, issue: "hold_without_editorial_reason" });
}

const report = {
  generatedAt: new Date().toISOString(),
  today,
  events: events.length,
  futurePublic: events.filter(event => !event.seriesId && !held.has(event.id) && (event.endDate || event.date || "") >= today).length,
  hardFailures,
  warnings
};
fs.mkdirSync(path.join(root, "reports"), { recursive: true });
fs.writeFileSync(path.join(root, "reports", "event-schema-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  events: report.events,
  futurePublic: report.futurePublic,
  failures: hardFailures.length,
  warnings: warnings.length,
  hardFailures,
  warningSample: warnings.slice(0, 20)
}, null, 2));
if (hardFailures.length) process.exitCode = 1;
