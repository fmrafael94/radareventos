const state = { search: "", date: "", genre: "", area: "", district: [], city: [], type: "", highlight: "", page: 1 };
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
const districtFilter = document.querySelector("#district-filter");
const cityFilter = document.querySelector("#city-filter");
const districtMenu = document.querySelector("#district-menu");
const cityMenu = document.querySelector("#city-menu");
const typeSelect = document.querySelector("#type-filter");
const posterLightbox = document.querySelector("#poster-lightbox");
const posterLightboxImage = document.querySelector("#poster-lightbox-image");
const nearbyButton = document.querySelector("#nearby-button");
const nearbyHint = document.querySelector("#nearby-hint");
const featuredRail = document.querySelector("#featured-rail");
const featuredKicker = document.querySelector("#featured-kicker");
const featuredTitle = document.querySelector("#featured-title");
const featuredDescription = document.querySelector("#featured-description");

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

// Poster rule: always look in this order before publishing a visual:
// 1) official event site, 2) that event's concrete Ticketline/BOL/FNAC/etc.
// ticket page, 3) official promoter or venue, 4) municipal/cultural venue.
// Never create an artificial flyer; when this record is absent, the UI says
// so plainly.
const officialPosters = {
  "corroios-2026": ["https://www.cm-seixal.pt/sites/default/files/styles/640x426/public/festas_populares_corroios_2026.png?itok=CsM8ke8c&timestamp=1783007117", "https://www.cm-seixal.pt/evento/festas-populares-de-corroios-2026"],
  "festas-mar-cascais-2026": ["https://www.cascais.pt/sites/default/files/styles/galeria-new/public/imagens/galerias/new/2026_ge_fm_site_1000x500px_programa.jpg?itok=COquiY-c", "https://www.cascais.pt/noticia/musica-esta-de-volta-ao-palco-mais-proximo-do-atlantico"],
  "kalorama-2026": ["https://meokalorama.pt/wp-content/uploads/2026/04/MEO_KLR_BILLING_1080x1350_NO_LOGOS.jpg", "https://meokalorama.pt/en/"],
  "iminente-2026": ["https://festivaliminente.com/assets/images/cartaz-4x5-v2.svg", "https://festivaliminente.com/"],
  "living-tombstone": ["https://everythingisnew.pt/wp-content/uploads/TheLivingTombstone_2026_SITE.jpg", "https://everythingisnew.pt/the-living-tombstone/"],
  "ronnie-wood": ["https://everythingisnew.pt/wp-content/uploads/RonnieWood_2026_AtwSq_SITE_SITE.jpg", "https://everythingisnew.pt/ronnie-wood/"],
  "fat-freddys-drop": ["https://everythingisnew.pt/wp-content/uploads/FatFreddysDrop_2026_SITE.jpg", "https://everythingisnew.pt/fat-freddys-drop-lisboa-2026/"],
  "placebo-porto": ["https://everythingisnew.pt/wp-content/uploads/Placebo_2026_SITE.jpg", "https://everythingisnew.pt/placebo-4/"],
  "placebo-lisboa": ["https://everythingisnew.pt/wp-content/uploads/Placebo_2026_SITE.jpg", "https://everythingisnew.pt/placebo-5/"],
  "richie-campbell": ["https://everythingisnew.pt/wp-content/uploads/RichieCampbell_2026_AtwSq_SITE_SITE.jpg", "https://everythingisnew.pt/richie-campbell-2/"],
  "laura-pausini": ["https://everythingisnew.pt/wp-content/uploads/LauraPausini_2026_SITE.jpg", "https://everythingisnew.pt/laura-pausini-lisboa-2026/"],
  "jungle": ["https://everythingisnew.pt/wp-content/uploads/Jungle_2026_Ph_SITE.jpg", "https://everythingisnew.pt/jungle/"],
  "anastacia": ["https://everythingisnew.pt/wp-content/uploads/Anastacia_2026_SITE.jpg", "https://everythingisnew.pt/anastacia-lisboa-2026/"],
  "brandi-carlile": ["https://everythingisnew.pt/wp-content/uploads/SITE_BrandiCarlile_2026.jpg", "https://everythingisnew.pt/brandi-carlile-lisboa-2026-2/"],
  "saint-levant": ["https://applications-media.feverup.com/image/upload/f_auto,ar_15:8,c_fill/fever2/plan/photo/4e135ed4-7ba2-11f1-81c5-4e26ba31000a.jpeg", "https://feverup.com/m/645845/en?seasonal=p0f172p"],
  "matondi-celebration": ["https://republicadamusica.pt/wp-content/uploads/2026/06/cartaz.jpg", "https://republicadamusica.pt/evento/matondi-celebration/"],
  "andru-donalds": ["https://republicadamusica.pt/wp-content/uploads/2026/06/352_1781107649.jpg", "https://republicadamusica.pt/evento/andru-donalds/"],
  "aveirense-monitor": ["https://teatroaveirense.pt/imagens/eventos/monitor-dinis-mota-nayr-faquira-bela-noia_img669fd9600b290.jpg", "https://www.teatroaveirense.pt/pt/evento/monitor-dinis-mota-nayr-faquira-bela-noia/"],
  "aveirense-ganso": ["https://teatroaveirense.pt/imagens/eventos/ganso-ciclo-novas-quintas_img66f523504e81e.jpg", "https://www.teatroaveirense.pt/pt/evento/ganso-ciclo-novas-quintas/"],
  "aveirense-tindersticks": ["https://teatroaveirense.pt/imagens/eventos/tindersticks_img6728b0224c135.jpg", "https://www.teatroaveirense.pt/pt/evento/tindersticks/"],
  "aveirense-ofb": ["https://teatroaveirense.pt/imagens/eventos/52-aniversario-da-ua-e-28-aniversario-da-ofb_img69302b88728da.jpg", "https://www.teatroaveirense.pt/pt/evento/52-aniversario-da-ua-e-28-aniversario-da-ofb/"],
  "taguspark-carlos-bica": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz155361_grande.jpg", "https://www.bol.pt/Comprar/Bilhetes/180813-ciclo_de_concertos_taguspark_music_sessions-taguspark/"],
  "taguspark-cabrita": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz155361_grande.jpg", "https://www.bol.pt/Comprar/Bilhetes/180813-ciclo_de_concertos_taguspark_music_sessions-taguspark/"],
  "taguspark-ricardo-reis": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz155361_grande.jpg", "https://www.bol.pt/Comprar/Bilhetes/180813-ciclo_de_concertos_taguspark_music_sessions-taguspark/"],
  "outfest-2026": ["https://outfest.pt/wp-content/uploads/2026/03/cropped-FB_Thumbnail.webp", "https://outfest.pt/programa/"],
  "lagos-fado-jazz": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz157695_grande.jpg", "https://centraldeartistas.bol.pt/Comprar/Bilhetes/183512-fado_jazz_uma_so_alma-centro_cultural_lagos/"],
  "ivete-guimaraes": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz156523_grande.jpg", "https://serveasy.bol.pt/Comprar/Bilhetes/182182-ivete_sangalo-multiusos_de_guimaraes/"],
  "rock-dao": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz155627_grande.jpg", "https://lisboaevents.bol.pt/Comprar/Bilhetes/181125-rock_dao_18_setembro-viseu/"],
  "fever-candlelight-natal": ["https://applications-media.feverup.com/image/upload/f_auto,ar_15:8,c_fill/fever2/plan/photo/675fe2d2-1a9f-11f0-8be7-b25552496a35.jpg", "https://feverup.com/m/664959?seasonal=p9d5d4p"],
  "bota-francisco-sales": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz153298_grande.jpg", "https://www.bol.pt/Comprar/Bilhetes/178498-francisco_sales-bota_base_organizada_da_toca_das_artes/"],
  "theatrocirco-contraponto": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz155272_grande.png", "https://www.bol.pt/Comprar/Bilhetes/180722-contraponto_pierre_boulez_frank_zappa_por_remix_ensemble-theatro_circo/"],
  "ana-bacalhau-almada": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz145271_grande.jpg", "https://www.bol.pt/Comprar/Bilhetes/169125-ana_bacalhau-t_m_joaquim_benite/"],
  "esquecimento-global-guimaraes": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz157064_grande.jpg", "https://www.bol.pt/Comprar/Bilhetes/182771-esquecimento_global_jose_nunes_e_luca_argel-c_cultural_vila_flor/"],
  "mario-pacheco-ccb": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz157688_grande.jpg", "https://www.bol.pt/Comprar/Bilhetes/183505-a_musica_de_mario_pacheco-ccb/"],
  "natal-jop-almada": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz145272_grande.jpg", "https://www.bol.pt/Comprar/Bilhetes/169126-concerto_de_natal_2026-teatro_municipal_joaquim_benite/"],
  "chico-chico-ovar": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz157700_grande.jpg", "https://www.bol.pt/Comprar/Bilhetes/183513-chico_chico_let_it_burn_deixa_arder-escola_de_artes_e_oficios/"],
  "figl-lagoa-guitarras": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz157439_grande.jpg", "https://www.bol.pt/Comprar/Bilhetes/183209-27_set_figl_paolodevecchi_salvatoreseminara_cuartetoguitarrasandaluzia-convento_de_s_jose/"],
  "tt-coliseu": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz149443_grande.jpg", "https://www.bol.pt/Comprar/Bilhetes/174178-tt_20_anos_de_rnb_come_closer-coliseu_de_lisboa/"],
  "gil-semedo-coliseu": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz152280_grande.jpg", "https://artistscliveon.bol.pt/Comprar/Bilhetes/177358-gil_semedo_caboswing_novo_e_velho_tour-coliseu_de_lisboa/"],
  "deva-premal-coliseu": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz146420_grande.jpg", "https://www.bol.pt/Comprar/Bilhetes/170711-deva_premal_miten_singing_our_prayers_lisbon_2026-coliseu_de_lisboa/"],
  "billy-corgan-coliseu": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz153784_grande.jpg", "https://www.bol.pt/Comprar/Bilhetes/179076-a_night_of_mellon_collie_and_infinite_sadness_featuring_billy_corgan-coliseu_de_lisboa/"],
  "irina-barros-monsantos": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz151056_grande.jpg", "https://www.bol.pt/Comprar/Bilhetes/175975-irina_barros-monsantos_open_air/"],
  "operafest-anatema": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz155216_grande.jpg", "https://www.bol.pt/Comprar/Bilhetes/180660-anatema_performance_operafest_2026-museu_de_lisboa/"],
  "povoa-boney-m": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz151824_grande.jpg", "https://www.bol.pt/Comprar/Bilhetes/176838-boney_m_povoa_de_varzim-povoa_arena/"],
  "povoa-pedro-abrunhosa": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz151838_grande.jpg", "https://www.bol.pt/Comprar/Bilhetes/176846-pedro_abrunhosa-povoa_arena_cmpv/"],
  "famalicao-samuel-uria": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz156774_grande.jpg", "https://casadasartesvnf.bol.pt/Comprar/Bilhetes/182460-samuel_uria_cine_concerto-casa_das_artes_de_famalicao/"]
};
const legacyOfficialPosterIds = new Set(["fanna-fi-allah","johnny-hooker","ruggero","secret-chord-allgema","einar-solberg","blood-red-shoes","mercury-rev","nazareth","for-the-glory","steve-seagulls","myrath","druga-rika","porangui","city-of-the-sun","tormentor","sbp4","faro-festival-f","under-doom-fest-2026","reign-fury-hardcore-fest-2026","under-doom-2026-09-25","under-doom-2026-09-26","iminente-2026-09-17","iminente-2026-09-18","iminente-2026-09-19","iminente-2026-09-20","festival-f-2026-09-03","festival-f-2026-09-04","festival-f-2026-09-05"]);
EVENTS.forEach(event => {
  const poster = officialPosters[event.id];
  if (poster) [event.image, event.posterSourceUrl] = poster;
  if (legacyOfficialPosterIds.has(event.id) && event.image) event.posterSourceUrl = event.sourceUrl;
  if (event.posterSourceUrl) event.posterVerifiedAt = "2026-08-23";
});

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
      if (select === dateSelect) updateFilter("date", option.value);
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

[dateSelect, genreSelect, typeSelect, areaSelect].forEach(setupCustomSelect);
const multiFilterSync = [];
function setupMultiFilter(button, menu, values, key, allLabel) {
  const sync = () => {
    const selected = state[key];
    button.querySelector("strong").textContent = selected.length ? `${selected.length} selecionado${selected.length === 1 ? "" : "s"}` : allLabel;
    button.classList.toggle("has-value", Boolean(selected.length));
    [...menu.children].forEach(option => option.setAttribute("aria-pressed", String(selected.includes(option.dataset.value))));
  };
  values.forEach(value => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "multi-select-option";
    option.dataset.value = value;
    option.textContent = value;
    option.setAttribute("aria-pressed", "false");
    option.addEventListener("click", () => {
      state[key] = state[key].includes(value) ? state[key].filter(item => item !== value) : [...state[key], value];
      state.page = 1;
      sync();
      render();
    });
    menu.append(option);
  });
  button.addEventListener("click", () => {
    const open = !menu.classList.contains("open");
    document.querySelectorAll(".multi-select-menu.open").forEach(other => other.classList.remove("open"));
    menu.classList.toggle("open", open);
    button.setAttribute("aria-expanded", String(open));
  });
  multiFilterSync.push(sync);
  sync();
}
setupMultiFilter(districtFilter, districtMenu, unique(EVENTS.map(event => event.district)), "district", "Todos os distritos");
setupMultiFilter(cityFilter, cityMenu, unique(EVENTS.map(event => event.city)), "city", "Todos os concelhos");
document.addEventListener("click", event => {
  if (!event.target.closest(".custom-select")) document.querySelectorAll(".custom-select.open").forEach(select => select.classList.remove("open"));
  if (!event.target.closest(".multi-filter-wrap")) {
    document.querySelectorAll(".multi-select-menu.open").forEach(menu => menu.classList.remove("open"));
    [districtFilter, cityFilter].forEach(button => button.setAttribute("aria-expanded", "false"));
  }
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
const hasOfficialPoster = event => Boolean(event.image && event.posterSourceUrl);
const reportUrl = event => `https://github.com/fabio-rafael-sorted/radareventos/issues/new?title=${encodeURIComponent(`Correção: ${event.title}`)}&body=${encodeURIComponent(`Evento: ${event.title}\nData: ${prettyDate(event.date)}\nFonte atual: ${event.sourceUrl}\n\nO que está errado ou falta atualizar?\n`)}`;

let featuredMode = 0;
function renderFeatured() {
  const today = shiftedIso(0);
  const upcoming = EVENTS.filter(event => !event.seriesId && hasOfficialPoster(event) && (event.endDate || event.date) >= today);
  const modes = [
    {
      kicker: "Em destaque",
      title: "Próximos festivais.",
      description: "Os próximos grandes encontros de música em Portugal.",
      events: upcoming.filter(event => eventType(event) === "Festival")
    },
    {
      kicker: "A acontecer",
      title: "Nos próximos 7 dias.",
      description: "Esta seleção roda automaticamente com a agenda da semana.",
      events: upcoming.filter(event => overlapsRange(event, [today, shiftedIso(6)]))
    }
  ].filter(mode => mode.events.length);
  if (!modes.length) return;
  featuredMode %= modes.length;
  const mode = modes[featuredMode];
  featuredKicker.textContent = mode.kicker;
  featuredTitle.textContent = mode.title;
  featuredDescription.textContent = mode.description;
  const featured = mode.events
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  featuredRail.innerHTML = featured.map(event => {
    const date = event.endDate ? `${prettyDate(event.date)} — ${prettyDate(event.endDate)}` : prettyDate(event.date);
    return `<article class="featured-card">
      <button class="featured-poster poster-trigger" type="button" aria-label="Ampliar cartaz oficial de ${event.title}"><img src="${event.image}" alt="Cartaz oficial de ${event.title}" loading="lazy"></button>
      <div class="featured-copy"><p>${eventType(event)} · ${event.city}</p><h3>${event.title}</h3><time datetime="${event.date}">${date}</time><a href="${event.sourceUrl}" target="_blank" rel="noopener">Página oficial ↗</a></div>
    </article>`;
  }).join("");
}

function eventCard(event) {
  const [day, month] = dateParts(event.date);
  const endDay = event.endDate ? eventDate(event.endDate).getDate() : null;
  const fullDate = event.endDate ? `${prettyDate(event.date)} — ${prettyDate(event.endDate)}` : prettyDate(event.date);
  const availability = availabilityLabel(event);
  const statusClass = availability === "Esgotado" ? "sold" : availability === "Cancelado" ? "cancelled" : availability === "Por confirmar" ? "pending" : "";
  const children = festivalChildren(event).sort((a, b) => `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`));
  const groupedDays = [...new Set(children.map(child => child.date))];
  const schedule = children.length ? `<div class="festival-program"><span class="detail-label">${event.endDate ? "Programa por dia / sessões" : "Alinhamento e horário"}</span>${groupedDays.length > 1 ? `<div class="festival-day-tabs" role="tablist">${groupedDays.map((date, index) => `<button type="button" role="tab" data-festival-day="${event.id}-${date}" aria-selected="${index === 0}">${prettyDate(date)}</button>`).join("")}</div>` : ""}${groupedDays.map((date, index) => `<section class="festival-day" data-festival-day-panel="${event.id}-${date}"${index ? " hidden" : ""}><h4>${prettyDate(date)}</h4>${children.filter(child => child.date === date).map(child => `<div class="festival-slot">${hasOfficialPoster(child) ? `<button class="festival-slot-art poster-trigger" type="button" aria-label="Ampliar cartaz oficial de ${child.title}"><img src="${child.image}" alt="Cartaz oficial de ${child.title}" loading="lazy"></button>` : ""}<time>${child.time || "Horário a confirmar"}</time><div><strong>${child.title.replace(/^.*?— /, "")}</strong><span>${child.venue}</span></div><em>${ticketStatus(child)}</em>${programmeAction(child)}</div>`).join("")}</section>`).join("")}</div>` : `<div class="single-program"><span class="detail-label">Alinhamento / horário</span><div class="festival-slot"><time>${event.time || "Horário a confirmar"}</time><div><strong>${event.lineup || event.title}</strong><span>${event.venue}</span></div><em>${ticketStatus(event)}</em>${programmeAction(event)}</div></div>`;
  const art = hasOfficialPoster(event) ? `<button class="event-art poster-trigger" type="button" aria-label="Ampliar cartaz oficial de ${event.title}"><img src="${event.image}" alt="Cartaz oficial de ${event.title}" loading="lazy"><span class="event-art-caption">Ampliar cartaz</span></button>` : `<p class="event-art-missing">Não existe cartaz oficial ainda.</p>`;
  const ticket = event.availability === "Esgotado" ? `<span class="ticket-link ticket-pending">Esgotado</span>` : genericTicketUrl(event.ticketUrl) ? `<span class="ticket-link ticket-pending">Bilheteira oficial ainda não localizada</span>` : `<a class="ticket-link" href="${event.ticketUrl}" target="_blank" rel="noopener">${event.tickets} ↗</a>`;
  const sourceLabel = "Fonte";
  const verification = `<div class="verification-strip" aria-label="Estado da verificação"><span class="verification-item ${event.salesCheckedAt ? "checked" : ""}"><b>Venda</b>${event.salesCheckedAt ? `Confirmada ${event.salesCheckedAt}` : availability}</span><span class="verification-item ${isSpecificEventPage(event.sourceUrl) ? "checked" : ""}"><b>Evento</b>${isSpecificEventPage(event.sourceUrl) ? "Página específica" : "Fonte de agenda"}</span><span class="verification-item ${!genericTicketUrl(event.ticketUrl) ? "checked" : ""}"><b>Bilheteira</b>${!genericTicketUrl(event.ticketUrl) ? "Página específica" : "Por localizar"}</span><span class="verification-item ${hasOfficialPoster(event) ? "checked" : ""}"><b>Cartaz</b>${hasOfficialPoster(event) ? "Oficial confirmado" : "Ainda não localizado"}</span></div>`;
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
      (!state.district.length || group.some(item => state.district.includes(item.district))) &&
      (!state.city.length || group.some(item => state.city.includes(item.city))) &&
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
typeSelect.addEventListener("change", event => updateFilter("type", event.target.value));
document.querySelector("#clear-filters").addEventListener("click", () => {
  Object.assign(state, { search: "", date: "", genre: "", area: "", district: [], city: [], type: "", highlight: "", page: 1 });
  document.querySelector("#search").value = "";
  dateSelect.value = "";
  genreSelect.value = "";
  areaSelect.value = "";
  typeSelect.value = "";
  document.querySelectorAll("[data-quick-pick]").forEach(button => button.setAttribute("aria-pressed", "false"));
  multiFilterSync.forEach(sync => sync());
  [dateSelect, genreSelect, areaSelect, typeSelect].forEach(select => select.dispatchEvent(new Event("change")));
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
document.addEventListener("click", event => {
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
renderFeatured();
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  window.setInterval(() => { featuredMode += 1; renderFeatured(); }, 8000);
}
render();
