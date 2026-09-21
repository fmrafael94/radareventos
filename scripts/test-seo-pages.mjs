import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
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
  assert.match(html, /<p class="eyebrow">404<\/p>/);
  assert.match(html, /\/brand\/404\//);
  assert.match(html, /\/brand\/logo-icon\.png\?v=2/);
  assert.match(html, /src="\/404\.js\?v=2"/);
  assert.match(html, /href="\/404\.css\?v=6"/);
  assert.match(html, /\/brand\/404\/[a-z]+-normalizad[oa]\.png\?v=1/);
  assert.match(html, /noindex,follow/);
});

test("404 deck shows every mascot before repeating one", async () => {
  const values = new Map();
  const storage = {
    getItem(key) { return values.get(key) || null; },
    setItem(key, value) { values.set(key, value); }
  };
  const element = () => ({ textContent:"", dataset:{}, src:"", alt:"" });
  const nodes = new Map([
    [".copy h1", element()],
    [".copy .lede", element()],
    ["[data-error-cta]", element()],
    ["figure img", element()]
  ]);
  const context = {
    window: { sessionStorage:storage },
    document: { title:"", body:{ dataset:{} }, querySelector(selector) { return nodes.get(selector) || null; } },
    Math,
    JSON
  };
  vm.createContext(context);
  vm.runInContext(await readFile(new URL("404.js", root), "utf8"), context);
  values.clear();
  const shown = Array.from({ length:10 }, () => context.window.DESVIO_404.nextVariantKey(storage, () => 0.37));
  assert.equal(new Set(shown.slice(0, 5)).size, 5);
  assert.equal(new Set(shown.slice(5, 10)).size, 5);
  assert.notEqual(shown[4], shown[5]);
});

test("English mode localises the complete branded 404 response", async () => {
  const response = await worker.fetch(new Request("https://odesvio.pt/evento/does-not-exist?lang=en"), { ASSETS: assets }, { waitUntil() {} });
  const html = await response.text();
  assert.equal(response.status, 404);
  assert.match(html, /<p class="eyebrow">404<\/p>/);
  assert.doesNotMatch(html, /(Sem sinal|Fora da faixa|Desvio na estrada|Depois do encore|Corda partida)/);
  assert.match(html, /data-lang-toggle/);
});

test("event pages expose the bilingual controls and English date metadata", async () => {
  const response = await worker.fetch(new Request("https://odesvio.pt/evento/fat-freddys-drop?lang=en"), { ASSETS: assets }, { waitUntil() {} });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /data-lang-toggle/);
  assert.match(html, /src="\/i18n\.js\?v=8"/);
  assert.match(html, /23 September/);
  assert.doesNotMatch(html, /\{\{[A-Z_]+\}\}/);
});

test("English mode translates event genres and descriptive titles without changing artist names", async () => {
  const context = {
    window: {},
    location: { search: "?lang=en", href: "https://odesvio.pt/?lang=en" },
    localStorage: { getItem() { return null; } },
    document: { documentElement: {}, readyState: "loading", addEventListener() {} },
    URL,
    URLSearchParams,
    console
  };
  vm.createContext(context);
  vm.runInContext(await readFile(new URL("i18n.js", root), "utf8"), context);
  const { t, eventTitle } = context.window.DESVIO_I18N;
  assert.equal(t("Abrir evento"), "Open event");
  assert.equal(t("Puxaram-lhe a ficha."), "They pulled the plug.");
  assert.equal(t("O beat foi ao bar."), "The beat went to the bar.");
  assert.equal(t("A corda deu o berro."), "The string snapped.");
  assert.equal(t("Concerto · Porto"), "Concert · Porto");
  assert.equal(t("Portas 17:00 · concertos 18:00"), "Doors 17:00 · concerts 18:00");
  assert.equal(t("Bilhete diário desde 65 € + taxas"), "Day ticket from 65 € + fees");
  assert.equal(t("Selecionar géneros"), "Select genres");
  assert.equal(t("Seg"), "Mon");
  assert.equal(t("Agenda por distrito"), "Listings by district");
  assert.equal(t("Metal progressivo"), "Progressive metal");
  assert.equal(eventTitle("Festas do Mar — Alok"), "Sea Festival — Alok");
  assert.equal(eventTitle("Concerto no Bar do Rio Gondoriz"), "Concert at Bar do Rio Gondoriz");
  assert.equal(eventTitle("Programação por dia ainda não publicada pela organização"), "Daily programme not yet published by the organiser");
  assert.equal(eventTitle("Consulta a programação atualizada na fonte oficial do festival"), "See the latest programme on the festival’s official source");
  assert.equal(eventTitle("Heavenwood"), "Heavenwood");
});

test("English mode leaves no Portuguese UI fragments in event metadata", async () => {
  const context = {
    window: {},
    location: { search: "?lang=en", href: "https://odesvio.pt/?lang=en" },
    localStorage: { getItem() { return null; } },
    document: { documentElement: {}, readyState: "loading", addEventListener() {} },
    URL,
    URLSearchParams,
    console
  };
  vm.createContext(context);
  vm.runInContext(await readFile(new URL("i18n.js", root), "utf8"), context);
  vm.runInContext(await readFile(new URL("events.js", root), "utf8"), context);
  const { t, eventTitle } = context.window.DESVIO_I18N;
  const portugueseUi = /\b(abrir|evento|bilhete|bilhetes|bilheteira|desde|até|entrada|livre|consultar|organização|programa|programação|portas|início|horário|horários|concertos?|cancelado|disponível|divulgado|aplicável|confirmar|acompanhados?|taxas|dia|palco|anunciar|cartaz|reembolso|temporariamente|sócios|fase|menores)\b/i;
  const residual = [];
  for (const event of context.window.EVENTS) {
    for (const field of ["time", "age", "tickets", "availability", "capacity"]) {
      if (event[field] == null) continue;
      const translated = t(String(event[field]));
      if (portugueseUi.test(translated)) residual.push(`${event.id}.${field}: ${translated}`);
    }
    for (const item of event.programme || []) {
      const translatedTime = t(String(item.time || ""));
      if (portugueseUi.test(translatedTime)) residual.push(`${event.id}.programme.time: ${translatedTime}`);
    }
  }
  assert.deepEqual(residual, []);
});

test("public pages use the approved vinyl icon and current language bundle", async () => {
  for (const file of ["index.html", "event.html", "landing.html", "404.html", "termos.html", "privacidade.html", "cookies.html"]) {
    const html = await readFile(new URL(file, root), "utf8");
    assert.match(html, /logo-icon\.png\?v=2/, `${file} must use the approved vinyl icon`);
    assert.doesNotMatch(html, /desvio-mark\.svg/, `${file} still uses the simplified mark`);
    assert.match(html, /i18n\.js\?v=8/, `${file} must load the current language bundle`);
  }
});

test("404 mascots use identical transparent square PNG canvases", async () => {
  for (const file of ["amplificador-normalizado.png", "vinil-normalizado.png", "carrinha-normalizada.png", "bateria-normalizada.png", "guitarra-normalizada.png"]) {
    const png = await readFile(new URL(`brand/404/${file}`, root));
    assert.equal(png.toString("hex", 0, 8), "89504e470d0a1a0a", `${file} must be a PNG`);
    assert.equal(png.readUInt32BE(16), 1254, `${file} must have the shared width`);
    assert.equal(png.readUInt32BE(20), 1254, `${file} must have the shared height`);
    assert.equal(png[25], 6, `${file} must keep RGBA transparency`);
  }
});

test("404 artwork and copy use one consistent visual system", async () => {
  const css = await readFile(new URL("404.css", root), "utf8");
  const script = await readFile(new URL("404.js", root), "utf8");
  assert.match(css, /figure\s*\{[^}]*aspect-ratio:1/s);
  assert.doesNotMatch(css, /img\[data-variant=/);
  assert.match(css, /h1\s*\{[^}]*min-height:1\.05em/s);
  assert.match(css, /\.lede\s*\{[^}]*min-height:1\.6em/s);
  assert.match(css, /@media \(max-width:780px\)[\s\S]*?\.copy\s*\{[^}]*text-align:center/s);
  assert.match(css, /@media \(max-width:780px\)[\s\S]*?main\s*\{[^}]*gap:0/s);
  const headings = [...script.matchAll(/heading: "([^"]+)"/g)].map(match => match[1]);
  const bodies = [...script.matchAll(/body: "([^"]+)"/g)].map(match => match[1]);
  assert.equal(headings.length, 5);
  assert.equal(bodies.length, 5);
  assert.ok(headings.every(value => value.length <= 22));
  assert.ok(Math.max(...headings.map(value => value.length)) - Math.min(...headings.map(value => value.length)) <= 6);
  assert.ok(bodies.every(value => value.length <= 36));
  assert.ok(Math.max(...bodies.map(value => value.length)) - Math.min(...bodies.map(value => value.length)) <= 12);
  assert.equal((script.match(/-normalizad[oa]\.png/g) || []).length, 5);
});
