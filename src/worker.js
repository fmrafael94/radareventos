import { onRequestGet as getConfig } from "../functions/api/config.js";
import { onRequestGet as getEvents } from "../functions/api/events.js";
import { onRequestPost as postFeedback } from "../functions/api/feedback.js";
import { onRequestGet as getAdminFeedback, onRequestPatch as patchAdminFeedback } from "../functions/api/admin/feedback.js";
import { onRequestGet as getAutomationReviews, onRequestPatch as patchAutomationReview } from "../functions/api/admin/automation-reviews.js";
import { onRequestGet as getAdminPoster } from "../functions/api/admin/poster.js";
import { onRequestGet as getAdminUsers, onRequestPost as postAdminUser, onRequestPatch as patchAdminUser } from "../functions/api/admin/users.js";
import { requireAdmin } from "../functions/admin-auth.js";
import { onRequestPost as postAuditReport } from "../functions/api/internal/audit-report.js";

const contextFor = (request, env) => ({ request, env });
const escapeHtml = value => String(value || "").replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[character]);

const eventField = (source, name) => source.match(new RegExp(`${name}:\\s*"((?:\\\\.|[^"\\\\])*)"`))?.[1]?.replace(/\\"/g, '"') || "";

async function assetText(request, env, path) {
  const url = new URL(request.url);
  url.pathname = path;
  url.search = "";
  const response = await env.ASSETS.fetch(new Request(url.toString()));
  if (!response.ok) throw new Error("Asset não encontrado");
  return response.text();
}

async function eventPage(request, env, id) {
  if (!/^[a-z0-9-]{1,180}$/i.test(id)) return new Response("Evento não encontrado.", { status: 404 });
  try {
    const events = await assetText(request, env, "/events.js");
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = events.match(new RegExp(`\\{\\s*id:\\s*"${escapedId}"[\\s\\S]*?\\}(?=,|\\))`));
    if (!match) return new Response("Evento não encontrado.", { status: 404 });
    const event = match[0];
    const title = eventField(event, "title") || "Evento";
    const date = eventField(event, "date");
    const venue = eventField(event, "venue");
    const city = eventField(event, "city");
    const app = await assetText(request, env, "/app.js");
    const poster = app.match(new RegExp(`["']${escapedId}["']\\s*:\\s*\\[\\s*["']([^"']+)`))?.[1] || eventField(event, "image");
    const url = new URL(request.url);
    const canonical = `${url.origin}/evento/${encodeURIComponent(id)}`;
    const description = [date, venue, city].filter(Boolean).join(" · ") || "Agenda pública de música em Portugal.";
    const image = poster || `${url.origin}/share-card.svg`;
    const template = await assetText(request, env, "/event.html");
    const html = template
      .replaceAll("{{EVENT_TITLE}}", escapeHtml(title))
      .replaceAll("{{EVENT_DESCRIPTION}}", escapeHtml(description))
      .replaceAll("{{EVENT_IMAGE}}", escapeHtml(image))
      .replaceAll("{{CANONICAL_URL}}", escapeHtml(canonical));
    return new Response(html, { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=300" } });
  } catch {
    return new Response("Não foi possível abrir este evento.", { status: 500 });
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const context = contextFor(request, env);

    if (pathname.startsWith("/evento/") && request.method === "GET") return eventPage(request, env, decodeURIComponent(pathname.slice("/evento/".length)));

    if (pathname === "/api/config" && request.method === "GET") return getConfig(context);
    if (pathname === "/api/events" && request.method === "GET") return getEvents(context);
    if (pathname === "/api/feedback" && request.method === "POST") return postFeedback(context);
    if (pathname === "/api/admin/feedback" && request.method === "GET") return getAdminFeedback(context);
    if (pathname === "/api/admin/feedback" && request.method === "PATCH") return patchAdminFeedback(context);
    if (pathname === "/api/admin/automation-reviews" && request.method === "GET") return getAutomationReviews(context);
    if (pathname === "/api/admin/automation-reviews" && request.method === "PATCH") return patchAutomationReview(context);
    if (pathname === "/api/admin/poster" && request.method === "GET") return getAdminPoster(context);
    if (pathname === "/api/admin/users" && request.method === "GET") return getAdminUsers(context);
    if (pathname === "/api/admin/users" && request.method === "POST") return postAdminUser(context);
    if (pathname === "/api/admin/users" && request.method === "PATCH") return patchAdminUser(context);
    if (pathname === "/admin.html" && request.method === "GET") {
      const session = await requireAdmin(context);
      if (session.response) return new Response("Acesso privado necessário.", { status: session.response.status, headers: { "Content-Type": "text/plain; charset=UTF-8", "Cache-Control": "no-store" } });
    }
    if (pathname === "/api/internal/audit-report" && request.method === "POST") return postAuditReport(context);

    return env.ASSETS.fetch(request);
  },
};
