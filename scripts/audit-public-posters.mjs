import fs from "node:fs";
import vm from "node:vm";

const remote = process.argv.includes("--remote");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("../events.js", import.meta.url), "utf8"), context);

const appSource = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const posterLiteral = appSource.match(/const officialPosters = \{[\s\S]*?\n\};/)?.[0]
  ?.replace(/^const officialPosters = /, "")
  .replace(/;$/, "");
const mappedPosters = posterLiteral ? vm.runInNewContext(`(${posterLiteral})`) : {};
const held = new Set(context.window.POSTER_PUBLICATION_HOLDS || []);
const events = context.window.EVENTS || [];

const candidateEvents = events
  .filter(event => !event.seriesId && !held.has(event.id))
  .map(event => ({ id: event.id, title: event.title, poster: mappedPosters[event.id]?.[0] || event.image || "" }))
  .filter(event => event.poster);

if (!remote) {
  console.log(JSON.stringify({ candidates: candidateEvents.length, held: [...held] }, null, 2));
  process.exit(0);
}

const origin = process.env.DESVIO_ORIGIN || "https://odesvio.pt";
const failures = [];
const redirected = [];
let cursor = 0;
async function check(event) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${origin}/api/event-poster/${encodeURIComponent(event.id)}?audit=1`, {
      redirect: "manual",
      signal: controller.signal
    });
    const type = response.headers.get("content-type") || "";
    if (response.status === 302 && response.headers.get("location")) {
      redirected.push({ id: event.id, title: event.title });
      return;
    }
    if (!response.ok || !type.startsWith("image/")) {
      failures.push({ id: event.id, title: event.title, status: response.status, type });
    }
  } catch (error) {
    failures.push({ id: event.id, title: event.title, status: "network", type: error.name || "error" });
  } finally {
    clearTimeout(timeout);
  }
}

await Promise.all(Array.from({ length: Math.min(12, candidateEvents.length) }, async () => {
  while (cursor < candidateEvents.length) {
    const event = candidateEvents[cursor++];
    await check(event);
  }
}));

console.log(JSON.stringify({
  checked: candidateEvents.length,
  ok: candidateEvents.length - failures.length,
  redirected: redirected.length,
  redirectedIds: redirected,
  failures
}, null, 2));

if (failures.length) process.exitCode = 1;
