import { onRequestGet as getConfig } from "../functions/api/config.js";
import { onRequestGet as getEvents } from "../functions/api/events.js";
import { onRequestPost as postFeedback } from "../functions/api/feedback.js";
import { onRequestGet as getAdminFeedback, onRequestPatch as patchAdminFeedback, onRequestPostBulk as postAdminFeedbackBulk } from "../functions/api/admin/feedback.js";
import { onRequestGet as getAutomationReviews, onRequestPatch as patchAutomationReview, onRequestPost as postAutomationReviewBulk } from "../functions/api/admin/automation-reviews.js";
import { onRequestGet as getAdminPoster } from "../functions/api/admin/poster.js";
import { onRequestGet as getPosterHolds, onRequestPost as postPosterHold } from "../functions/api/admin/poster-holds.js";
import { onRequestGet as getAdminEvents, onRequestPatch as patchAdminEvent } from "../functions/api/admin/events.js";
import { clearAdminSession, loginWithAdminEmailCode, loginWithAdminPassword, requestAdminEmailCode, requireAdmin } from "../functions/admin-auth.js";
import { onRequestPost as postAuditReport } from "../functions/api/internal/audit-report.js";
import { ensureEventStore } from "../functions/event-store.js";
import { publishingReady } from "../functions/publication-readiness.js";

const contextFor = (request, env) => ({ request, env });
const canonicalHost = "odesvio.pt";
const adminHost = "admin.odesvio.pt";
const canonicalAdminPath = "/painel";
const escapeHtml = value => String(value || "").replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[character]);
const escapeXml = value => escapeHtml(value).replace(/\"/g, "&quot;");

// These headers protect every response that reaches the Worker, including
// static pages and API replies.
function secureResponse(response) {
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self' https://cloudflareinsights.com; frame-src https://challenges.cloudflare.com; upgrade-insecure-requests");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

const eventField = (source, name) => source.match(new RegExp(`${name}:\\s*"((?:\\\\.|[^"\\\\])*)"`))?.[1]?.replace(/\\"/g, '"') || "";
export function posterPublicationHoldIds(source) {
  const literal = source.match(/window\.POSTER_PUBLICATION_HOLDS\s*=\s*(\[[\s\S]*?\]);/i)?.[1];
  if (!literal) return new Set();
  try {
    const ids = JSON.parse(literal);
    return new Set(Array.isArray(ids) ? ids.filter(id => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}
const cacheVersion = value => {
  let hash = 2166136261;
  // Changes in proxy behaviour must receive a new public URL too. Otherwise a
  // browser can retain yesterday's generic fallback for up to a day even when
  // the official poster is available again.
  for (const character of `poster-proxy-v2:${String(value || "")}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};
const lisbonToday = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const humanDate = (iso, locale = "pt-PT") => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return "";
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", day: "numeric", month: "long" }).format(new Date(`${iso}T12:00:00Z`));
};

const eventLiteral = (source, id) => {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp(`\\{\\s*id:\\s*"${escapedId}"[\\s\\S]*?\\}(?=,|\\))`))?.[0] || "";
};

// The catalogue starts with compact event records and completes some of them
// later through Object.assign. Browsers evaluate that JavaScript, while this
// Worker reads it as text for event and share pages. Include the explicit
// image update so those two views never fall back to the generic share card.
const imageFromCatalogueUpdate = (source, id) => {
  const start = source.indexOf(`"${id}": {`);
  if (start < 0) return "";
  return source.slice(start, start + 4_000).match(/\bimage:\s*"((?:\\.|[^"\\])*)"/)?.[1]?.replace(/\\"/g, '"') || "";
};

async function publishedEvent(env, id) {
  if (!env.EVENT_RADAR_DB) return null;
  try {
    await ensureEventStore(env.EVENT_RADAR_DB);
    const row = await env.EVENT_RADAR_DB.prepare(`
      SELECT payload_json FROM event_registry
      WHERE id = ? AND publication_status = 'published' AND origin_kind = 'official_source'
    `).bind(id).first();
    if (!row?.payload_json) return null;
    const event = JSON.parse(row.payload_json);
    return event?.id === id && event.title && event.date && event.sourceUrl ? event : null;
  } catch {
    return null;
  }
}

async function publicEventPatch(env, id) {
  if (!env.EVENT_RADAR_DB) return {};
  try {
    await ensureEventStore(env.EVENT_RADAR_DB);
    const row = await env.EVENT_RADAR_DB.prepare("SELECT patch_json FROM event_overrides WHERE event_id = ?").bind(id).first();
    const patch = row?.patch_json ? JSON.parse(row.patch_json) : {};
    return patch && typeof patch === "object" ? patch : {};
  } catch {
    return {};
  }
}

async function archivedEventIds(env) {
  if (!env.EVENT_RADAR_DB) return new Set();
  try {
    await ensureEventStore(env.EVENT_RADAR_DB);
    const { results = [] } = await env.EVENT_RADAR_DB.prepare("SELECT event_id, patch_json FROM event_overrides").all();
    return new Set(results.flatMap(row => {
      try {
        const patch = JSON.parse(row.patch_json || "{}");
        return patch?.publicationStatus === "archived" && row.event_id ? [row.event_id] : [];
      } catch {
        return [];
      }
    }));
  } catch {
    return new Set();
  }
}

async function releasedPosterHoldIds(env, source, today = "0000-00-00") {
  if (!env.EVENT_RADAR_DB) return [];
  const holds = posterPublicationHoldIds(source);
  if (!holds.size) return [];
  try {
    await ensureEventStore(env.EVENT_RADAR_DB);
    const { results = [] } = await env.EVENT_RADAR_DB.prepare("SELECT event_id, patch_json FROM event_overrides").all();
    return results.flatMap(row => {
      if (!holds.has(row.event_id)) return [];
      try {
        const patch = JSON.parse(row.patch_json || "{}");
        if (patch?.publicationStatus === "archived") return [];
        const literal = eventLiteral(source, row.event_id);
        const lastDate = eventField(literal, "endDate") || eventField(literal, "date");
        return staticHoldIsReady(literal, patch) && lastDate >= today ? [row.event_id] : [];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

function staticHoldIsReady(literal, patch = {}) {
  return Boolean(literal) && publishingReady({
    eventName: patch.title || eventField(literal, "title"),
    eventDate: patch.date || eventField(literal, "date"),
    city: patch.city || eventField(literal, "city"),
    venue: patch.venue || eventField(literal, "venue"),
    tickets: patch.tickets || eventField(literal, "tickets"),
    posterUrl: patch.image,
    officialUrl: patch.sourceUrl || eventField(literal, "sourceUrl")
  });
}

async function assetText(request, env, path) {
  const url = new URL(request.url);
  url.pathname = path;
  url.search = "";
  const response = await env.ASSETS.fetch(new Request(url.toString()));
  if (!response.ok) throw new Error("Asset não encontrado");
  return response.text();
}

async function privateAssetPage(request, env, path) {
  const url = new URL(request.url);
  url.hostname = canonicalHost;
  url.pathname = path;
  url.search = "";
  const response = await env.ASSETS.fetch(new Request(url.toString()));
  if (!response.ok) return new Response("Página indisponível.", { status: 503 });
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

const notFoundVariants = [
  { eyebrow: "404", heading: "Puxaram-lhe a ficha.", body: "Este evento ficou sem corrente.", cta: "Voltar à agenda", image: "/brand/404/amplificador-normalizado.png?v=1", alt: "Amplificador mascote com o cabo desligado", en: { eyebrow:"404", heading:"Someone pulled the plug.", body:"This event ran out of power.", cta:"Back to the listings", alt:"Amplifier mascot with an unplugged cable" } },
  { eyebrow: "404", heading: "O disco saltou.", body: "Este evento saiu da faixa.", cta: "Voltar à agenda", image: "/brand/404/vinil-normalizado.png?v=1", alt: "Disco de vinil mascote à procura do beat", en: { eyebrow:"404", heading:"The record skipped.", body:"This event slipped off the track.", cta:"Back to the listings", alt:"Vinyl record mascot looking for the beat" } },
  { eyebrow: "404", heading: "A tour perdeu-se.", body: "Este evento fez um desvio a mais.", cta: "Voltar à agenda", image: "/brand/404/carrinha-normalizada.png?v=1", alt: "Carrinha de tour mascote num desvio", en: { eyebrow:"404", heading:"The tour got lost.", body:"This event took one detour too many.", cta:"Back to the listings", alt:"Tour van mascot taking a detour" } },
  { eyebrow: "404", heading: "O beat foi ao bar.", body: "E levou este evento com ele.", cta: "Voltar à agenda", image: "/brand/404/bateria-normalizada.png?v=1", alt: "Bateria mascote num palco vazio", en: { eyebrow:"404", heading:"The beat went to the bar.", body:"It took this event along with it.", cta:"Back to the listings", alt:"Drum kit mascot on an empty stage" } },
  { eyebrow: "404", heading: "A corda deu o berro.", body: "Este evento saiu do tom.", cta: "Voltar à agenda", image: "/brand/404/guitarra-normalizada.png?v=1", alt: "Guitarra mascote com uma corda partida", en: { eyebrow:"404", heading:"The string snapped.", body:"This event fell out of tune.", cta:"Back to the listings", alt:"Guitar mascot with a broken string" } }
];

async function notFoundPage(request, env) {
  try {
    const template = await assetText(request, env, "/404.html");
    const variant = notFoundVariants[Math.floor(Math.random() * notFoundVariants.length)];
    const copy = new URL(request.url).searchParams.get("lang") === "en" ? { ...variant, ...variant.en } : variant;
    const html = template
      .replaceAll("{{ERROR_TITLE}}", escapeHtml(copy.heading))
      .replaceAll("{{ERROR_EYEBROW}}", escapeHtml(copy.eyebrow))
      .replaceAll("{{ERROR_HEADING}}", escapeHtml(copy.heading))
      .replaceAll("{{ERROR_BODY}}", escapeHtml(copy.body))
      .replaceAll("{{ERROR_CTA}}", escapeHtml(copy.cta))
      .replaceAll("{{ERROR_IMAGE}}", escapeHtml(variant.image))
      .replaceAll("{{ERROR_ALT}}", escapeHtml(copy.alt));
    return new Response(html, { status: 404, headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "no-store" } });
  } catch {
    return new Response(new URL(request.url).searchParams.get("lang") === "en" ? "Event not found." : "Evento não encontrado.", { status: 404, headers: { "Content-Type": "text/plain; charset=UTF-8", "Cache-Control": "no-store" } });
  }
}

async function eventPage(request, env, id) {
  if (!/^[a-z0-9-]{1,180}$/i.test(id)) return notFoundPage(request, env);
  try {
    const events = await assetText(request, env, "/events.js");
    const patch = await publicEventPatch(env, id);
    if (patch.publicationStatus === "archived") return notFoundPage(request, env);
    const literal = eventLiteral(events, id);
    if (posterPublicationHoldIds(events).has(id) && !staticHoldIsReady(literal, patch)) return notFoundPage(request, env);
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = events.match(new RegExp(`\\{\\s*id:\\s*"${escapedId}"[\\s\\S]*?\\}(?=,|\\))`));
    const cloudEvent = match ? null : await publishedEvent(env, id);
    if (!match && !cloudEvent) return notFoundPage(request, env);
    const event = match?.[0] || "";
    const stringPatch = (key, fallback = "") => typeof patch[key] === "string" && patch[key].trim() ? patch[key].trim() : fallback;
    const title = stringPatch("title", cloudEvent?.title || eventField(event, "title") || "Evento");
    const date = stringPatch("date", cloudEvent?.date || eventField(event, "date"));
    const endDate = stringPatch("endDate", cloudEvent?.endDate || eventField(event, "endDate"));
    const venue = stringPatch("venue", cloudEvent?.venue || eventField(event, "venue"));
    const city = stringPatch("city", cloudEvent?.city || eventField(event, "city"));
    const app = await assetText(request, env, "/app.js");
    // events.js editorial updates are applied after app.js's poster map in the
    // browser, so they are the current source of truth here as well. This
    // avoids serving an older fallback (including legacy social-page links).
    const poster = stringPatch("image", imageFromCatalogueUpdate(events, id) || app.match(new RegExp(`["']${escapedId}["']\\s*:\\s*\\[\\s*["']([^"']+)`))?.[1] || cloudEvent?.image || eventField(event, "image"));
    const url = new URL(request.url);
    const canonical = `${url.origin}/evento/${encodeURIComponent(id)}`;
    const english = url.searchParams.get("lang") === "en";
    const pageLocale = english ? "en-GB" : "pt-PT";
    const dateLabel = endDate && endDate !== date ? `${humanDate(date, pageLocale)}–${humanDate(endDate, pageLocale)}` : humanDate(date, pageLocale);
    const description = [dateLabel, venue, city].filter(Boolean).join(" · ") || (english ? "Concerts, festivals and live music in Portugal." : "Agenda de concertos, festivais e música ao vivo em Portugal.");
    // Serve the official artwork from our own origin. That makes social previews
    // and the native share sheet independent from a third-party image host.
    // Bump this query version when proxy handling changes. Social crawlers and
    // browsers must not keep an earlier generic fallback after an official
    // poster becomes reachable.
    const image = poster ? `${url.origin}/api/event-poster/${encodeURIComponent(id)}?v=${cacheVersion(poster)}` : `${url.origin}/share-card.svg`;
    const eventSchema = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "MusicEvent",
      name: title,
      startDate: date,
      ...(endDate ? { endDate } : {}),
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: stringPatch("availability", cloudEvent?.availability) === "Cancelado" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
      location: { "@type": "Place", name: venue || "Local a confirmar", address: { "@type": "PostalAddress", addressLocality: city || "Portugal", addressCountry: "PT" } },
      image: [image],
      url: canonical
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

export function sitemapEventIds(source, today = "0000-00-00") {
  const posterHolds = posterPublicationHoldIds(source);
  const records = [...source.matchAll(/\{\s*id:\s*"([a-z0-9-]{1,180})"([^\n]*)/gi)]
    .filter(match => !/\bseriesId:\s*"/i.test(match[2]))
    .map(match => ({ id: match[1], lastDate: eventField(match[0], "endDate") || eventField(match[0], "date") }))
    .filter(record => !posterHolds.has(record.id) && (!record.lastDate || record.lastDate >= today));
  const prefixBlock = source.match(/const festivalSeriesPrefixes = \{([\s\S]*?)\};/)?.[1] || "";
  const series = [...prefixBlock.matchAll(/"([a-z0-9-]+)"\s*:\s*"([a-z0-9-]+)"/gi)]
    .map(match => ({ parentId: match[1], prefix: match[2] }));
  return [...new Set(records.filter(({ id }) => !series.some(({ parentId, prefix }) => id !== parentId && id.startsWith(prefix))).map(record => record.id))];
}

const slugify = value => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-PT")
  .replace(/&/g, " e ")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");
const eventGenres = literal => [...(literal.match(/\bgenres:\s*\[([^\]]*)\]/)?.[1] || "").matchAll(/"((?:\\.|[^"\\])*)"/g)].map(match => match[1].replace(/\\"/g, '"'));
const isFreeEvent = event => /entrada livre|entrada gratuita|gratuit[oa]|gr[aá]tis|\bfree\b/i.test(`${event.tickets} ${event.availability}`);

export function publicEventRecords(source, today = "0000-00-00", excluded = new Set()) {
  return sitemapEventIds(source, today).filter(id => !excluded.has(id)).map(id => {
    const literal = eventLiteral(source, id);
    return {
      id,
      title: eventField(literal, "title"),
      date: eventField(literal, "date"),
      endDate: eventField(literal, "endDate"),
      time: eventField(literal, "time"),
      venue: eventField(literal, "venue"),
      city: eventField(literal, "city"),
      district: eventField(literal, "district"),
      area: eventField(literal, "area"),
      type: eventField(literal, "type") || "Concerto",
      tickets: eventField(literal, "tickets"),
      availability: eventField(literal, "availability"),
      genres: eventGenres(literal)
    };
  }).filter(event => event.title && event.date && (event.endDate || event.date) >= today);
}

const countsFor = (events, key) => {
  const counts = new Map();
  for (const event of events) {
    const values = key === "genres" ? event.genres : [event[key]];
    for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts].map(([name, count]) => ({ name, slug: slugify(name), count })).sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "pt"));
};

const weekendRange = today => {
  const date = new Date(`${today}T12:00:00Z`);
  const weekday = date.getUTCDay();
  const daysUntilFriday = (5 - weekday + 7) % 7;
  const friday = new Date(date);
  friday.setUTCDate(date.getUTCDate() + daysUntilFriday);
  const sunday = new Date(friday);
  sunday.setUTCDate(friday.getUTCDate() + 2);
  return [friday.toISOString().slice(0, 10), sunday.toISOString().slice(0, 10)];
};

const routeEntry = (path, label, kind, value = "") => ({ path, label, kind, value });

export function landingRoutes(source, today = "0000-00-00", excluded = new Set()) {
  const events = publicEventRecords(source, today, excluded);
  const cities = countsFor(events, "city").filter(item => item.count >= 2);
  const districts = countsFor(events, "district").filter(item => item.count >= 3);
  const areas = countsFor(events, "area").filter(item => item.count >= 3);
  const genres = countsFor(events, "genres").filter(item => item.count >= 3);
  const years = [...new Set(events.filter(event => event.type === "Festival").map(event => event.date.slice(0, 4)))].sort();
  const routes = [
    routeEntry("/concertos", "Concertos em Portugal", "all"),
    routeEntry("/concertos-este-fim-de-semana", "Concertos este fim de semana", "weekend"),
    routeEntry("/concertos-gratis", "Concertos grátis", "free"),
    ...years.map(year => routeEntry(`/festivais/${year}`, `Festivais em Portugal em ${year}`, "festival", year)),
    ...cities.map(item => routeEntry(`/concertos/${item.slug}`, `Concertos em ${item.name}`, "city", item.name)),
    ...districts.map(item => routeEntry(`/concertos/distrito/${item.slug}`, `Concertos no distrito de ${item.name}`, "district", item.name)),
    ...areas.map(item => routeEntry(`/concertos/regiao/${item.slug}`, `Concertos em ${item.name}`, "area", item.name)),
    ...genres.map(item => routeEntry(`/${item.slug}/portugal`, `${item.name} em Portugal`, "genre", item.name))
  ];
  for (const city of cities) {
    for (const genre of genres) {
      const count = events.filter(event => event.city === city.name && event.genres.includes(genre.name)).length;
      if (count >= 3) routes.push(routeEntry(`/concertos/${city.slug}/${genre.slug}`, `${genre.name} ao vivo em ${city.name}`, "cityGenre", `${city.name}\u0000${genre.name}`));
    }
  }
  return routes;
}

function resolveLanding(source, pathname, today, excluded = new Set()) {
  const routes = landingRoutes(source, today, excluded);
  const cleanPath = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  const route = routes.find(item => item.path === cleanPath);
  if (!route) return null;
  const allEvents = publicEventRecords(source, today, excluded);
  const [weekendStart, weekendEnd] = weekendRange(today);
  const [city, genre] = route.value.split("\u0000");
  const events = allEvents.filter(event => {
    if (route.kind === "weekend") return event.date <= weekendEnd && (event.endDate || event.date) >= weekendStart;
    if (route.kind === "free") return isFreeEvent(event);
    if (route.kind === "festival") return event.type === "Festival" && event.date.startsWith(`${route.value}-`);
    if (route.kind === "city") return event.city === route.value;
    if (route.kind === "district") return event.district === route.value;
    if (route.kind === "area") return event.area === route.value;
    if (route.kind === "genre") return event.genres.includes(route.value);
    if (route.kind === "cityGenre") return event.city === city && event.genres.includes(genre);
    return true;
  }).sort((left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title, "pt"));
  return { ...route, events, routes };
}

const landingDescription = landing => {
  const count = landing.events.length;
  if (landing.kind === "weekend") return `${count} concertos e eventos de música ao vivo para este fim de semana em Portugal, com datas, salas, cartazes e ligações oficiais.`;
  if (landing.kind === "free") return `${count} concertos e eventos de música com entrada livre em Portugal, confirmados em fontes oficiais.`;
  return `${count} eventos em agenda: ${landing.label}. Datas, salas, cartazes, bilhetes e fontes oficiais no Desvio.`;
};

function landingNavigation(routes, activePath) {
  const priority = ["/concertos", "/concertos-este-fim-de-semana", "/concertos-gratis", "/concertos/lisboa", "/concertos/porto", "/metal/portugal", "/rock/portugal", "/jazz/portugal"];
  return priority.map(path => routes.find(route => route.path === path)).filter(route => route && route.path !== activePath)
    .map(route => `<a href="${escapeHtml(route.path)}">${escapeHtml(route.label)}</a>`).join("");
}

async function landingPage(request, env, pathname) {
  try {
    const [template, source] = await Promise.all([assetText(request, env, "/landing.html"), assetText(request, env, "/events.js")]);
    const landing = resolveLanding(source, pathname, lisbonToday(), await archivedEventIds(env));
    if (!landing) return null;
    const origin = new URL(request.url).origin;
    const canonical = `${origin}${landing.path}`;
    const description = landingDescription(landing);
    const cards = landing.events.map(event => {
      const date = event.endDate && event.endDate !== event.date ? `${humanDate(event.date)}–${humanDate(event.endDate)}` : humanDate(event.date);
      const format = [event.type, event.genres.slice(0, 2).join(" · ")].filter(Boolean).join(" · ");
      return `<article class="landing-event"><a href="/evento/${encodeURIComponent(event.id)}"><time datetime="${escapeHtml(event.date)}">${escapeHtml(date)}</time><div><p>${escapeHtml(format)}</p><h2>${escapeHtml(event.title)}</h2><span>${escapeHtml([event.venue, event.city].filter(Boolean).join(" · "))}</span></div><b aria-hidden="true">↗</b></a></article>`;
    }).join("");
    const itemList = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: landing.label,
      numberOfItems: landing.events.length,
      itemListElement: landing.events.map((event, index) => ({ "@type": "ListItem", position: index + 1, url: `${origin}/evento/${encodeURIComponent(event.id)}`, name: event.title }))
    }).replace(/</g, "\\u003c");
    const html = template
      .replaceAll("{{PAGE_TITLE}}", escapeHtml(`${landing.label} | Desvio`))
      .replaceAll("{{PAGE_HEADING}}", escapeHtml(landing.label))
      .replaceAll("{{PAGE_DESCRIPTION}}", escapeHtml(description))
      .replaceAll("{{PAGE_COUNT}}", escapeHtml(`${landing.events.length} ${landing.events.length === 1 ? "evento" : "eventos"}`))
      .replaceAll("{{CANONICAL_URL}}", escapeHtml(canonical))
      .replaceAll("{{EVENT_CARDS}}", cards || '<p class="landing-empty">Ainda não há eventos confirmados para esta seleção.</p>')
      .replaceAll("{{DISCOVERY_LINKS}}", landingNavigation(landing.routes, landing.path))
      .replaceAll("{{PAGE_SCHEMA}}", itemList);
    return new Response(html, { headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=300" } });
  } catch {
    return new Response("Não foi possível abrir esta agenda.", { status: 503 });
  }
}

// The app renders its full, interactive agenda in the browser. This small
// server-rendered collection gives crawlers and no-JavaScript visitors a
// stable set of ordinary links into the same current, public agenda.
export function homepageEventLinks(source, today = "0000-00-00", limit = 12) {
  const publicIds = new Set(sitemapEventIds(source, today));
  return [...publicIds]
    .map(id => {
      const literal = eventLiteral(source, id);
      return {
        id,
        title: eventField(literal, "title"),
        date: eventField(literal, "date"),
        endDate: eventField(literal, "endDate"),
        venue: eventField(literal, "venue"),
        city: eventField(literal, "city")
      };
    })
    .filter(event => event.title && event.date && event.date >= today)
    .sort((left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title, "pt"))
    .slice(0, limit);
}

function homepageEventLinksHtml(source, today, excluded = new Set()) {
  const events = homepageEventLinks(source, today).filter(event => !excluded.has(event.id));
  if (!events.length) return "";
  const links = events.map(event => {
    const date = event.endDate && event.endDate !== event.date
      ? `${humanDate(event.date)}–${humanDate(event.endDate)}`
      : humanDate(event.date);
    const place = [event.venue, event.city].filter(Boolean).join(" · ");
    return `<li><a href="/evento/${encodeURIComponent(event.id)}"><time datetime="${escapeHtml(event.date)}">${escapeHtml(date)}</time><span><strong>${escapeHtml(event.title)}</strong>${place ? `<small>${escapeHtml(place)}</small>` : ""}</span><b aria-hidden="true">→</b></a></li>`;
  }).join("");
  return `<section class="seo-event-links" aria-labelledby="seo-events-title"><div class="seo-event-links-heading"><div><p class="kicker">Explorar</p><h2 id="seo-events-title">Mais música na agenda.</h2></div><a href="#agenda">Ver todos os eventos <span aria-hidden="true">↑</span></a></div><p>Concertos e festivais em Portugal, atualizados por ordem de data.</p><ul>${links}</ul></section>`;
}

async function homepage(request, env) {
  try {
    const template = await assetText(request, env, "/index.html");
    // Dedicated, server-rendered discovery pages replace the duplicated event
    // list that previously appeared below the interactive agenda.
    const html = template.replace("<!-- SEO_UPCOMING_EVENTS -->", "");
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=300" }
    });
  } catch {
    return new Response("Não foi possível abrir a agenda.", { status: 503, headers: { "Content-Type": "text/plain; charset=UTF-8", "Cache-Control": "no-store" } });
  }
}

async function sitemap(request, env) {
  try {
    const source = await assetText(request, env, "/events.js");
    const origin = new URL(request.url).origin;
    const today = lisbonToday();
    const ids = sitemapEventIds(source, today);
    ids.push(...await releasedPosterHoldIds(env, source, today));
    if (env.EVENT_RADAR_DB) {
      try {
        await ensureEventStore(env.EVENT_RADAR_DB);
        const { results = [] } = await env.EVENT_RADAR_DB.prepare(`
          SELECT id, payload_json FROM event_registry
          WHERE publication_status = 'published' AND origin_kind = 'official_source'
        `).all();
        for (const row of results) {
          try {
            const event = JSON.parse(row.payload_json);
            if (event?.id && !event.seriesId && (event.endDate || event.date || "") >= today) ids.push(event.id);
          } catch { /* ignore malformed private records */ }
        }
      } catch { /* the static catalogue remains available */ }
    }
    const archived = await archivedEventIds(env);
    const urls = [...new Set(ids)].filter(id => !archived.has(id)).map(id => `<url><loc>${escapeXml(`${origin}/evento/${encodeURIComponent(id)}`)}</loc></url>`).join("");
    const landingUrls = landingRoutes(source, today, archived).map(route => `<url><loc>${escapeXml(`${origin}${route.path}`)}</loc></url>`).join("");
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escapeXml(`${origin}/`)}</loc></url>${landingUrls}${urls}</urlset>`, {
      headers: { "Content-Type": "application/xml; charset=UTF-8", "Cache-Control": "public, max-age=3600" }
    });
  } catch {
    return new Response("Sitemap indisponível.", { status: 503 });
  }
}

async function shareFallback(request, env) {
  const url = new URL(request.url);
  url.pathname = "/share-card.svg";
  url.search = "";
  const response = await env.ASSETS.fetch(new Request(url.toString()));
  const headers = new Headers(response.headers);
  headers.set("Content-Type", "image/svg+xml; charset=UTF-8");
  headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
  return new Response(response.body, { status: response.ok ? 200 : 503, headers });
}

async function eventPoster(request, env, id, executionCtx) {
  if (!/^[a-z0-9-]{1,180}$/i.test(id)) return new Response("Cartaz não encontrado.", { status: 404 });
  let officialPosterUrl = "";
  try {
    // Check publication status before the edge cache. Otherwise a formerly
    // public poster can outlive a newly applied publication hold.
    const events = await assetText(request, env, "/events.js");
    const patch = await publicEventPatch(env, id);
    if (patch.publicationStatus === "archived") return new Response("Cartaz não encontrado.", { status: 404 });
    const literal = eventLiteral(events, id);
    if (posterPublicationHoldIds(events).has(id) && !staticHoldIsReady(literal, patch)) return new Response("Cartaz não encontrado.", { status: 404 });
    const cache = caches.default;
    const cached = await cache.match(request);
    if (cached) return cached;
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = events.match(new RegExp(`\\{\\s*id:\\s*"${escapedId}"[\\s\\S]*?\\}(?=,|\\))`));
    const cloudEvent = match ? null : await publishedEvent(env, id);
    if (!match && !cloudEvent) return new Response("Cartaz não encontrado.", { status: 404 });
    const app = await assetText(request, env, "/app.js");
    const poster = (typeof patch.image === "string" && patch.image.trim()) || imageFromCatalogueUpdate(events, id) || app.match(new RegExp(`["']${escapedId}["']\\s*:\\s*\\[\\s*["']([^"']+)`))?.[1] || cloudEvent?.image || eventField(match?.[0] || "", "image");
    if (!poster) return shareFallback(request, env);
    const posterUrl = new URL(poster);
    if (!/^https?:$/.test(posterUrl.protocol)) return shareFallback(request, env);
    officialPosterUrl = posterUrl.toString();
    // A slow external host must not leave the mobile poster frame blank.
    // After a short proxy attempt, hand the browser to the verified original
    // image; it may have a browser-only access policy that the Worker cannot
    // satisfy anyway.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    let response;
    try {
      response = await fetch(officialPosterUrl, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    const type = response.headers.get("Content-Type") || "";
    if (!response.ok || !type.startsWith("image/")) {
      // Some official sites allow their public artwork in a browser but reject
      // a server-to-server image fetch. Do not pretend that there is no
      // poster: send the visitor or crawler to the same official file. This
      // preserves the source's access policy instead of trying to bypass it.
      return new Response(null, {
        status: 302,
        headers: { Location: officialPosterUrl, "Cache-Control": "no-store" }
      });
    }
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
    if (officialPosterUrl) return new Response(null, {
      status: 302,
      headers: { Location: officialPosterUrl, "Cache-Control": "no-store" }
    });
    return shareFallback(request, env);
  }
}

async function purgeExpiredPersonalData(env) {
  if (!env.EVENT_RADAR_DB) return;

  const currentWindow = Math.floor(Date.now() / (15 * 60 * 1000));
  await env.EVENT_RADAR_DB.prepare("DELETE FROM request_rate_limits WHERE window_start < ?")
    .bind(currentWindow - 3)
    .run();
  await env.EVENT_RADAR_DB.prepare("CREATE TABLE IF NOT EXISTS admin_login_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_started INTEGER NOT NULL)").run();
  await env.EVENT_RADAR_DB.prepare("DELETE FROM admin_login_attempts WHERE window_started < ?")
    .bind(Date.now() - 24 * 60 * 60 * 1000)
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
    const canonicalAdminPage = [canonicalAdminPath, `${canonicalAdminPath}/`, `${canonicalAdminPath}.html`].includes(pathname);
    // Previous permanent redirects can remain cached by Safari. Always leave
    // the old hostname through a fresh path that was never part of that cycle.
    if (isAdminHost && ["GET", "HEAD"].includes(request.method)) {
      const destination = new URL(`${url.protocol}//${canonicalHost}${canonicalAdminPath}`);
      destination.hostname = canonicalHost;
      return secureResponse(new Response(null, { status: 302, headers: { Location: destination.toString(), "Cache-Control": "no-store" } }));
    }
    // Keep old public bookmarks usable without creating another permanent
    // browser-level redirect.
    if (legacyAdminPath && ["GET", "HEAD"].includes(request.method)) {
      return secureResponse(new Response(null, { status: 302, headers: { Location: canonicalAdminPath, "Cache-Control": "no-store" } }));
    }
    const context = contextFor(request, env);
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin && request.method !== "GET" && request.method !== "HEAD") {
      return secureResponse(new Response("Origem não autorizada.", { status: 403, headers: { "Content-Type": "text/plain; charset=UTF-8", "Cache-Control": "no-store" } }));
    }

    if (pathname === "/robots.txt" && ["GET", "HEAD"].includes(request.method)) return secureResponse(new Response(request.method === "HEAD" ? null : `User-agent: *\nAllow: /\nSitemap: ${new URL(request.url).origin}/sitemap.xml\n`, { headers: { "Content-Type": "text/plain; charset=UTF-8", "Cache-Control": "public, max-age=3600" } }));
    if (pathname === "/" && ["GET", "HEAD"].includes(request.method)) {
      const response = await homepage(request, env);
      return secureResponse(request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response);
    }
    if (pathname === "/sitemap.xml" && ["GET", "HEAD"].includes(request.method)) {
      const response = await sitemap(request, env);
      return secureResponse(request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response);
    }
    const isLandingPath = pathname === "/concertos"
      || pathname === "/concertos-este-fim-de-semana"
      || pathname === "/concertos-gratis"
      || /^\/festivais\/\d{4}\/?$/.test(pathname)
      || /^\/concertos\/(?:distrito\/|regiao\/)?[a-z0-9-]+(?:\/[a-z0-9-]+)?\/?$/.test(pathname)
      || /^\/[a-z0-9-]+\/portugal\/?$/.test(pathname);
    if (isLandingPath && ["GET", "HEAD"].includes(request.method)) {
      const response = await landingPage(request, env, pathname);
      if (response) return secureResponse(request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response);
    }
    if (pathname.startsWith("/api/event-poster/") && ["GET", "HEAD"].includes(request.method)) {
      const response = await eventPoster(request, env, decodeURIComponent(pathname.slice("/api/event-poster/".length)), executionCtx);
      return secureResponse(request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response);
    }
    if (pathname.startsWith("/evento/") && ["GET", "HEAD"].includes(request.method)) {
      const response = await eventPage(request, env, decodeURIComponent(pathname.slice("/evento/".length)));
      return secureResponse(request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response);
    }

    if (pathname === "/api/config" && request.method === "GET") return secureResponse(await getConfig(context));
    if (pathname === "/api/events" && request.method === "GET") return secureResponse(await getEvents(context));
    if (pathname === "/api/feedback" && request.method === "POST") return secureResponse(await postFeedback(context));
    if (pathname === "/api/admin/login" && request.method === "POST") {
      const rawBody = await request.text();
      if (rawBody.length > 4_096) return secureResponse(Response.json({ message: "Pedido demasiado grande." }, { status: 413, headers: { "Cache-Control": "no-store" } }));
      let body = {};
      try { body = JSON.parse(rawBody); } catch { /* handled as an empty login */ }
      const login = await loginWithAdminPassword(context, typeof body.password === "string" ? body.password : "");
      if (login.response) return secureResponse(login.response);
      const response = Response.json({ ok: true }, { headers: { "Cache-Control": "no-store", "Set-Cookie": login.cookie } });
      return secureResponse(response);
    }
    if (pathname === "/api/admin/request-code" && request.method === "POST") {
      const rawBody = await request.text();
      if (rawBody.length > 4_096) return secureResponse(Response.json({ message: "Pedido demasiado grande." }, { status: 413, headers: { "Cache-Control": "no-store" } }));
      let body = {};
      try { body = JSON.parse(rawBody); } catch { /* handled as an empty email */ }
      const result = await requestAdminEmailCode(context, typeof body.email === "string" ? body.email : "");
      if (result.response) return secureResponse(result.response);
      return secureResponse(Response.json({ ok: true, expiresIn: result.expiresIn }, { headers: { "Cache-Control": "no-store" } }));
    }
    if (pathname === "/api/admin/verify-code" && request.method === "POST") {
      const rawBody = await request.text();
      if (rawBody.length > 4_096) return secureResponse(Response.json({ message: "Pedido demasiado grande." }, { status: 413, headers: { "Cache-Control": "no-store" } }));
      let body = {};
      try { body = JSON.parse(rawBody); } catch { /* handled as an empty code */ }
      const login = await loginWithAdminEmailCode(context, typeof body.email === "string" ? body.email : "", typeof body.code === "string" ? body.code : "");
      if (login.response) return secureResponse(login.response);
      return secureResponse(Response.json({ ok: true }, { headers: { "Cache-Control": "no-store", "Set-Cookie": login.cookie } }));
    }
    if (pathname === "/api/admin/logout" && request.method === "POST") {
      return secureResponse(new Response(null, { status: 204, headers: { "Cache-Control": "no-store", "Set-Cookie": clearAdminSession() } }));
    }
    if (pathname === "/api/admin/session" && request.method === "GET") {
      const session = await requireAdmin(context);
      if (session.response) return secureResponse(session.response);
      return secureResponse(Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } }));
    }
    if (pathname === "/api/admin/feedback" && request.method === "GET") return secureResponse(await getAdminFeedback(context));
    if (pathname === "/api/admin/feedback" && request.method === "PATCH") return secureResponse(await patchAdminFeedback(context));
    if (pathname === "/api/admin/feedback/bulk" && request.method === "POST") return secureResponse(await postAdminFeedbackBulk(context));
    if (pathname === "/api/admin/automation-reviews" && request.method === "GET") return secureResponse(await getAutomationReviews(context));
    if (pathname === "/api/admin/automation-reviews" && request.method === "PATCH") return secureResponse(await patchAutomationReview(context));
    if (pathname === "/api/admin/automation-reviews/bulk" && request.method === "POST") return secureResponse(await postAutomationReviewBulk(context));
    if (pathname === "/api/admin/poster" && request.method === "GET") return secureResponse(await getAdminPoster(context));
    if (pathname === "/api/admin/poster-holds" && request.method === "GET") return secureResponse(await getPosterHolds(context));
    if (pathname === "/api/admin/poster-holds" && request.method === "POST") return secureResponse(await postPosterHold(context));
    if (pathname === "/api/admin/events" && request.method === "GET") return secureResponse(await getAdminEvents(context));
    if (pathname === "/api/admin/events" && request.method === "PATCH") return secureResponse(await patchAdminEvent(context));
    if (canonicalAdminPage && ["GET", "HEAD"].includes(request.method)) {
      const session = await requireAdmin(context);
      const response = await privateAssetPage(request, env, session.response ? "/admin-login" : "/admin");
      return secureResponse(request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response);
    }
    if (pathname === "/api/internal/audit-report" && request.method === "POST") return secureResponse(await postAuditReport(context));

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status === 404 && ["GET", "HEAD"].includes(request.method)) {
      const response = await notFoundPage(request, env);
      return secureResponse(request.method === "HEAD" ? new Response(null, { status: 404, headers: response.headers }) : response);
    }
    return secureResponse(assetResponse);
  },
  async scheduled(_controller, env, executionCtx) {
    executionCtx.waitUntil(purgeExpiredPersonalData(env));
  }
};
