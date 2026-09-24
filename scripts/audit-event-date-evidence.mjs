#!/usr/bin/env node

/*
 * Checks that future public events have evidence for the advertised year/date.
 * This is deliberately stricter than the link audit: a reachable archive page
 * is not proof that an event belongs to the current season.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const remote = process.argv.includes("--remote");
const today = process.argv.find(value => value.startsWith("--today="))?.split("=")[1] ||
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const months = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const stopWords = new Set(["festival", "concerto", "tour", "live", "edition", "edicao", "music", "musica", "the", "and", "com", "para", "uma", "2026", "2027"]);

const normalise = value => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-PT")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const titleTokens = title => [...new Set(normalise(title).split(/\s+/)
  .filter(token => token.length >= 4 && !stopWords.has(token)))].slice(0, 5);

const isGenericSource = value => {
  try {
    const url = new URL(value);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    return pathname === "/" || /^\/(agenda|eventos|events|musica|programacao)$/i.test(pathname);
  } catch {
    return true;
  }
};

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "events.js"), "utf8"), context, { timeout: 3_000 });
const events = (context.window.EVENTS || []).filter(event =>
  !event.seriesId && event.publicationStatus === "published" && (event.endDate || event.date || "") >= today
);
const manualEvidence = context.window.EVENT_DATE_EVIDENCE_OVERRIDES || {};

const base = events.map(event => ({
  id: event.id,
  title: event.title,
  date: event.date,
  endDate: event.endDate || "",
  city: event.city,
  sourceUrl: event.sourceUrl || "",
  verifiedAt: event.verifiedAt || "",
  genericSource: isGenericSource(event.sourceUrl),
  manualEvidence: manualEvidence[event.id] || null
}));

if (!remote) {
  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    today,
    futurePublished: base.length,
    genericSources: base.filter(item => item.genericSource)
  }, null, 2));
  process.exit(0);
}

const cache = new Map();
async function fetchPage(url) {
  if (cache.has(url)) return cache.get(url);
  const promise = (async () => {
    if (/instagram\.com/i.test(url)) return { manual: true, reason: "instagram_requires_visual_check" };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": "Desvio-Date-Evidence-Audit/1.0 (+https://odesvio.pt)" }
      });
      const type = response.headers.get("content-type") || "";
      if (!response.ok || !type.includes("text/html")) return { ok: false, status: response.status, type };
      const html = await response.text();
      const text = normalise(html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " "));
      return { ok: true, status: response.status, finalUrl: response.url, text };
    } catch (error) {
      return { ok: false, error: error.name === "AbortError" ? "timeout" : error.message };
    } finally {
      clearTimeout(timeout);
    }
  })();
  cache.set(url, promise);
  return promise;
}

const results = [];
let cursor = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (cursor < base.length) {
    const item = base[cursor++];
    const page = await fetchPage(item.sourceUrl);
    if (page.manual || !page.ok) {
      results.push({ ...item, ...page, yearEvidence: false, dateEvidence: false, titleEvidence: false });
      continue;
    }
    const year = item.date.slice(0, 4);
    const monthIndex = Number(item.date.slice(5, 7)) - 1;
    const day = String(Number(item.date.slice(8, 10)));
    const dayPadded = item.date.slice(8, 10);
    const monthPadded = item.date.slice(5, 7);
    const urlText = normalise(page.finalUrl || item.sourceUrl);
    const pageAndUrl = `${page.text} ${urlText}`;
    const tokens = titleTokens(item.title);
    const matchedTokens = tokens.filter(token => page.text.includes(token));
    results.push({
      ...item,
      ok: true,
      status: page.status,
      finalUrl: page.finalUrl,
      yearEvidence: pageAndUrl.includes(year),
      dateEvidence: page.text.includes(`${day} ${months[monthIndex]}`) ||
        page.text.includes(`${day} ${months[monthIndex].slice(0, 3)}`) ||
        page.text.includes(`${dayPadded} ${monthPadded} ${year}`) ||
        page.text.includes(`${dayPadded} ${monthPadded} ${year.slice(2)}`) ||
        page.text.includes(normalise(item.date)),
      titleEvidence: tokens.length === 0 || matchedTokens.length >= Math.min(2, tokens.length),
      matchedTitleTokens: matchedTokens
    });
  }
}));

results.sort((left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title, "pt"));
// Exact date strings are useful evidence but too many official sites render
// them client-side or in machine-readable attributes. A record is escalated
// when the page is generic/manual, unreachable, lacks the advertised year or
// does not contain enough of the event title. `dateEvidence` remains in the
// report so the editor can prioritise the weakest records.
const needsReview = results.filter(item => !item.manualEvidence && (
  item.manual || !item.ok || !item.yearEvidence || !item.titleEvidence || (item.genericSource && !item.dateEvidence)
));
const report = {
  generatedAt: new Date().toISOString(),
  today,
  checked: results.length,
  manuallyVerifiedCount: results.filter(item => item.manualEvidence).length,
  needsReviewCount: needsReview.length,
  needsReview,
  results
};
fs.mkdirSync(path.join(root, "reports"), { recursive: true });
fs.writeFileSync(path.join(root, "reports", "event-date-evidence-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  generatedAt: report.generatedAt,
  today,
  checked: report.checked,
  needsReviewCount: report.needsReviewCount,
  needsReview
}, null, 2));

if (needsReview.length) process.exitCode = 1;
