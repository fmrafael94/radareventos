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
const childrenFor = event => events.filter(item => item.seriesId === event.id);
const issues = {
  noSource: [],
  noTicketState: [],
  noVisual: [],
  noProgramme: []
};

for (const event of events) {
  if (!event.sourceUrl) issues.noSource.push(event.id);
  if (!event.tickets && !event.availability) issues.noTicketState.push(event.id);
  if (!event.seriesId && !event.image && !mappedPosters[event.id]) issues.noVisual.push(event.id);
  if (event.type === "Festival" && event.endDate && !(event.programme?.length || childrenFor(event).length)) {
    issues.noProgramme.push(event.id);
  }
}

console.log(JSON.stringify({
  events: events.length,
  mainEvents: events.filter(event => !event.seriesId).length,
  ...Object.fromEntries(Object.entries(issues).map(([key, value]) => [key, { count: value.length, ids: value }]))
}, null, 2));

if (issues.noSource.length || issues.noTicketState.length || issues.noProgramme.length) process.exitCode = 1;
