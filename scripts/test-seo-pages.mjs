import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import worker, { landingRoutes, publicEventRecords } from "../src/worker.js";

const root = new URL("../", import.meta.url);
const source = await readFile(new URL("events.js", root), "utf8");
const today = "2026-09-21";

test("builds useful location, time, price and genre pages", () => {
  const routes = landingRoutes(source, today);
  const paths = new Set(routes.map(route => route.path));
  for (const path of [
    "/concertos",
    "/concertos/lisboa",
    "/concertos/porto",
    "/concertos-este-fim-de-semana",
    "/concertos-gratis",
    "/festivais/2026",
    "/metal/portugal",
    "/rock/portugal",
    "/concertos/distrito/lisboa"
  ]) assert.ok(paths.has(path), `missing ${path}`);
  assert.equal(routes.length, paths.size, "landing routes must be unique");
});

test("only publishes current main events in landing pages", () => {
  const events = publicEventRecords(source, today);
  assert.ok(events.length > 100);
  assert.ok(events.every(event => (event.endDate || event.date) >= today));
  assert.ok(events.every(event => event.title && event.city && event.venue));
});

const assets = {
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    const file = pathname === "/" ? "index.html" : pathname.slice(1);
    try {
      const body = await readFile(new URL(file, root));
      return new Response(body, { status: 200 });
    } catch {
      return new Response("not found", { status: 404 });
    }
  }
};

test("serves crawlable landing HTML with canonical URLs and event links", async () => {
  const response = await worker.fetch(new Request("https://odesvio.pt/concertos/lisboa"), { ASSETS: assets }, { waitUntil() {} });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.match(html, /<h1>Concertos em Lisboa<\/h1>/);
  assert.match(html, /rel="canonical" href="https:\/\/odesvio\.pt\/concertos\/lisboa"/);
  assert.match(html, /href="\/evento\//);
  assert.doesNotMatch(html, /\{\{[A-Z_]+\}\}/);
});

test("sitemap contains landing pages and event pages", async () => {
  const response = await worker.fetch(new Request("https://odesvio.pt/sitemap.xml"), { ASSETS: assets }, { waitUntil() {} });
  const xml = await response.text();
  assert.equal(response.status, 200);
  assert.match(xml, /https:\/\/odesvio\.pt\/concertos\/lisboa/);
  assert.match(xml, /https:\/\/odesvio\.pt\/metal\/portugal/);
  assert.match(xml, /https:\/\/odesvio\.pt\/evento\//);
});

test("unknown event returns the branded no-store 404 page", async () => {
  const response = await worker.fetch(new Request("https://odesvio.pt/evento/este-evento-nao-existe"), { ASSETS: assets }, { waitUntil() {} });
  const html = await response.text();
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(html, /404 ·/);
  assert.match(html, /\/brand\/404\//);
  assert.match(html, /noindex,follow/);
});
