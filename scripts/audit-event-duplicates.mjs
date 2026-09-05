import fs from "node:fs";
import vm from "node:vm";
import { normaliseEventText } from "../functions/publication-readiness.js";

const context = { window: { EVENTS: [] } };
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("../events.js", import.meta.url), "utf8"), context, { timeout: 3_000 });

const events = context.window.EVENTS || [];
const mainEvents = events.filter(event => !event.seriesId);
const keyFor = event => [
  normaliseEventText(event.title),
  event.date || "",
  normaliseEventText(event.city),
  normaliseEventText(event.venue)
].join("|");
const groups = new Map();
for (const event of mainEvents) {
  const key = keyFor(event);
  if (!key.replaceAll("|", "")) continue;
  groups.set(key, [...(groups.get(key) || []), event]);
}
const duplicates = [...groups.values()]
  .filter(group => group.length > 1)
  .map(group => group.map(({ id, title, date, city, venue }) => ({ id, title, date, city, venue })));

console.log(JSON.stringify({ total: events.length, mainEvents: mainEvents.length, exactDuplicateGroups: duplicates }, null, 2));
if (duplicates.length) process.exitCode = 1;
