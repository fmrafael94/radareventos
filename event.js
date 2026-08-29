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

const roundedRect = (context, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
};

const drawWrapped = (context, text, x, y, width, lineHeight, maxLines = 3) => {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else line = next;
  }
  if (line && lines.length < maxLines) lines.push(line);
  lines.forEach((value, index) => context.fillText(value, x, y + index * lineHeight));
  return y + Math.max(1, lines.length) * lineHeight;
};

const imageFromBlob = blob => new Promise((resolve, reject) => {
  const source = new Image();
  const objectUrl = URL.createObjectURL(blob);
  source.onload = () => resolve({ source, objectUrl });
  source.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("O cartaz não pôde ser carregado.")); };
  source.src = objectUrl;
});

async function createShareImage(event) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const context = canvas.getContext("2d");
  const date = event.endDate ? `${prettyDate(event.date)} — ${prettyDate(event.endDate)}` : prettyDate(event.date);
  context.fillStyle = "#10271a";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(245, 246, 238, .58)";
  context.lineWidth = 2;
  roundedRect(context, 32, 32, 1016, 1856, 54);
  context.stroke();
  roundedRect(context, 72, 88, 936, 1080, 22);
  context.fillStyle = "#e7eee0";
  context.fill();
  const response = await fetch(`/api/event-poster/${encodeURIComponent(event.id)}`);
  if (!response.ok) throw new Error("Não foi possível carregar o cartaz oficial.");
  const { source: poster, objectUrl } = await imageFromBlob(await response.blob());
  try {
    const scale = Math.min(936 / poster.naturalWidth, 1080 / poster.naturalHeight);
    const width = poster.naturalWidth * scale;
    const height = poster.naturalHeight * scale;
    context.save();
    roundedRect(context, 72, 88, 936, 1080, 22);
    context.clip();
    context.drawImage(poster, 72 + (936 - width) / 2, 88 + (1080 - height) / 2, width, height);
    context.restore();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
  context.fillStyle = "#f7f5ed";
  roundedRect(context, 32, 1218, 1016, 670, 54);
  context.fill();
  context.fillStyle = "#173420";
  context.font = "700 45px 'DM Sans', Arial, sans-serif";
  context.fillText("Desvio", 94, 1304);
  context.font = "700 78px 'Space Grotesk', Arial, sans-serif";
  const titleBottom = drawWrapped(context, event.title, 94, 1418, 890, 88, 2);
  context.fillStyle = "#254a31";
  context.font = "600 39px 'DM Sans', Arial, sans-serif";
  context.fillText(date, 94, titleBottom + 38);
  context.font = "500 37px 'DM Sans', Arial, sans-serif";
  const placeBottom = drawWrapped(context, `${event.venue} · ${event.city}`, 94, titleBottom + 103, 875, 48, 2);
  context.fillStyle = "#173f27";
  roundedRect(context, 94, Math.max(1700, placeBottom + 46), 330, 106, 53);
  context.fill();
  context.fillStyle = "#f7f5ed";
  context.font = "700 38px 'DM Sans', Arial, sans-serif";
  context.fillText("Ver evento  →", 137, Math.max(1768, placeBottom + 114));
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Não foi possível criar a imagem.");
  return new File([blob], `desvio-${event.id}.png`, { type: "image/png" });
}

const downloadFile = file => {
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(file);
  link.href = objectUrl;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

function render(event, poster) {
  const date = event.endDate ? `${prettyDate(event.date)} — ${prettyDate(event.endDate)}` : prettyDate(event.date);
  const shareUrl = eventUrl(event.id);
  const shareText = `${event.title} — ${date}, ${event.venue}, ${event.city}. Encontrado no Desvio.`;
  const programme = festivalProgramme(event);
  const programmeDates = [...new Set(programme.map(item => item.date))];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue}, ${event.city}`)}`;
  const verification = [event.verifiedAt ? `Fonte revista em ${event.verifiedAt}` : "Fonte oficial indicada", event.salesCheckedAt ? `bilheteira revista em ${event.salesCheckedAt}` : "bilheteira a confirmar"].join(" · ");
  page.innerHTML = `<article class="event-view">
    <div class="event-overview">
      <p class="event-eyebrow">${escapeHtml(event.type || "Concerto")} · ${escapeHtml(event.city)}</p>
      <h1>${escapeHtml(event.title)}</h1>
      <p class="event-lede">${escapeHtml(date)} · ${escapeHtml(event.time || "Horário a confirmar")}<br>${escapeHtml(event.venue)}, ${escapeHtml(event.city)}</p>
    </div>
    <aside class="event-poster-panel">
      <div class="share-card">
        ${poster ? `<button type="button" class="event-poster-trigger" data-event-poster aria-label="Ampliar cartaz oficial de ${escapeHtml(event.title)}"><img src="${escapeHtml(poster)}" alt="Cartaz oficial de ${escapeHtml(event.title)}" /></button>` : `<div class="share-card-empty">Desvio</div>`}
      </div>
    </aside>
    <div class="event-information">
      ${programmeDates.length ? `<section class="festival-programme"><p class="event-eyebrow">Programação</p><div class="festival-tabs" role="tablist" aria-label="Dias do festival">${programmeDates.map((itemDate, index) => `<button type="button" role="tab" data-programme-date="${itemDate}" aria-selected="${index === 0}">${escapeHtml(shortDate(itemDate))}</button>`).join("")}</div>${programmeDates.map((itemDate, index) => `<div class="festival-day-panel" data-programme-panel="${itemDate}" ${index ? "hidden" : ""}>${programme.filter(item => item.date === itemDate).map(item => `<article><time>${escapeHtml(item.time || "Horário a confirmar")}</time><div><strong>${escapeHtml(programmeTitle(event, item.title))}</strong><small>${escapeHtml(item.venue)}</small></div></article>`).join("")}</div>`).join("")}</section>` : ""}
      <div class="event-actions">${ticketButton(event)}<a class="event-source" href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noopener">Fonte oficial ↗</a></div>
      <dl class="event-facts">
        <div><dt>Géneros</dt><dd>${escapeHtml((event.genres || []).join(" · ") || "Por confirmar")}</dd></div>
        <div><dt>Estado da entrada</dt><dd>${escapeHtml(event.availability || "Por confirmar")}</dd></div>
        <div><dt>Bilheteira</dt><dd>${escapeHtml(event.tickets || "Por confirmar")}</dd></div>
        <div><dt>Idade</dt><dd>${escapeHtml(event.age || "Consultar organização")}</dd></div>
        <div><dt>Lotação</dt><dd>${escapeHtml(event.capacity || "Não divulgada")}</dd></div>
        <div><dt>Verificado</dt><dd>${escapeHtml(event.verifiedAt || "Por confirmar")}</dd></div>
        ${event.lineup ? `<div class="event-fact-wide"><dt>Cartaz</dt><dd>${escapeHtml(event.lineup)}</dd></div>` : ""}
      </dl>
      <div class="event-trust"><b>Informação com origem</b><p>${escapeHtml(verification)}. Confirma sempre horários e disponibilidade na fonte oficial.</p><a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener">Ver percurso até ao local ↗</a></div>
    </div>
    <aside class="share-panel">
      <div class="share-copy"><p class="event-eyebrow">Partilhar</p><h2>Leva este concerto contigo.</h2><p>Guarda uma Story pronta ou envia o link do evento.</p></div>
      <div class="share-actions"><button type="button" data-share-image>Partilhar imagem</button><button type="button" class="secondary" data-copy>Copiar link</button></div>
      <details class="share-more"><summary>Mais opções de partilha</summary><div class="share-actions"><button type="button" class="secondary" data-save-image>Guardar imagem</button><button type="button" class="secondary" data-share>Partilhar link</button><a class="secondary" href="mailto:?subject=${encodeURIComponent(`${event.title} — Desvio`)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}">Enviar por email</a></div></details>
      <p class="share-status" aria-live="polite"></p>
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
  const createImage = async () => {
    status.textContent = "A preparar imagem…";
    try { return await createShareImage(event); }
    catch (error) { status.textContent = error.message || "Não foi possível preparar a imagem."; return null; }
  };
  page.querySelector("[data-share-image]").addEventListener("click", async () => {
    const file = await createImage();
    if (!file) return;
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${event.title} — Desvio` });
        status.textContent = "Imagem pronta para publicar.";
      } else {
        downloadFile(file);
        status.textContent = "Imagem guardada. Publica-a no Instagram.";
      }
    } catch { status.textContent = "Partilha cancelada."; }
  });
  page.querySelector("[data-save-image]").addEventListener("click", async () => {
    const file = await createImage();
    if (!file) return;
    downloadFile(file);
    status.textContent = "Imagem guardada.";
  });
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
