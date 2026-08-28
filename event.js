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

function render(event, poster) {
  const date = event.endDate ? `${prettyDate(event.date)} — ${prettyDate(event.endDate)}` : prettyDate(event.date);
  const shareUrl = eventUrl(event.id);
  const shareText = `${event.title} — ${date}, ${event.venue}, ${event.city}. Encontrado no Desvio.`;
  page.innerHTML = `<article class="event-view">
    <div class="event-view-main">
      <p class="event-eyebrow">${escapeHtml(event.type || "Concerto")} · ${escapeHtml(event.city)}</p>
      <h1>${escapeHtml(event.title)}</h1>
      <p class="event-lede">${escapeHtml(date)} · ${escapeHtml(event.time || "Horário a confirmar")}<br>${escapeHtml(event.venue)}, ${escapeHtml(event.city)}</p>
      <div class="event-actions">${ticketButton(event)}<a class="event-source" href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noopener">Fonte oficial ↗</a></div>
      <dl class="event-facts">
        <div><dt>Géneros</dt><dd>${escapeHtml((event.genres || []).join(" · ") || "Por confirmar")}</dd></div>
        <div><dt>Entrada</dt><dd>${escapeHtml(event.availability || "Por confirmar")}</dd></div>
        <div><dt>Idade</dt><dd>${escapeHtml(event.age || "Consultar organização")}</dd></div>
        <div><dt>Verificado</dt><dd>${escapeHtml(event.verifiedAt || "Por confirmar")}</dd></div>
      </dl>
      <p class="event-note">Confirma sempre a informação e a disponibilidade na fonte oficial antes de sair.</p>
    </div>
    <aside class="share-panel">
      <div class="share-card" ${poster ? `style="--poster:url('${encodeURI(poster)}')"` : ""}>
        ${poster ? `<img src="${escapeHtml(poster)}" alt="Cartaz oficial de ${escapeHtml(event.title)}" />` : `<div class="share-card-empty">Desvio</div>`}
        <div class="share-card-overlay"><span>Desvio</span><time>${escapeHtml(date)}</time><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(event.venue)} · ${escapeHtml(event.city)}</small></div>
      </div>
      <div class="share-copy"><p class="event-eyebrow">Partilhar</p><h2>Leva este concerto contigo.</h2><p>O link abre esta página com o cartaz, data, local e fonte oficial.</p></div>
      <div class="share-actions"><button type="button" data-share>Partilhar</button><button type="button" class="secondary" data-copy>Copiar link</button><a class="secondary" href="mailto:?subject=${encodeURIComponent(`${event.title} — Desvio`)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}">Enviar por email</a></div>
      <p class="share-status" aria-live="polite"></p>
    </aside>
  </article>`;
  const status = page.querySelector(".share-status");
  page.querySelector("[data-share]").addEventListener("click", async () => {
    if (!navigator.share) return page.querySelector("[data-copy]").click();
    try { await navigator.share({ title: `${event.title} — Desvio`, text: shareText, url: shareUrl }); } catch { /* The visitor closed the share sheet. */ }
  });
  page.querySelector("[data-copy]").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(shareUrl); status.textContent = "Link copiado."; }
    catch { status.textContent = `Copia este link: ${shareUrl}`; }
  });
}

const event = (window.EVENTS || []).find(item => item.id === eventId);
if (!event) page.innerHTML = `<section class="event-not-found"><p class="event-eyebrow">Evento não encontrado</p><h1>Este desvio já não está na agenda.</h1><a class="event-ticket" href="/">Voltar à agenda</a></section>`;
else posterFor(event.id).then(poster => render(event, poster));
