import assert from "node:assert/strict";
import worker, { sitemapEventIds } from "../src/worker.js";
import { readFile } from "node:fs/promises";

class Statement {
  constructor(sql) {
    this.sql = sql.replace(/\s+/g, " ").trim();
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async run() {
    return { success: true };
  }

  async first() {
    if (this.sql.includes("FROM admin_login_attempts")) return null;
    if (this.sql.includes("FROM admin_users")) return { email: this.values[0], role: "owner" };
    return null;
  }
}

const db = { prepare: sql => new Statement(sql) };
const assets = {
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/admin-login") return new Response("LOGIN_PAGE", { headers: { "Content-Type": "text/html" } });
    if (path === "/admin") return new Response("ADMIN_PAGE", { headers: { "Content-Type": "text/html" } });
    return new Response("ASSET", { headers: { "Content-Type": "text/plain" } });
  }
};
const env = {
  ASSETS: assets,
  EVENT_RADAR_DB: db,
  ADMIN_OWNER_EMAIL: "owner@example.test",
  ADMIN_PASSWORD: "example-password",
  ADMIN_SESSION_SECRET: "example-session-secret-with-enough-entropy"
};
const executionCtx = { waitUntil() {} };
const fetchRoute = (url, init) => worker.fetch(new Request(url, init), env, executionCtx);

const eventSource = await readFile(new URL("../events.js", import.meta.url), "utf8");
const publicEventIds = sitemapEventIds(eventSource);
assert.equal(publicEventIds.length, 263);
assert.ok(publicEventIds.includes("kalorama-2026"));
assert.ok(!publicEventIds.includes("kalorama-2026-28"));
assert.ok(!publicEventIds.includes("under-doom-2026-09-25"));
const currentSitemapIds = sitemapEventIds(eventSource, "2026-09-05");
assert.equal(currentSitemapIds.length, 250);
assert.ok(!currentSitemapIds.includes("kalorama-2026"));
assert.ok(!currentSitemapIds.includes("iminente-2026-09-17"));

for (const path of ["/", "/admin", "/admin/", "/admin.html"]) {
  const response = await fetchRoute(`https://admin.odesvio.pt${path}`, { redirect: "manual" });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("Location"), "https://odesvio.pt/painel");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
}

for (const path of ["/admin", "/admin/", "/admin.html"]) {
  const response = await fetchRoute(`https://odesvio.pt${path}`, { redirect: "manual" });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("Location"), "/painel");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
}

for (const path of ["/painel", "/painel/", "/painel.html"]) {
  const response = await fetchRoute(`https://odesvio.pt${path}`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "LOGIN_PAGE");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("X-Frame-Options"), "DENY");
}

const head = await fetchRoute("https://odesvio.pt/painel", { method: "HEAD" });
assert.equal(head.status, 200);
assert.equal(await head.text(), "");
assert.equal(head.headers.get("Cache-Control"), "no-store");

const login = await fetchRoute("https://odesvio.pt/api/admin/login", {
  method: "POST",
  headers: { "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.1" },
  body: JSON.stringify({ password: env.ADMIN_PASSWORD })
});
assert.equal(login.status, 200);
const cookie = login.headers.get("Set-Cookie");
assert.match(cookie, /^desvio_admin_session=/);
assert.match(cookie, /HttpOnly; Secure; SameSite=Strict/);

const authenticated = await fetchRoute("https://odesvio.pt/painel", { headers: { Cookie: cookie.split(";")[0] } });
assert.equal(authenticated.status, 200);
assert.equal(await authenticated.text(), "ADMIN_PAGE");

console.log("Admin routing and session checks passed.");
