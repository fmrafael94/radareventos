const page = document.querySelector("#event-page");
const eventId = decodeURIComponent(location.pathname.split("/").filter(Boolean).pop() || "");
const eventDate = iso => new Date(`${iso}T12:00:00`);
const prettyDate = iso => new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric" }).format(eventDate(iso));
const escapeHtml = value => String(value || "").replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[character]);
const eventUrl = id => `${location.origin}/evento/${encodeURIComponent(id)}`;

async function posterFor(id) {
  const event = (window.EVENTS || []).find(item => item.id === id);
  if (event?.image) return event.image;
  try {
    const source = await fetch("/app.js").then(response => response.text());
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return source.match(new RegExp(`["']${escaped}["']\\s*:\\s*\\[\\s*["']([^"']+)`))?.[1] || "";
  } catch {
    return "";
  }
}

function ticketButton(event) {
  if (event.availability === "Esgotado") return `<span class="event-ticket muted">Esgotado</span>`;
  if (!event.ticketUrl) return `<span class="event-ticket muted">Bilhetes por confirmar</span>`;
  return `<a class="event-ticket" href="${escapeHtml(event.ticketUrl)}" target="_blank" rel="noopener">${escapeHtml(event.tickets || "Consultar bilheteira")} ↗</a>`;
}

const eventSeriesName = event => String(event.title || "").split(" — ")[0].replace(/\s+\d{4}$/, "").trim();
const festivalProgramme = event => {
  if (!event.endDate) return [];
  const seriesName = eventSeriesName(event);
  return (window.EVENTS || [])
    .filter(item => item.id !== event.id && item.title.startsWith(`${seriesName} —`) && item.date >= event.date && item.date <= event.endDate)
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.time || "").localeCompare(String(b.time || "")));
};
const shortDate = iso => new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short" }).format(eventDate(iso)).replace(".", "");
const programmeTitle = (event, title) => String(title || "")
  .replace(`${eventSeriesName(event)} — `, "")
  .replace(/^\d{1,2}\s+(?:de\s+)?[A-Za-zÀ-ÿ]+(?:\s+de\s+\d{4})?\s*:\s*/i, "");

function render(event, poster) {
  const date = event.endDate ? `${prettyDate(event.date)} — ${prettyDate(event.endDate)}` : prettyDate(event.date);
  const shareUrl = eventUrl(event.id);
  const shareText = `${event.title} — ${date}, ${event.venue}, ${event.city}. Encontrado no Desvio.`;
  const programme = festivalProgramme(event);
  const programmeDates = [...new Set(programme.map(item => item.date))];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue}, ${event.city}`)}`;
  const verification = [event.verifiedAt ? `Fonte revista em ${event.verifiedAt}` : "Fonte oficial indicada", event.salesCheckedAt ? `bilheteira revista em ${event.salesCheckedAt}` : "bilheteira a confirmar"].join(" · ");
  page.innerHTML = `<article class="event-view">
    <div class="event-main">
      <div class="event-overview">
        <p class="event-eyebrow">${escapeHtml(event.type || "Concerto")} · ${escapeHtml(event.city)}</p>
        <h1>${escapeHtml(event.title)}</h1>
      </div>
      <div class="event-information">
        ${programmeDates.length ? `<section class="festival-programme"><p class="event-eyebrow">Programação</p><div class="festival-tabs" role="tablist" aria-label="Dias do festival">${programmeDates.map((itemDate, index) => `<button type="button" role="tab" data-programme-date="${itemDate}" aria-selected="${index === 0}">${escapeHtml(shortDate(itemDate))}</button>`).join("")}</div>${programmeDates.map((itemDate, index) => `<div class="festival-day-panel" data-programme-panel="${itemDate}" ${index ? "hidden" : ""}>${programme.filter(item => item.date === itemDate).map(item => `<article><time>${escapeHtml(item.time || "Horário a confirmar")}</time><div><strong>${escapeHtml(programmeTitle(event, item.title))}</strong><small>${escapeHtml(item.venue)}</small></div></article>`).join("")}</div>`).join("")}</section>` : ""}
        <div class="event-actions">${ticketButton(event)}<a class="event-source" href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noopener">Fonte oficial ↗</a></div>
      </div>
      <div class="event-trust"><b>Informação com origem</b><p>${escapeHtml(verification)}. Confirma sempre horários e disponibilidade na fonte oficial.</p><a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener">Ver percurso até ao local ↗</a></div>
    </div>
    <aside class="event-sidebar">
      <div class="event-poster-panel">
        <div class="share-card">
          ${poster ? `<button type="button" class="event-poster-trigger" data-event-poster aria-label="Ampliar cartaz oficial de ${escapeHtml(event.title)}"><img src="${escapeHtml(poster)}" alt="Cartaz oficial de ${escapeHtml(event.title)}" /></button>` : `<div class="share-card-empty">Desvio</div>`}
        </div>
      </div>
      <p class="event-meta"><span>${escapeHtml(date)} · ${escapeHtml(event.time || "Horário a confirmar")}</span><span>${escapeHtml(event.venue)}, ${escapeHtml(event.city)}</span></p>
      <section class="share-panel" aria-label="Partilhar evento">
        <div class="share-copy"><p class="event-eyebrow">Partilhar</p><h2>Leva este concerto contigo.</h2><p>Escolhe a aplicação no menu de partilha do teu telemóvel.</p></div>
        <div class="share-actions"><button type="button" data-share>Partilhar evento</button></div>
        <p class="share-status" aria-live="polite"></p>
      </section>
    </aside>
  </article>`;
  const status = page.querySelector(".share-status");
  page.querySelectorAll("[data-programme-date]").forEach(button => button.addEventListener("click", () => {
    const selected = button.dataset.programmeDate;
    page.querySelectorAll("[data-programme-date]").forEach(tab => tab.setAttribute("aria-selected", String(tab === button)));
    page.querySelectorAll("[data-programme-panel]").forEach(panel => { panel.hidden = panel.dataset.programmePanel !== selected; });
  }));
  const posterTrigger = page.querySelector("[data-event-poster]");
  const posterDialog = document.querySelector("#event-poster-lightbox");
  if (posterTrigger && posterDialog) {
    posterTrigger.addEventListener("click", () => {
      const image = posterTrigger.querySelector("img");
      posterDialog.querySelector("img").src = image.currentSrc || image.src;
      posterDialog.querySelector("img").alt = image.alt.replace("Cartaz oficial de ", "Cartaz oficial ampliado de ");
      posterDialog.showModal();
    });
    posterDialog.querySelector("[data-close-poster]").addEventListener("click", () => posterDialog.close());
    posterDialog.addEventListener("click", click => { if (click.target === posterDialog) posterDialog.close(); });
  }
  page.querySelector("[data-share]").addEventListener("click", async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `${event.title} — Desvio`, text: shareText, url: shareUrl }); }
      catch { status.textContent = "Partilha cancelada."; }
      return;
    }
    try { await navigator.clipboard.writeText(shareUrl); status.textContent = "Link copiado."; }
    catch { status.textContent = `Copia este link: ${shareUrl}`; }
  });
}

const event = (window.EVENTS || []).find(item => item.id === eventId);
if (!event) page.innerHTML = `<section class="event-not-found"><p class="event-eyebrow">Evento não encontrado</p><h1>Este desvio já não está na agenda.</h1><a class="event-ticket" href="/">Voltar à agenda</a></section>`;
else posterFor(event.id).then(poster => render(event, poster));
