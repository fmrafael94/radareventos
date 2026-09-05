import { onRequestGet as getConfig } from "../functions/api/config.js";
import { onRequestGet as getEvents } from "../functions/api/events.js";
import { onRequestPost as postFeedback } from "../functions/api/feedback.js";
import { onRequestGet as getAdminFeedback, onRequestPatch as patchAdminFeedback } from "../functions/api/admin/feedback.js";
import { onRequestGet as getAutomationReviews, onRequestPatch as patchAutomationReview } from "../functions/api/admin/automation-reviews.js";
import { onRequestGet as getAdminPoster } from "../functions/api/admin/poster.js";
import { onRequestGet as getAdminUsers, onRequestPost as postAdminUser, onRequestPatch as patchAdminUser } from "../functions/api/admin/users.js";
import { clearAdminSession, loginWithAdminPassword, requireAdmin } from "../functions/admin-auth.js";
import { onRequestPost as postAuditReport } from "../functions/api/internal/audit-report.js";

const contextFor = (request, env) => ({ request, env });
const canonicalHost = "odesvio.pt";
// Keeping the Access session on its own hostname prevents the private-login
// return from colliding with the public site's cookies (notably in Safari).
const adminHost = "admin.odesvio.pt";
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
      .replaceAll("{{SITE_ICON}}", escapeHtml(`${url.origin}/brand/logo-icon.png`))
      .replaceAll("{{EVENT_ID}}", escapeHtml(id))
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

async function purgeExpiredPersonalData(env) {
  if (!env.EVENT_RADAR_DB) return;

  const currentWindow = Math.floor(Date.now() / (15 * 60 * 1000));
  await env.EVENT_RADAR_DB.prepare("DELETE FROM request_rate_limits WHERE window_start < ?")
    .bind(currentWindow - 3)
    .run();

  const { results: expired } = await env.EVENT_RADAR_DB.prepare(`
    SELECT id, poster_object_key FROM feedback
    WHERE (
      status IN ('new', 'reviewing') AND created_at < datetime('now', '-90 days')
    ) OR (
      status IN ('published', 'rejected', 'closed')
      AND COALESCE(reviewed_at, created_at) < datetime('now', '-12 months')
    )
    LIMIT 100
  `).all();
  const deletableIds = [];
  for (const feedback of expired) {
    if (feedback.poster_object_key && env.EVENT_POSTERS) {
      try {
        await env.EVENT_POSTERS.delete(feedback.poster_object_key);
      } catch {
        continue;
      }
    }
    deletableIds.push(feedback.id);
  }
  if (deletableIds.length) {
    await env.EVENT_RADAR_DB.batch(deletableIds.map(id => env.EVENT_RADAR_DB.prepare("DELETE FROM feedback WHERE id = ?").bind(id)));
  }
  await env.EVENT_RADAR_DB.prepare(`
    DELETE FROM admin_users
    WHERE status = 'disabled' AND role != 'owner' AND updated_at < datetime('now', '-12 months')
  `).run();
}

export default {
  async fetch(request, env, executionCtx) {
    const url = new URL(request.url);
    if (url.hostname === `www.${canonicalHost}`) {
      url.hostname = canonicalHost;
      return secureResponse(new Response(null, { status: 308, headers: { Location: url.toString() } }));
    }
    const { pathname } = url;
    const isAdminHost = url.hostname === adminHost;
    const legacyAdminPath = ["/admin", "/admin/", "/admin.html"].includes(pathname);
    // The public shortcut remains stable, but the protected session lives on a
    // dedicated hostname. It is deliberately a redirect before any app logic.
    if (!isAdminHost && legacyAdminPath && ["GET", "HEAD"].includes(request.method)) {
      const destination = new URL(request.url);
      destination.hostname = adminHost;
      destination.pathname = "/";
      destination.search = "";
      return secureResponse(new Response(null, { status: 308, headers: { Location: destination.toString() } }));
    }
    const context = contextFor(request, env);
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin && request.method !== "GET" && request.method !== "HEAD") {
      return secureResponse(new Response("Origem não autorizada.", { status: 403, headers: { "Content-Type": "text/plain; charset=UTF-8", "Cache-Control": "no-store" } }));
    }

    if (pathname === "/robots.txt" && ["GET", "HEAD"].includes(request.method)) return secureResponse(new Response(request.method === "HEAD" ? null : `User-agent: *\nAllow: /\nSitemap: ${new URL(request.url).origin}/sitemap.xml\n`, { headers: { "Content-Type": "text/plain; charset=UTF-8", "Cache-Control": "public, max-age=3600" } }));
    if (pathname === "/sitemap.xml" && ["GET", "HEAD"].includes(request.method)) {
      const response = await sitemap(request, env);
      return secureResponse(request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response);
    }
    if (pathname.startsWith("/api/event-poster/") && request.method === "GET") return secureResponse(await eventPoster(request, env, decodeURIComponent(pathname.slice("/api/event-poster/".length)), executionCtx));
    if (pathname.startsWith("/evento/") && request.method === "GET") return secureResponse(await eventPage(request, env, decodeURIComponent(pathname.slice("/evento/".length))));

    if (pathname === "/api/config" && request.method === "GET") return secureResponse(await getConfig(context));
    if (pathname === "/api/events" && request.method === "GET") return secureResponse(await getEvents(context));
    if (pathname === "/api/feedback" && request.method === "POST") return secureResponse(await postFeedback(context));
    if (pathname === "/api/admin/login" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const login = await loginWithAdminPassword(context, typeof body.password === "string" ? body.password : "");
      if (login.response) return secureResponse(login.response);
      const response = Response.json({ ok: true }, { headers: { "Cache-Control": "no-store", "Set-Cookie": login.cookie } });
      return secureResponse(response);
    }
    if (pathname === "/api/admin/logout" && request.method === "POST") {
      return secureResponse(new Response(null, { status: 204, headers: { "Cache-Control": "no-store", "Set-Cookie": clearAdminSession() } }));
    }
    if (pathname === "/api/admin/feedback" && request.method === "GET") return secureResponse(await getAdminFeedback(context));
    if (pathname === "/api/admin/feedback" && request.method === "PATCH") return secureResponse(await patchAdminFeedback(context));
    if (pathname === "/api/admin/automation-reviews" && request.method === "GET") return secureResponse(await getAutomationReviews(context));
    if (pathname === "/api/admin/automation-reviews" && request.method === "PATCH") return secureResponse(await patchAutomationReview(context));
    if (pathname === "/api/admin/poster" && request.method === "GET") return secureResponse(await getAdminPoster(context));
    if (pathname === "/api/admin/users" && request.method === "GET") return secureResponse(await getAdminUsers(context));
    if (pathname === "/api/admin/users" && request.method === "POST") return secureResponse(await postAdminUser(context));
    if (pathname === "/api/admin/users" && request.method === "PATCH") return secureResponse(await patchAdminUser(context));
    const adminPage = isAdminHost
      ? ["/", "/admin", "/admin/", "/admin.html"].includes(pathname)
      : legacyAdminPath;
    if (adminPage && request.method === "GET") {
      const session = await requireAdmin(context);
      if (session.response) {
        if (isAdminHost) {
          const loginUrl = new URL(request.url);
          loginUrl.pathname = "/admin-login.html";
          return secureResponse(await env.ASSETS.fetch(new Request(loginUrl.toString(), request)));
        }
        return secureResponse(new Response("Acesso privado necessário.", { status: session.response.status, headers: { "Content-Type": "text/plain; charset=UTF-8", "Cache-Control": "no-store" } }));
      }
      if (pathname !== "/admin.html") {
        const assetUrl = new URL(request.url);
        assetUrl.pathname = "/admin.html";
        return secureResponse(await env.ASSETS.fetch(new Request(assetUrl.toString(), request)));
      }
    }
    if (pathname === "/api/internal/audit-report" && request.method === "POST") return secureResponse(await postAuditReport(context));

    return secureResponse(await env.ASSETS.fetch(request));
  },
  async scheduled(_controller, env, executionCtx) {
    executionCtx.waitUntil(purgeExpiredPersonalData(env));
  }
};
