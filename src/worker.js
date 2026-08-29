import { onRequestGet as getConfig } from "../functions/api/config.js";
import { onRequestGet as getEvents } from "../functions/api/events.js";
import { onRequestPost as postFeedback } from "../functions/api/feedback.js";
import { onRequestGet as getSubmissionStatus } from "../functions/api/submission-status.js";
import { onRequestGet as getAdminFeedback, onRequestPatch as patchAdminFeedback } from "../functions/api/admin/feedback.js";
import { onRequestGet as getAutomationReviews, onRequestPatch as patchAutomationReview } from "../functions/api/admin/automation-reviews.js";
import { onRequestGet as getAdminPoster } from "../functions/api/admin/poster.js";
import { onRequestGet as getAdminUsers, onRequestPost as postAdminUser, onRequestPatch as patchAdminUser } from "../functions/api/admin/users.js";
import { requireAdmin } from "../functions/admin-auth.js";
import { onRequestPost as postAuditReport } from "../functions/api/internal/audit-report.js";

const contextFor = (request, env) => ({ request, env });
const escapeHtml = value => String(value || "").replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[character]);
const escapeXml = value => escapeHtml(value).replace(/\"/g, "&quot;");

// Access blocks private routes at the edge. These headers protect every
// response that reaches the Worker, including static pages and API replies.
function secureResponse(response) {
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self'; frame-src https://challenges.cloudflare.com; upgrade-insecure-requests");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

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
    // Serve the official artwork from our own origin. That makes social previews
    // and the native share sheet independent from a third-party image host.
    const image = poster ? `${url.origin}/api/event-poster/${encodeURIComponent(id)}` : `${url.origin}/share-card.svg`;
    const eventSchema = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "MusicEvent",
      name: title,
      startDate: date,
      location: { "@type": "Place", name: venue || "Local a confirmar", address: { "@type": "PostalAddress", addressLocality: city || "Portugal", addressCountry: "PT" } },
      image: [image],
      url: canonical,
      organizer: { "@type": "Organization", name: "Desvio" }
    }).replace(/</g, "\\u003c");
    const template = await assetText(request, env, "/event.html");
    const html = template
      .replaceAll("{{EVENT_TITLE}}", escapeHtml(title))
      .replaceAll("{{EVENT_DESCRIPTION}}", escapeHtml(description))
      .replaceAll("{{EVENT_IMAGE}}", escapeHtml(image))
      .replaceAll("{{CANONICAL_URL}}", escapeHtml(canonical))
      .replaceAll("{{EVENT_SCHEMA}}", eventSchema);
    return new Response(html, { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=300" } });
  } catch {
    return new Response("Não foi possível abrir este evento.", { status: 500 });
  }
}

async function sitemap(request, env) {
  try {
    const source = await assetText(request, env, "/events.js");
    const origin = new URL(request.url).origin;
    const ids = [...source.matchAll(/\bid:\s*"([a-z0-9-]{1,180})"/gi)].map(match => match[1]);
    const urls = [...new Set(ids)].map(id => `<url><loc>${escapeXml(`${origin}/evento/${encodeURIComponent(id)}`)}</loc></url>`).join("");
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escapeXml(`${origin}/`)}</loc></url>${urls}</urlset>`, {
      headers: { "Content-Type": "application/xml; charset=UTF-8", "Cache-Control": "public, max-age=3600" }
    });
  } catch {
    return new Response("Sitemap indisponível.", { status: 503 });
  }
}

async function eventPoster(request, env, id, executionCtx) {
  if (!/^[a-z0-9-]{1,180}$/i.test(id)) return new Response("Cartaz não encontrado.", { status: 404 });
  try {
    const cache = caches.default;
    const cached = await cache.match(request);
    if (cached) return cached;
    const events = await assetText(request, env, "/events.js");
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = events.match(new RegExp(`\\{\\s*id:\\s*"${escapedId}"[\\s\\S]*?\\}(?=,|\\))`));
    if (!match) return new Response("Cartaz não encontrado.", { status: 404 });
    const app = await assetText(request, env, "/app.js");
    const poster = app.match(new RegExp(`["']${escapedId}["']\\s*:\\s*\\[\\s*["']([^"']+)`))?.[1] || eventField(match[0], "image");
    if (!poster) return new Response("Este evento não tem cartaz disponível.", { status: 404 });
    const posterUrl = new URL(poster);
    if (!/^https?:$/.test(posterUrl.protocol)) return new Response("Cartaz inválido.", { status: 400 });
    const response = await fetch(posterUrl.toString());
    const type = response.headers.get("Content-Type") || "";
    if (!response.ok || !type.startsWith("image/")) return new Response("Não foi possível obter o cartaz.", { status: 502 });
    const result = new Response(response.body, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Access-Control-Allow-Origin": "*"
      }
    });
    executionCtx?.waitUntil(cache.put(request, result.clone()));
    return result;
  } catch {
    return new Response("Não foi possível obter o cartaz.", { status: 502 });
  }
}

export default {
  async fetch(request, env, executionCtx) {
    const { pathname } = new URL(request.url);
    const context = contextFor(request, env);
    const origin = request.headers.get("Origin");
    if (origin && origin !== new URL(request.url).origin && request.method !== "GET" && request.method !== "HEAD") {
      return secureResponse(new Response("Origem não autorizada.", { status: 403, headers: { "Content-Type": "text/plain; charset=UTF-8", "Cache-Control": "no-store" } }));
    }

    if (pathname === "/robots.txt" && request.method === "GET") return secureResponse(new Response(`User-agent: *\nAllow: /\nSitemap: ${new URL(request.url).origin}/sitemap.xml\n`, { headers: { "Content-Type": "text/plain; charset=UTF-8", "Cache-Control": "public, max-age=3600" } }));
    if (pathname === "/sitemap.xml" && request.method === "GET") return secureResponse(await sitemap(request, env));
    if (pathname.startsWith("/api/event-poster/") && request.method === "GET") return secureResponse(await eventPoster(request, env, decodeURIComponent(pathname.slice("/api/event-poster/".length)), executionCtx));
    if (pathname.startsWith("/evento/") && request.method === "GET") return secureResponse(await eventPage(request, env, decodeURIComponent(pathname.slice("/evento/".length))));

    if (pathname === "/api/config" && request.method === "GET") return secureResponse(await getConfig(context));
    if (pathname === "/api/events" && request.method === "GET") return secureResponse(await getEvents(context));
    if (pathname === "/api/feedback" && request.method === "POST") return secureResponse(await postFeedback(context));
    if (pathname === "/api/submission-status" && request.method === "GET") return secureResponse(await getSubmissionStatus(context));
    if (pathname === "/api/admin/feedback" && request.method === "GET") return secureResponse(await getAdminFeedback(context));
    if (pathname === "/api/admin/feedback" && request.method === "PATCH") return secureResponse(await patchAdminFeedback(context));
    if (pathname === "/api/admin/automation-reviews" && request.method === "GET") return secureResponse(await getAutomationReviews(context));
    if (pathname === "/api/admin/automation-reviews" && request.method === "PATCH") return secureResponse(await patchAutomationReview(context));
    if (pathname === "/api/admin/poster" && request.method === "GET") return secureResponse(await getAdminPoster(context));
    if (pathname === "/api/admin/users" && request.method === "GET") return secureResponse(await getAdminUsers(context));
    if (pathname === "/api/admin/users" && request.method === "POST") return secureResponse(await postAdminUser(context));
    if (pathname === "/api/admin/users" && request.method === "PATCH") return secureResponse(await patchAdminUser(context));
    if (pathname === "/admin.html" && request.method === "GET") {
      const session = await requireAdmin(context);
      if (session.response) return secureResponse(new Response("Acesso privado necessário.", { status: session.response.status, headers: { "Content-Type": "text/plain; charset=UTF-8", "Cache-Control": "no-store" } }));
    }
    if (pathname === "/api/internal/audit-report" && request.method === "POST") return secureResponse(await postAuditReport(context));

    return secureResponse(await env.ASSETS.fetch(request));
  },
};
