const state = { search: "", date: "", genre: "", area: "", district: "", city: "", type: "", highlight: "", page: 1 };
const perPage = 7;
const list = document.querySelector("#event-list");
const resultCount = document.querySelector("#result-count");
const emptyState = document.querySelector("#empty-state");
const pagination = document.querySelector("#pagination");
const pageLabel = document.querySelector("#page-label");
const previousPage = document.querySelector("#previous-page");
const nextPage = document.querySelector("#next-page");
const genreSelect = document.querySelector("#genre-filter");
const dateSelect = document.querySelector("#date-filter");
const areaSelect = document.querySelector("#area-filter");
const districtSelect = document.querySelector("#district-filter");
const citySelect = document.querySelector("#city-filter");
const typeSelect = document.querySelector("#type-filter");
const posterLightbox = document.querySelector("#poster-lightbox");
const posterLightboxImage = document.querySelector("#poster-lightbox-image");
const nearbyButton = document.querySelector("#nearby-button");
const nearbyHint = document.querySelector("#nearby-hint");

const unique = values => [...new Set(values)].sort((a, b) => a.localeCompare(b, "pt"));
const eventType = event => event.type || "Concerto";
const eventDate = iso => new Date(`${iso}T12:00:00`);
const dateParts = iso => {
  const date = eventDate(iso);
  return [String(date.getDate()).padStart(2, "0"), new Intl.DateTimeFormat("pt-PT", { month: "short" }).format(date).replace(".", "")];
};
const prettyDate = iso => new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric" }).format(eventDate(iso));
const areaCentres = {
  "Algarve":[37.02,-7.93], "Alto Alentejo":[39.29,-7.43], "Alto Minho":[41.69,-8.83], "Ave":[41.44,-8.30], "Aveiro":[40.64,-8.65], "Beira Baixa":[40.28,-7.50], "Cávado":[41.55,-8.43], "Douro":[41.16,-7.79], "Grande Lisboa":[38.72,-9.14], "Grande Porto":[41.16,-8.63], "Lezíria do Tejo":[39.24,-8.69], "Madeira":[32.65,-16.91], "Minho":[41.57,-8.29], "Oeiras":[38.69,-9.31], "Oeste":[39.35,-9.38], "Península de Setúbal":[38.53,-8.89], "Região de Aveiro":[40.64,-8.65], "Região de Coimbra":[40.21,-8.43], "Região de Leiria":[39.74,-8.81], "São Miguel":[37.74,-25.67], "Tâmega e Sousa":[41.21,-8.28], "Vale do Sousa":[41.20,-8.28], "Viseu Dão Lafões":[40.66,-7.91], "Área Metropolitana do Porto":[41.16,-8.63]
};
const radians = value => value * Math.PI / 180;
const distanceTo = (fromLat, fromLon, toLat, toLon) => {
  const earthRadius = 6371;
  const dLat = radians(toLat - fromLat);
  const dLon = radians(toLon - fromLon);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(fromLat)) * Math.cos(radians(toLat)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

function addOptions(select, items) {
  items.forEach(item => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    select.append(option);
  });
}

addOptions(genreSelect, unique(EVENTS.flatMap(event => event.genres)));
addOptions(areaSelect, unique(EVENTS.map(event => event.area)));
addOptions(districtSelect, unique(EVENTS.map(event => event.district)));
addOptions(citySelect, unique(EVENTS.map(event => event.city)));
addOptions(typeSelect, unique(EVENTS.map(eventType)));

// Festival programmes use one parent event in the agenda. Their daily
// performances remain attached to the parent and are shown when it opens.
// This keeps the list calm while preserving the complete timetable.
const explicitFestivalChildren = event => EVENTS.filter(child => child.seriesId === event.id);
const dateRange = (start, end) => {
  const dates = [];
  const cursor = eventDate(start);
  const last = eventDate(end);
  while (cursor <= last && dates.length < 31) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};
const festivalChildren = event => {
  const explicit = explicitFestivalChildren(event);
  if (explicit.length || !event.endDate || event.endDate === event.date) return explicit;
  const days = dateRange(event.date, event.endDate);
  // Recurring listings can span months. Keep those compact and transparent
  // instead of fabricating a different artist for every date.
  if (eventDate(event.endDate) > eventDate(event.date) && days.length >= 31) {
    return [{ ...event, id: `${event.id}-programme`, title: `${event.title} — sessões e horários`, date: event.date, seriesId: event.id }];
  }
  return days.map(date => ({
    ...event,
    id: `${event.id}-${date}`,
    title: `${event.title} — programação do dia`,
    date,
    endDate: undefined,
    seriesId: event.id
  }));
};
const festivalParent = event => event.seriesId ? EVENTS.find(parent => parent.id === event.seriesId) : event;
const festivalSeriesPrefixes = {
  "festas-mar-cascais-2026": "festas-mar-",
  "corroios-2026": "corroios-",
  "guimaraes-jazz-2026": "guimaraes-jazz-",
  "kalorama-2026": "kalorama-2026-",
  "outfest-2026": "outfest-2026-",
  "faro-festival-f": "festival-f-2026-",
  "iminente-2026": "iminente-2026-"
};
Object.entries(festivalSeriesPrefixes).forEach(([parentId, prefix]) => {
  EVENTS.forEach(event => {
    if (event.id.startsWith(prefix) && event.id !== parentId) event.seriesId = parentId;
  });
});

const officialArt = {
  "corroios-2026": "https://www.cm-seixal.pt/sites/default/files/styles/640x426/public/festas_populares_corroios_2026.png?itok=CsM8ke8c&timestamp=1783007117",
  "festas-mar-cascais-2026": "https://www.cascais.pt/sites/default/files/styles/galeria-new/public/imagens/galerias/new/2026_ge_fm_site_1000x500px_programa.jpg?itok=COquiY-c",
  "kalorama-2026": "https://meokalorama.pt/wp-content/uploads/2026/08/MEO_KLR_TERCEIRO_ANUNCIO_POST.jpg",
  "iminente-2026": "https://festivaliminente.com/assets/images/cartaz-4x5-v2.svg"
};
EVENTS.forEach(event => { if (officialArt[event.id]) event.image = officialArt[event.id]; });

function setupCustomSelect(select) {
  const wrapper = document.createElement("div");
  wrapper.className = "custom-select";
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "custom-select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  const menu = document.createElement("div");
  menu.className = "custom-select-menu";
  menu.setAttribute("role", "listbox");
  const sync = () => {
    const current = [...select.options].find(option => option.value === select.value) || select.options[0];
    trigger.textContent = current.textContent;
    trigger.classList.toggle("has-value", Boolean(select.value));
    [...menu.children].forEach(option => option.setAttribute("aria-selected", option.dataset.value === select.value ? "true" : "false"));
  };
  [...select.options].forEach(option => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "custom-select-option";
    item.textContent = option.textContent;
    item.dataset.value = option.value;
    item.setAttribute("role", "option");
    item.addEventListener("click", () => {
      select.value = option.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      wrapper.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    });
    menu.append(item);
  });
  trigger.addEventListener("click", () => {
    const open = !wrapper.classList.contains("open");
    document.querySelectorAll(".custom-select.open").forEach(other => other.classList.remove("open"));
    wrapper.classList.toggle("open", open);
    trigger.setAttribute("aria-expanded", String(open));
  });
  select.addEventListener("change", sync);
  wrapper.append(trigger, menu);
  select.classList.add("native-select");
  select.after(wrapper);
  sync();
}

[dateSelect, genreSelect, typeSelect, areaSelect, districtSelect, citySelect].forEach(setupCustomSelect);
document.addEventListener("click", event => {
  if (!event.target.closest(".custom-select")) document.querySelectorAll(".custom-select.open").forEach(select => select.classList.remove("open"));
});
document.querySelector("#event-total").textContent = EVENTS.filter(event => !event.seriesId).length;

// A link is only presented as a ticket button when it points to a concrete
// event page. Homepages and broad agendas remain useful discovery sources,
// but must never be presented as a verified place to buy a ticket.
const genericTicketUrl = value => {
  if (!value) return true;
  try {
    const url = new URL(value);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const genericPaths = ["/", "/agenda", "/eventos", "/eventos/categoria/musica", "/pt/lisboa/concertos", "/en/bilheteira"];
    return genericPaths.includes(path) || /\/(agenda|eventos)(\/|$)/.test(path);
  } catch {
    return true;
  }
};
// Only show a live availability label after checking the event's direct sale
// page. Before that, a ticket link may exist but its remaining stock is unknown.
const availabilityLabel = event => event.salesCheckedAt || ["Esgotado", "Cancelado", "Adiado"].includes(event.availability)
  ? event.availability
  : "Por confirmar";
const ticketStatus = event => event.availability === "Esgotado"
  ? "Esgotado"
  : genericTicketUrl(event.ticketUrl) ? "Bilheteira a confirmar" : event.tickets;
const programmeAction = event => event.availability === "Esgotado"
  ? `<span class="festival-link-pending">Esgotado</span>`
  : genericTicketUrl(event.ticketUrl)
    ? `<span class="festival-link-pending">Bilheteira a confirmar</span>`
    : `<a href="${event.ticketUrl}" target="_blank" rel="noopener">Detalhes ↗</a>`;

const localIso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const shiftedIso = days => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return localIso(date);
};
const dateFilterRange = value => {
  if (!value) return null;
  const today = shiftedIso(0);
  if (value === "today") return [today, today];
  if (value === "week") return [today, shiftedIso(6)];
  if (value === "month") return [today, shiftedIso(30)];
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  const weekday = date.getDay();
  const untilFriday = weekday === 0 ? 5 : weekday <= 5 ? 5 - weekday : 0;
  date.setDate(date.getDate() + untilFriday);
  const start = localIso(date);
  date.setDate(date.getDate() + 2);
  return [start, localIso(date)];
};
const overlapsRange = (event, range) => !range || (event.date <= range[1] && (event.endDate || event.date) >= range[0]);
const isFreeEvent = event => /entrada livre|gratuit[oa]|gr[aá]tis|\bfree\b/i.test(`${event.tickets} ${event.capacity} ${event.title}`);
const isUnderground = event => event.genres.some(genre => /metal|hardcore|punk|doom|death/i.test(genre)) || /bar|local/i.test(eventType(event));
const matchesHighlight = event => !state.highlight ||
  (state.highlight === "free" && isFreeEvent(event)) ||
  (state.highlight === "festival" && eventType(event) === "Festival") ||
  (state.highlight === "underground" && isUnderground(event)) ||
  (state.highlight === "sold" && availabilityLabel(event) === "Esgotado");
const isSpecificEventPage = url => !genericTicketUrl(url);
const reportUrl = event => `https://github.com/fabio-rafael-sorted/radareventos/issues/new?title=${encodeURIComponent(`Correção: ${event.title}`)}&body=${encodeURIComponent(`Evento: ${event.title}\nData: ${prettyDate(event.date)}\nFonte atual: ${event.sourceUrl}\n\nO que está errado ou falta atualizar?\n`)}`;

function eventCard(event) {
  const [day, month] = dateParts(event.date);
  const endDay = event.endDate ? eventDate(event.endDate).getDate() : null;
  const fullDate = event.endDate ? `${prettyDate(event.date)} — ${prettyDate(event.endDate)}` : prettyDate(event.date);
  const availability = availabilityLabel(event);
  const statusClass = availability === "Esgotado" ? "sold" : availability === "Cancelado" ? "cancelled" : availability === "Por confirmar" ? "pending" : "";
  const children = festivalChildren(event).sort((a, b) => `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`));
  const groupedDays = [...new Set(children.map(child => child.date))];
  const schedule = children.length ? `<div class="festival-program"><span class="detail-label">${event.endDate ? "Programa por dia / sessões" : "Alinhamento e horário"}</span>${groupedDays.length > 1 ? `<div class="festival-day-tabs" role="tablist">${groupedDays.map((date, index) => `<button type="button" role="tab" data-festival-day="${event.id}-${date}" aria-selected="${index === 0}">${prettyDate(date)}</button>`).join("")}</div>` : ""}${groupedDays.map((date, index) => `<section class="festival-day" data-festival-day-panel="${event.id}-${date}"${index ? " hidden" : ""}><h4>${prettyDate(date)}</h4>${children.filter(child => child.date === date).map(child => `<div class="festival-slot">${child.image ? `<button class="festival-slot-art poster-trigger" type="button" aria-label="Ampliar cartaz oficial de ${child.title}"><img src="${child.image}" alt="Cartaz oficial de ${child.title}" loading="lazy"></button>` : ""}<time>${child.time || "Horário a confirmar"}</time><div><strong>${child.title.replace(/^.*?— /, "")}</strong><span>${child.venue}</span></div><em>${ticketStatus(child)}</em>${programmeAction(child)}</div>`).join("")}</section>`).join("")}</div>` : `<div class="single-program"><span class="detail-label">Alinhamento / horário</span><div class="festival-slot"><time>${event.time || "Horário a confirmar"}</time><div><strong>${event.lineup || event.title}</strong><span>${event.venue}</span></div><em>${ticketStatus(event)}</em>${programmeAction(event)}</div></div>`;
  const art = event.image ? `<button class="event-art poster-trigger" type="button" aria-label="Ampliar cartaz oficial de ${event.title}"><img src="${event.image}" alt="Cartaz oficial de ${event.title}" loading="lazy"><span class="event-art-caption">Ampliar cartaz</span></button>` : `<p class="event-art-missing">Não existe cartaz oficial ainda.</p>`;
  const ticket = event.availability === "Esgotado" ? `<span class="ticket-link ticket-pending">Esgotado</span>` : genericTicketUrl(event.ticketUrl) ? `<span class="ticket-link ticket-pending">Bilheteira oficial ainda não localizada</span>` : `<a class="ticket-link" href="${event.ticketUrl}" target="_blank" rel="noopener">${event.tickets} ↗</a>`;
  const sourceLabel = "Fonte";
  const verification = `<div class="verification-strip" aria-label="Estado da verificação"><span class="verification-item ${event.salesCheckedAt ? "checked" : ""}"><b>Venda</b>${event.salesCheckedAt ? `Confirmada ${event.salesCheckedAt}` : availability}</span><span class="verification-item ${isSpecificEventPage(event.sourceUrl) ? "checked" : ""}"><b>Evento</b>${isSpecificEventPage(event.sourceUrl) ? "Página específica" : "Fonte de agenda"}</span><span class="verification-item ${!genericTicketUrl(event.ticketUrl) ? "checked" : ""}"><b>Bilheteira</b>${!genericTicketUrl(event.ticketUrl) ? "Página específica" : "Por localizar"}</span><span class="verification-item ${event.image ? "checked" : ""}"><b>Cartaz</b>${event.image ? "Oficial encontrado" : "Ainda não localizado"}</span></div>`;
  return `<details class="event-card">
    <summary>
      <time class="date-box" datetime="${event.date}"><b>${endDay ? `${day}–${endDay}` : day}</b><span>${month}</span></time>
      <span class="event-main"><span class="event-title">${event.title}</span><span class="event-venue">${event.venue} · ${event.city}</span></span>
      <span class="format">${eventType(event)}</span>
      <span class="status ${statusClass}">${availability}</span>
      <span class="chevron">+</span>
    </summary>
    <div class="event-details has-program">
      ${art}
      <div><span class="detail-label">Quando e onde</span><p>${fullDate} · ${event.time}<br>${event.venue}, ${event.city} · ${event.district}</p></div>
      <div><span class="detail-label">Entrada e lotação</span><p>${event.age}<br>Lotação: ${event.capacity}</p></div>
      <div>${ticket}<p class="verified">Verificado: ${event.verifiedAt}<br><a href="${event.sourceUrl}" target="_blank" rel="noopener">${sourceLabel}: ${event.source}</a><br><a class="report-link" href="${reportUrl(event)}" target="_blank" rel="noopener">Informação errada? ↗</a></p></div>
      ${verification}
      ${schedule}
    </div>
  </details>`;
}

function filteredEvents() {
  const query = state.search.trim().toLocaleLowerCase("pt-PT");
  const selectedRange = dateFilterRange(state.date);
  return EVENTS.filter(event => !event.seriesId).filter(event => {
    const group = [event, ...festivalChildren(event)];
    const text = group.flatMap(item => [item.title, item.venue, item.city, item.district, item.area, eventType(item), ...item.genres]).join(" ").toLocaleLowerCase("pt-PT");
    return (!query || text.includes(query)) &&
      group.some(item => overlapsRange(item, selectedRange)) &&
      (!state.genre || group.some(item => item.genres.includes(state.genre))) &&
      (!state.area || group.some(item => item.area === state.area)) &&
      (!state.district || group.some(item => item.district === state.district)) &&
      (!state.city || group.some(item => item.city === state.city)) &&
      (!state.type || group.some(item => eventType(item) === state.type)) &&
      matchesHighlight(event);
  }).sort((a, b) => a.date.localeCompare(b.date));
}

function render() {
  const matches = filteredEvents();
  const pages = Math.max(1, Math.ceil(matches.length / perPage));
  state.page = Math.min(state.page, pages);
  const first = (state.page - 1) * perPage;
  const visible = matches.slice(first, first + perPage);
  list.innerHTML = visible.map(eventCard).join("");
  resultCount.textContent = `${matches.length} ${matches.length === 1 ? "evento" : "eventos"}`;
  emptyState.hidden = matches.length !== 0;
  pagination.hidden = matches.length <= perPage;
  pageLabel.textContent = `Página ${state.page} de ${pages}`;
  previousPage.disabled = state.page === 1;
  nextPage.disabled = state.page === pages;
}

function updateFilter(key, value) { state[key] = value; state.page = 1; render(); }
function renderSources() {
  document.querySelector("#source-groups").innerHTML = SOURCE_GROUPS.map(group => `<article class="source-group"><h3>${group.title}</h3>${group.sources.map(([name, type, url]) => `<a href="${url}" target="_blank" rel="noopener">${name}<span>${type}</span></a>`).join("")}</article>`).join("");
}

document.querySelector("#search").addEventListener("input", event => updateFilter("search", event.target.value));
dateSelect.addEventListener("change", event => updateFilter("date", event.target.value));
genreSelect.addEventListener("change", event => updateFilter("genre", event.target.value));
areaSelect.addEventListener("change", event => updateFilter("area", event.target.value));
districtSelect.addEventListener("change", event => updateFilter("district", event.target.value));
citySelect.addEventListener("change", event => updateFilter("city", event.target.value));
typeSelect.addEventListener("change", event => updateFilter("type", event.target.value));
document.querySelector("#clear-filters").addEventListener("click", () => {
  Object.assign(state, { search: "", date: "", genre: "", area: "", district: "", city: "", type: "", highlight: "", page: 1 });
  document.querySelector("#search").value = "";
  dateSelect.value = "";
  genreSelect.value = "";
  areaSelect.value = "";
  districtSelect.value = "";
  citySelect.value = "";
  typeSelect.value = "";
  document.querySelectorAll("[data-quick-pick]").forEach(button => button.setAttribute("aria-pressed", "false"));
  [dateSelect, genreSelect, areaSelect, districtSelect, citySelect, typeSelect].forEach(select => select.dispatchEvent(new Event("change")));
  render();
});
document.querySelectorAll("[data-quick-pick]").forEach(button => button.addEventListener("click", () => {
  const pick = button.dataset.quickPick;
  const next = state.highlight === pick || (pick === "week" && state.date === "week") ? "" : pick;
  state.highlight = pick === "week" ? "" : next;
  state.date = pick === "week" && next ? "week" : state.date;
  if (pick === "week" && !next) state.date = "";
  dateSelect.value = state.date;
  state.page = 1;
  document.querySelectorAll("[data-quick-pick]").forEach(item => item.setAttribute("aria-pressed", String(item === button && Boolean(next))));
  dateSelect.dispatchEvent(new Event("change"));
}));
nearbyButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    nearbyHint.textContent = "Localização não disponível neste browser.";
    return;
  }
  nearbyButton.disabled = true;
  nearbyHint.textContent = "A localizar a tua área…";
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    const [area, distance] = Object.entries(areaCentres).reduce((closest, [name, [latitude, longitude]]) => {
      const kilometres = distanceTo(coords.latitude, coords.longitude, latitude, longitude);
      return kilometres < closest[1] ? [name, kilometres] : closest;
    }, ["", Infinity]);
    state.area = area;
    state.page = 1;
    areaSelect.value = area;
    nearbyHint.textContent = `${area} · cerca de ${Math.round(distance)} km`;
    nearbyButton.disabled = false;
    areaSelect.dispatchEvent(new Event("change"));
  }, () => {
    nearbyHint.textContent = "Ativa a localização para ver eventos próximos.";
    nearbyButton.disabled = false;
  }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 3600000 });
});
previousPage.addEventListener("click", () => { state.page -= 1; render(); });
nextPage.addEventListener("click", () => { state.page += 1; render(); });
list.addEventListener("click", event => {
  const dayTab = event.target.closest("[data-festival-day]");
  if (dayTab) {
    const programme = dayTab.closest(".festival-program");
    const selected = dayTab.dataset.festivalDay;
    programme.querySelectorAll("[data-festival-day]").forEach(tab => tab.setAttribute("aria-selected", String(tab === dayTab)));
    programme.querySelectorAll("[data-festival-day-panel]").forEach(panel => { panel.hidden = panel.dataset.festivalDayPanel !== selected; });
    return;
  }
  const poster = event.target.closest(".poster-trigger");
  if (!poster) return;
  const image = poster.querySelector("img");
  posterLightboxImage.src = image.currentSrc || image.src;
  posterLightboxImage.alt = image.alt.replace("Cartaz oficial de ", "Cartaz oficial ampliado de ");
  posterLightbox.showModal();
});
posterLightbox.addEventListener("click", event => {
  if (event.target === posterLightbox) posterLightbox.close();
});
posterLightbox.querySelector(".poster-lightbox-close").addEventListener("click", () => posterLightbox.close());

renderSources();
render();
