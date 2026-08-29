const page = document.querySelector("#event-page");
const eventId = decodeURIComponent(location.pathname.split("/").filter(Boolean).pop() || "");
const eventDate = iso => new Date(`${iso}T12:00:00`);
const prettyDate = iso => new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric" }).format(eventDate(iso));
const escapeHtml = value => String(value || "").replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[character]);
const eventUrl = id => `${location.origin}/evento/${encodeURIComponent(id)}`;
const arrowIcon = `<svg class="event-arrow" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 15 15 5M7 5h8v8" /></svg>`;

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
  return `<a class="event-ticket" href="${escapeHtml(event.ticketUrl)}" target="_blank" rel="noopener"><span class="event-action-full">${escapeHtml(event.tickets || "Consultar bilheteira")} ${arrowIcon}</span><span class="event-action-short">Bilhetes ${arrowIcon}</span></a>`;
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
const compactEventDate = event => {
  const start = eventDate(event.date);
  if (!event.endDate) return new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long" }).format(start);
  const end = eventDate(event.endDate);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    const month = new Intl.DateTimeFormat("pt-PT", { month: "long" }).format(start);
    return `${start.getDate()}–${end.getDate()} ${month}`;
  }
  return `${shortDate(event.date)} — ${shortDate(event.endDate)}`;
};
const programmeTitle = (event, title) => String(title || "")
  .replace(`${eventSeriesName(event)} — `, "")
  .replace(/^\d{1,2}\s+(?:de\s+)?[A-Za-zÀ-ÿ]+(?:\s+de\s+\d{4})?\s*:\s*/i, "");
const icsText = value => String(value || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsDate = iso => String(iso || "").replaceAll("-", "");
const similarEvents = event => (window.EVENTS || [])
  .filter(item => item.id !== event.id && !item.seriesId && !item.title.startsWith(`${eventSeriesName(event)} —`))
  .map(item => ({
    item,
    score: (item.city === event.city ? 8 : 0)
      + (item.area === event.area ? 2 : 0)
      + (item.genres || []).filter(genre => (event.genres || []).includes(genre)).length * 3
      - Math.min(5, Math.abs(eventDate(item.date) - eventDate(event.date)) / 86400000 / 14)
  }))
  .sort((left, right) => right.score - left.score || left.item.date.localeCompare(right.item.date))
  .slice(0, 3)
  .map(({ item }) => item);

function calendarFile(event, shareUrl) {
  const endDate = event.endDate || event.date;
  const dayAfterEnd = eventDate(endDate);
  dayAfterEnd.setDate(dayAfterEnd.getDate() + 1);
  const dtEnd = `${dayAfterEnd.getFullYear()}${String(dayAfterEnd.getMonth() + 1).padStart(2, "0")}${String(dayAfterEnd.getDate()).padStart(2, "0")}`;
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Desvio//Agenda de música//PT",
    "BEGIN:VEVENT",
    `UID:${icsText(`${event.id}@desvio.pt`)}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART;VALUE=DATE:${icsDate(event.date)}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${icsText(event.title)}`,
    `LOCATION:${icsText(`${event.venue}, ${event.city}`)}`,
    `DESCRIPTION:${icsText(`Informação e fonte oficial: ${shareUrl}`)}`,
    `URL:${shareUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
    ""
  ].join("\r\n");
  return new File([calendar], `${event.id}.ics`, { type: "text/calendar;charset=utf-8" });
}

function render(event, poster) {
  const date = event.endDate ? `${prettyDate(event.date)} — ${prettyDate(event.endDate)}` : prettyDate(event.date);
  const compactDate = compactEventDate(event);
  const shareUrl = eventUrl(event.id);
  const shareText = `${event.title} — ${date}, ${event.venue}, ${event.city}. Encontrado no Desvio.`;
  const shareCaption = `${shareText}\n${shareUrl}`;
  const posterDownloadUrl = `${location.origin}/api/event-poster/${encodeURIComponent(event.id)}`;
  const programme = festivalProgramme(event);
  const programmeDates = [...new Set(programme.map(item => item.date))];
  const related = similarEvents(event);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue}, ${event.city}`)}`;
  page.innerHTML = `<article class="event-view">
    <div class="event-main">
      <div class="event-overview">
        <p class="event-eyebrow">${escapeHtml(event.type || "Concerto")} · ${escapeHtml(event.city)}</p>
        <h1>${escapeHtml(event.title)}</h1>
      </div>
      <div class="event-information">
        ${programmeDates.length ? `<section class="festival-programme"><p class="event-eyebrow">Programação</p><div class="festival-tabs" role="tablist" aria-label="Dias do festival">${programmeDates.map((itemDate, index) => `<button type="button" role="tab" id="programme-tab-${index}" data-programme-date="${itemDate}" aria-controls="programme-panel-${index}" aria-selected="${index === 0}" tabindex="${index === 0 ? "0" : "-1"}">${escapeHtml(shortDate(itemDate))}</button>`).join("")}</div>${programmeDates.map((itemDate, index) => `<div class="festival-day-panel" role="tabpanel" id="programme-panel-${index}" aria-labelledby="programme-tab-${index}" data-programme-panel="${itemDate}" ${index ? "hidden" : ""}>${programme.filter(item => item.date === itemDate).map(item => `<article><time>${escapeHtml(item.time || "Horário a confirmar")}</time><div><strong>${escapeHtml(programmeTitle(event, item.title))}</strong><small>${escapeHtml(item.venue)}</small></div></article>`).join("")}</div>`).join("")}</section>` : ""}
        <div class="event-actions">${ticketButton(event)}<a class="event-route" href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener"><span class="event-action-full">Percurso até ao local ${arrowIcon}</span><span class="event-action-short">Percurso ${arrowIcon}</span></a><a class="event-source" href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noopener"><span class="event-action-full">Fonte oficial ${arrowIcon}</span><span class="event-action-short">Fonte ${arrowIcon}</span></a></div>
        <button class="event-calendar" type="button" data-calendar>Adicionar ao calendário</button>
      </div>
      ${related.length ? `<section class="similar-events" aria-labelledby="similar-title"><p class="event-eyebrow">Pelo caminho</p><h2 id="similar-title">Também pode interessar.</h2><div>${related.map(item => `<a href="${eventUrl(item.id)}" target="_blank" rel="noopener"><time datetime="${escapeHtml(item.date)}">${escapeHtml(compactEventDate(item))}</time><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(`${item.venue} · ${item.city}`)}</span></a>`).join("")}</div></section>` : ""}
      <p class="event-disclaimer">Confirma sempre horários e disponibilidade na fonte oficial.</p>
    </div>
    <aside class="event-sidebar">
      <div class="event-poster-panel">
        <div class="share-card">
          ${poster ? `<button type="button" class="event-poster-trigger" data-event-poster aria-label="Ampliar cartaz oficial de ${escapeHtml(event.title)}"><img src="${escapeHtml(posterDownloadUrl)}" data-fallback-poster="${escapeHtml(poster)}" alt="Cartaz oficial de ${escapeHtml(event.title)}" fetchpriority="high" decoding="async" /></button>` : `<div class="share-card-empty">Desvio</div>`}
        </div>
      </div>
      <p class="event-meta"><span class="event-meta-date">${escapeHtml(compactDate)}</span><span class="event-meta-place">${escapeHtml(event.venue)}, ${escapeHtml(event.city)}</span></p>
      <section class="share-panel" aria-label="Partilhar evento">
        <div class="share-copy"><p class="event-eyebrow">Partilhar</p><h2>Leva este concerto contigo.</h2><p>Escolhe a aplicação no menu de partilha do teu telemóvel.</p></div>
        <div class="share-actions"><button type="button" data-share>Partilhar evento</button></div>
        <p class="share-status" aria-live="polite"></p>
      </section>
    </aside>
  </article>`;
  page.setAttribute("aria-busy", "false");
  const status = page.querySelector(".share-status");
  page.querySelector("[data-calendar]").addEventListener("click", async () => {
    const file = calendarFile(event, shareUrl);
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ files: [file], title: event.title, text: "Adicionar este evento ao calendário." });
        return;
      }
      const download = document.createElement("a");
      download.href = URL.createObjectURL(file);
      download.download = file.name;
      download.click();
      window.setTimeout(() => URL.revokeObjectURL(download.href), 1000);
    } catch (error) {
      if (error?.name !== "AbortError") status.textContent = "Não foi possível preparar o calendário.";
    }
  });
  const selectProgrammeDay = button => {
    const selected = button.dataset.programmeDate;
    page.querySelectorAll("[data-programme-date]").forEach(tab => {
      const isSelected = tab === button;
      tab.setAttribute("aria-selected", String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
    });
    page.querySelectorAll("[data-programme-panel]").forEach(panel => { panel.hidden = panel.dataset.programmePanel !== selected; });
  };
  page.querySelectorAll("[data-programme-date]").forEach((button, index, buttons) => {
    button.addEventListener("click", () => selectProgrammeDay(button));
    button.addEventListener("keydown", keyEvent => {
      const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
      if (!keys.includes(keyEvent.key)) return;
      keyEvent.preventDefault();
      const nextIndex = keyEvent.key === "Home" ? 0 : keyEvent.key === "End" ? buttons.length - 1 : (index + (keyEvent.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
      buttons[nextIndex].focus();
      selectProgrammeDay(buttons[nextIndex]);
    });
  });
  const posterTrigger = page.querySelector("[data-event-poster]");
  const posterDialog = document.querySelector("#event-poster-lightbox");
  if (posterTrigger && posterDialog) {
    const posterImage = posterTrigger.querySelector("img");
    posterImage.addEventListener("error", () => {
      const fallback = posterImage.dataset.fallbackPoster;
      if (fallback && posterImage.src !== fallback) {
        posterImage.src = fallback;
        delete posterImage.dataset.fallbackPoster;
      }
    });
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
      try {
        // WhatsApp and Instagram receive this as a real image, with the event URL in its caption.
        const posterResponse = await fetch(posterDownloadUrl);
        const posterBlob = await posterResponse.blob();
        if (!posterResponse.ok || !posterBlob.type.startsWith("image/")) throw new Error("poster-unavailable");
        const extension = posterBlob.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
        const posterFile = new File([posterBlob], `${event.id}-desvio.${extension}`, { type: posterBlob.type });
        const fileShare = { files: [posterFile] };
        if (!navigator.canShare || navigator.canShare(fileShare)) {
          await navigator.share({ title: `${event.title} — Desvio`, text: shareCaption, ...fileShare });
          return;
        }
        throw new Error("file-share-unavailable");
      } catch (error) {
        // A cancelled native share should remain silent; a browser without file sharing falls back to the rich link.
        if (error?.name === "AbortError") return;
        try {
          await navigator.share({ title: `${event.title} — Desvio`, text: shareText, url: shareUrl });
          return;
        } catch (fallbackError) {
          if (fallbackError?.name === "AbortError") return;
          status.textContent = "Não foi possível abrir a partilha.";
          return;
        }
      }
    }
    try { await navigator.clipboard.writeText(shareUrl); status.textContent = "Link copiado."; }
    catch { status.textContent = `Copia este link: ${shareUrl}`; }
  });
}

page.setAttribute("aria-busy", "true");
const event = (window.EVENTS || []).find(item => item.id === eventId);
if (!event) {
  page.innerHTML = `<section class="event-not-found"><p class="event-eyebrow">Evento não encontrado</p><h1>Este desvio já não está na agenda.</h1><a class="event-ticket" href="/">Voltar à agenda</a></section>`;
  page.setAttribute("aria-busy", "false");
}
else posterFor(event.id).then(poster => render(event, poster));
