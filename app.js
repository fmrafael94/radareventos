const state = { search: "", date: "", price: "", ticketPrice: [], genre: [], area: [], district: [], city: [], type: [], highlight: "", view: "list", page: 1 };
const perPage = 7;
const list = document.querySelector("#event-list");
const resultCount = document.querySelector("#result-count");
const agendaEmpty = document.querySelector("#agenda-empty");
const pagination = document.querySelector("#pagination");
const pageLabel = document.querySelector("#page-label");
const previousPage = document.querySelector("#previous-page");
const nextPage = document.querySelector("#next-page");
const genreFilter = document.querySelector("#genre-filter");
const dateSelect = document.querySelector("#date-filter");
const priceSelect = document.querySelector("#price-filter");
const ticketPriceFilter = document.querySelector("#ticket-price-filter");
const ticketPriceMenu = document.querySelector("#ticket-price-menu");
const areaFilter = document.querySelector("#area-filter");
const genreMenu = document.querySelector("#genre-menu");
const areaMenu = document.querySelector("#area-menu");
const typeFilter = document.querySelector("#type-filter");
const typeMenu = document.querySelector("#type-menu");
const districtFilter = document.querySelector("#district-filter");
const cityFilter = document.querySelector("#city-filter");
const districtMenu = document.querySelector("#district-menu");
const cityMenu = document.querySelector("#city-menu");
const posterLightbox = document.querySelector("#poster-lightbox");
const posterLightboxImage = document.querySelector("#poster-lightbox-image");
const nearbyButton = document.querySelector("#nearby-button");
const nearbyHint = document.querySelector("#nearby-hint");
const nearbyEvents = document.querySelector("#nearby-events");
const nearbyRail = document.querySelector("#nearby-rail");
const nearbyPrevious = document.querySelector("#nearby-previous");
const nearbyNext = document.querySelector("#nearby-next");
const featuredRail = document.querySelector("#featured-rail");
let featuredAutoscroll;
let featuredRefreshTimer;
let nearbyPosition;
const filterToggle = document.querySelector("#filter-toggle");
const filterPanel = document.querySelector("#filter-panel");
const calendarView = document.querySelector("#calendar-view");
const calendarGrid = document.querySelector("#calendar-grid");
const calendarLabel = document.querySelector("#calendar-label");
const calendarPrevious = document.querySelector("#calendar-previous");
const calendarNext = document.querySelector("#calendar-next");
const feedbackDialog = document.querySelector("#feedback-dialog");
const feedbackForm = document.querySelector("#feedback-form");
const feedbackTitle = document.querySelector("#feedback-title");
const feedbackContext = document.querySelector("#feedback-context");
const feedbackKind = document.querySelector("#feedback-kind");
const feedbackEventId = document.querySelector("#feedback-event-id");
const feedbackEventTitle = document.querySelector("#feedback-event-title");
const feedbackEventName = document.querySelector("#feedback-event-name");
const feedbackEventField = document.querySelector("#feedback-event-field");
const feedbackTypePicker = document.querySelector("#feedback-type-picker");
const feedbackFields = document.querySelector("#feedback-fields");
const feedbackNameLabel = document.querySelector("#feedback-name-label");
const feedbackEventDetails = document.querySelector("#feedback-event-details");
const feedbackPromoterDetails = document.querySelector("#feedback-promoter-details");
const feedbackPosterField = document.querySelector("#feedback-poster-field");
const feedbackOfficialLabel = document.querySelector("#feedback-official-label");
const feedbackMessageLabel = document.querySelector("#feedback-message-label");
const feedbackStatus = document.querySelector("#feedback-status");
const feedbackSubmit = document.querySelector("#feedback-submit");
const turnstileWrap = document.querySelector("#turnstile-wrap");
const maxPosterUploadBytes = 2 * 1024 * 1024;
const maxPosterDimension = 2400;
let turnstileConfigured = false;

const unique = values => [...new Set(values)].sort((a, b) => a.localeCompare(b, "pt"));
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[character]);
const safePublicUrl = value => {
  try {
    const url = new URL(String(value || ""), location.origin);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};
const searchableText = value => String(value || "").toLocaleLowerCase("pt-PT").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const eventType = event => event.type || "Concerto";
const eventDate = iso => new Date(`${iso}T12:00:00`);
const dateParts = iso => {
  const date = eventDate(iso);
  return [String(date.getDate()).padStart(2, "0"), new Intl.DateTimeFormat("pt-PT", { month: "short" }).format(date).replace(".", "")];
};
const prettyDate = iso => new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric" }).format(eventDate(iso));
const monthLabel = date => new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" }).format(date);
// Keep the agenda forward-looking. Multi-day events remain visible until
// their final day, but a finished festival must never keep the calendar in
// a previous month.
const eventLastDate = event => event.endDate || event.date;
const initialDate = new Date();
initialDate.setHours(12, 0, 0, 0);
const initialToday = `${initialDate.getFullYear()}-${String(initialDate.getMonth() + 1).padStart(2, "0")}-${String(initialDate.getDate()).padStart(2, "0")}`;
const nextAgendaEvent = EVENTS.filter(event => !event.seriesId && eventLastDate(event) >= initialToday)
  .sort((left, right) => left.date.localeCompare(right.date))[0];
const nextAgendaDate = nextAgendaEvent ? (nextAgendaEvent.date < initialToday ? initialToday : nextAgendaEvent.date) : EVENTS.find(event => !event.seriesId)?.date;
let calendarCursor = nextAgendaDate ? eventDate(nextAgendaDate) : new Date();
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

// Poster rule: always look in this order before publishing a visual:
// 1) official event site, 2) that event's concrete Ticketline/BOL/FNAC/etc.
// ticket page, 3) official promoter or venue, 4) municipal/cultural venue.
// Never create an artificial flyer; when this record is absent, the UI says
// so plainly.
const officialPosters = {
  "festa-avante-2026": ["https://www.festadoavante.pcp.pt/images/imagecache/1800_850/7560.jpeg", "https://www.festadoavante.pcp.pt/2026/musica"],
  "festival-moscatel-douro-2026": ["https://cdn.visitportugal.com/sites/default/files/styles/large/public/mediateca/principal-8995.jpg?itok=Wh6jMhYM", "https://www.visitportugal.com/pt-pt/content/festival-do-moscatel-do-douro-4"],
  "festival-jovens-musicos-2026": ["https://antena2.rtp.pt/wp-content/uploads/2026/08/Concerto-Laureados-2025-PJM-Gulbenkian-18-09-2025.jpg", "https://antena2.rtp.pt/pjm/festival-jovens-musicos/em-contagem-decrescente-para-o-festival-jovens-musicos-2026/"],
  "festival-colombo-2026": ["https://www.madeira.gov.pt/Portals/55/Imagens/Eventos/FC%202026%20mupi-696x864-EN.png", "https://eventsmadeira.com/en/event/columbus-festival-2/"],
  "corroios-2026": ["https://www.cm-seixal.pt/sites/default/files/styles/640x426/public/festas_populares_corroios_2026.png?itok=CsM8ke8c&timestamp=1783007117", "https://www.cm-seixal.pt/evento/festas-populares-de-corroios-2026"],
  "festas-mar-cascais-2026": ["https://www.cascais.pt/sites/default/files/styles/galeria-new/public/imagens/galerias/new/2026_ge_fm_site_1000x500px_programa.jpg?itok=COquiY-c", "https://www.cascais.pt/noticia/musica-esta-de-volta-ao-palco-mais-proximo-do-atlantico"],
  "kalorama-2026": ["https://meokalorama.pt/wp-content/uploads/2026/04/MEO_KLR_BILLING_1080x1350_NO_LOGOS.jpg", "https://meokalorama.pt/en/"],
  "iminente-2026": ["https://festivaliminente.com/assets/images/cartaz-4x5-v2.svg", "https://festivaliminente.com/"],
  "living-tombstone": ["https://everythingisnew.pt/wp-content/uploads/TheLivingTombstone_2026_SITE.jpg", "https://everythingisnew.pt/the-living-tombstone/"],
  "ronnie-wood": ["https://everythingisnew.pt/wp-content/uploads/RonnieWood_2026_AtwSq_SITE_SITE.jpg", "https://everythingisnew.pt/ronnie-wood/"],
  "fat-freddys-drop": ["https://everythingisnew.pt/wp-content/uploads/FatFreddysDrop_2026_SITE.jpg", "https://everythingisnew.pt/fat-freddys-drop-lisboa-2026/"],
  "placebo-porto": ["https://everythingisnew.pt/wp-content/uploads/Placebo_2026_SITE.jpg", "https://everythingisnew.pt/placebo-4/"],
  "placebo-lisboa": ["https://everythingisnew.pt/wp-content/uploads/Placebo_2026_SITE.jpg", "https://everythingisnew.pt/placebo-5/"],
  "richie-campbell": ["https://everythingisnew.pt/wp-content/uploads/RichieCampbell_2026_Ph_SITE.jpg", "https://everythingisnew.pt/richie-campbell-2/"],
  "laura-pausini": ["https://everythingisnew.pt/wp-content/uploads/LauraPausini_2026_SITE.jpg", "https://everythingisnew.pt/laura-pausini-lisboa-2026/"],
  "jungle": ["https://everythingisnew.pt/wp-content/uploads/Jungle_2026_Ph_SITE.jpg", "https://everythingisnew.pt/jungle/"],
  "anastacia": ["https://everythingisnew.pt/wp-content/uploads/Anastacia_2026_SITE.jpg", "https://everythingisnew.pt/anastacia-lisboa-2026/"],
  "brandi-carlile": ["https://everythingisnew.pt/wp-content/uploads/SITE_BrandiCarlile_2026.jpg", "https://everythingisnew.pt/brandi-carlile-lisboa-2026-2/"],
  "ccb-cantar-juntos": ["https://www.ccb.pt/wp-content/uploads/2026/05/Cartaz-CJPM_horizontal.jpg", "https://www.ccb.pt/evento/cantar-juntos-pelo-mundo-3/2026-09-12/"],
  "ccb-amor-sin-pena": ["https://www.ccb.pt/wp-content/uploads/2026/05/2000x940_NoaNoa.jpg", "https://www.ccb.pt/evento/amor-sin-pena-lingua-e-memoria-na-musica-iberica-do-seculo-xvi/"],
  "ccb-beethoven-5": ["https://www.ccb.pt/wp-content/uploads/2026/05/2000x940_OMLSteven-2.jpg", "https://www.ccb.pt/evento/sinfonia-n-o-5-de-beethoven/"],
  "ccb-big-bang": ["https://www.ccb.pt/wp-content/uploads/2026/05/festivalbigbang2026.png", "https://www.ccb.pt/evento/festival-big-bang-lx2026/2026-10-02/"],
  "ccb-mike-stern": ["https://www.ccb.pt/wp-content/uploads/2026/03/mike_stern_1920x1080_NOINFO-2.jpg", "https://www.ccb.pt/evento/mike-stern-band/"],
  "ccb-handel": ["https://www.ccb.pt/wp-content/uploads/2026/05/2000x940_HandelPorLesMusiciensDuLouvredestaque.jpg", "https://www.ccb.pt/evento/handel/"],
  "ccb-margarida-campelo": ["https://www.ccb.pt/wp-content/uploads/2026/06/2000x940_MargaridaCampelo_MariaBicker-1.jpg", "https://www.ccb.pt/evento/margarida-campelo/"],
  "ccb-boca-livre": ["https://www.ccb.pt/wp-content/uploads/2026/07/Boca-Canta-Edudestaque.jpeg", "https://www.ccb.pt/evento/boca-canta-edu/"],
  "ccb-trio-fantasma": ["https://www.ccb.pt/wp-content/uploads/2026/06/trioArkadia_2000x940.jpg", "https://www.ccb.pt/evento/trio-fantasma-de-beethoven/"],
  "ccb-joana-gama": ["https://www.ccb.pt/wp-content/uploads/2026/05/2000x940_UmaMenteNoCoracaodestaquejpg.jpg", "https://www.ccb.pt/evento/a-mind-in-the-heart-de-ivan-vukosavljevic/"],
  "ccb-pedro-melo-alves": ["https://www.ccb.pt/wp-content/uploads/2026/06/Omniae-Large-Ensemble-Lais-Pereira.jpg", "https://www.ccb.pt/evento/pedro-melo-alves-omniae-large-ensemble/"],
  "ccb-carmen": ["https://www.ccb.pt/wp-content/uploads/2026/05/CARMEN_2000x940.jpg", "https://www.ccb.pt/evento/carmen-de-bizet/2026-10-28/"],
  "ccb-marco-rodrigues": ["https://www.ccb.pt/wp-content/uploads/2025/09/2000x940-marco-Rodrigues.jpg", "https://www.ccb.pt/evento/marco-rodrigues-canta-carlos-do-carmo/"],
  "ccb-100-miles": ["https://www.ccb.pt/wp-content/uploads/2026/05/100miles-poster-ccb-lisbonVF-WEB-featured-01.jpg", "https://www.ccb.pt/evento/100-miles-centennial-celebration-of-miles-davis/"],
  "ccb-cancioneiro-elvas": ["https://www.ccb.pt/wp-content/uploads/2026/05/Sete-Lágrimas-credito-Denys-Stetsenko-2.jpg", "https://www.ccb.pt/evento/cancioneiro-de-elvas/"],
  "ccb-bolero-ravel": ["https://www.ccb.pt/wp-content/uploads/2026/05/BoleroDeRavelPrancheta-destaque-1.jpg", "https://www.ccb.pt/evento/o-bolero-de-ravel/"],
  "ccb-alan-stivell": ["https://www.ccb.pt/wp-content/uploads/2026/03/Alan_banner_fnac_1920x1080-1.jpg", "https://www.ccb.pt/evento/alan-stivell-misty-fest/"],
  "ccb-nancy-vieira": ["https://www.ccb.pt/wp-content/uploads/2026/05/Nancyfrancisco_banner_fnac_destaque.jpg", "https://www.ccb.pt/evento/nancy-vieira-francisco-sassetti-misty-fest/"],
  "ccb-maria-joao": ["https://www.ccb.pt/wp-content/uploads/2026/05/mariajoao_banner_fnac_1920x1080-1.jpg", "https://www.ccb.pt/evento/maria-joao-joao-farinha-misty-fest/"],
  "ccb-eliana-glass": ["https://www.ccb.pt/wp-content/uploads/2026/05/Eliana_news_1000x600.jpg", "https://www.ccb.pt/evento/eliana-glass-misty-fest/"],
  "ccb-gospel-choir": ["https://www.ccb.pt/wp-content/uploads/2026/04/destaque_gospelchoir.jpg", "https://www.ccb.pt/evento/black-heritage-gospel-choir/"],
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
  ,"gnration-maria-amaro-calgon": ["https://www.gnration.pt/wp-content/uploads/2026/07/maria-amaro-calgon.jpg", "https://www.gnration.pt/event/2026/maria-amaro-calgon/"]
  ,"gnration-coral-autotune": ["https://www.gnration.pt/wp-content/uploads/2026/07/grupo-coral-do-auto-tune.jpg", "https://www.gnration.pt/event/2026/grupo-coral-do-auto-tune/"]
  ,"gnration-ocenpsiea": ["https://www.gnration.pt/wp-content/uploads/2026/07/ocenpsiea.jpg", "https://www.gnration.pt/event/2026/ocenpsiea/"]
  ,"gnration-kalia-vandever": ["https://www.gnration.pt/wp-content/uploads/2026/07/kalia-vandever.png", "https://www.gnration.pt/event/2026/kalia-vandever/"]
  ,"gnration-zona-franca": ["https://www.gnration.pt/wp-content/uploads/2026/07/zona-franca_-fabio-krayze-x-dj-poco.jpg", "https://www.gnration.pt/event/2026/zona-franca-fabio-krayze-x-dj-poco/"]
  ,"gnration-ana-teresa-pereira": ["https://www.gnration.pt/wp-content/uploads/2026/07/radiografia-9-%E2%80%94-ana-teresa-pereira.jpg", "https://www.gnration.pt/event/2026/radiografia-9-ana-teresa-pereira/"]
  ,"gnration-midori-hirano": ["https://www.gnration.pt/wp-content/uploads/2026/07/midori-hirano.jpg", "https://www.gnration.pt/event/2026/midori-hirano/"]
  ,"gnration-joana-sa": ["https://www.gnration.pt/wp-content/uploads/2026/07/joana-sa.jpg", "https://www.gnration.pt/event/2026/joana-sa-2/"]
  ,"gnration-travo": ["https://www.gnration.pt/wp-content/uploads/2026/07/travo.jpg", "https://www.gnration.pt/event/2026/travo/"]
  ,"gnration-easter-island-head": ["https://www.gnration.pt/wp-content/uploads/2026/07/ex-easter-island-head.jpg", "https://www.gnration.pt/event/2026/ex-easter-island-head/"]
  ,"gnration-ana-lua-caiano": ["https://www.gnration.pt/wp-content/uploads/2026/06/ana-lua-caiano.png", "https://www.gnration.pt/event/2026/ana-lua-caiano/"]
  ,"gnration-angel-bat-dawid": ["https://www.gnration.pt/wp-content/uploads/2026/07/angel-bat-dawid.jpg", "https://www.gnration.pt/event/2026/angel-bat-dawid/"]
  ,"gnration-park-jiha": ["https://www.gnration.pt/wp-content/uploads/2026/07/park-jiha.jpg", "https://www.gnration.pt/event/2026/park-jiha/"]
  ,"gnration-felicia-atkinson": ["https://www.gnration.pt/wp-content/uploads/2026/07/felicia-atkinson.jpg", "https://www.gnration.pt/event/2026/felicia-atkinson/"]
  ,"gnration-bvhz": ["https://www.gnration.pt/wp-content/uploads/2026/07/ocupa-bvhz.jpg", "https://www.gnration.pt/event/2026/bvhz/"]
  ,"gnration-joao-ms": ["https://www.gnration.pt/wp-content/uploads/2026/07/ocupa-joao-ms.jpg", "https://www.gnration.pt/event/2026/joao-ms/"]
  ,"gnration-iav": ["https://www.gnration.pt/wp-content/uploads/2026/07/ocupa-iav.jpg", "https://www.gnration.pt/event/2026/iav/"]
  ,"gnration-jose-israel": ["https://www.gnration.pt/wp-content/uploads/2026/07/ocupa-jose-rios-israel-machado.jpg", "https://www.gnration.pt/event/2026/jose-goncalves-rios-israel-machado/"]
  ,"gnration-maquina-scuru": ["https://www.gnration.pt/wp-content/uploads/2026/07/maquina-scuru-fitchadu.jpg", "https://www.gnration.pt/event/2026/maquina-scuru-fitchadu/"]
  ,"vul-sobass-friends": ["https://static1.squarespace.com/static/65d770165e44f6173a5c3868/662faee562de8c5dc364cd19/6a71e8c091dccd7950b113ac/1786025095026/Sobass+Friends+Story.jpeg?format=1500w", "https://vulisboa.com/eventos/sobass-friends-04-09"]
  ,"vul-omar-perry": ["https://static1.squarespace.com/static/65d770165e44f6173a5c3868/662faee562de8c5dc364cd19/6a749807ea1fcd7b69922b97/1786380725512/OMAR+PERRY+POST+%281%29.png?format=1500w", "https://vulisboa.com/eventos/2-aniversario-atlantic-sound-omar-perry-friends"]
  ,"vul-micronova-bungee": ["https://static1.squarespace.com/static/65d770165e44f6173a5c3868/662faee562de8c5dc364cd19/6a748a7d6a74a53148b9f7a2/1786647385733/bungee+x+micronova+DEFINITIVO+1440X1080.jpg?format=1500w", "https://vulisboa.com/eventos/micronova-x-bungee-day-night"]
  ,"vul-afro-encircle": ["https://static1.squarespace.com/static/65d770165e44f6173a5c3868/662faee562de8c5dc364cd19/6a70d2bad808af4df7175dba/1786980035844/LOGO+AFROENCIRCLE.png?format=1500w", "https://vulisboa.com/eventos/afro-encircle-setembro"]
  ,"vul-possivel": ["https://static1.squarespace.com/static/65d770165e44f6173a5c3868/662faee562de8c5dc364cd19/6a63d4c0e65ccc609775846e/1786448584315/Possi%CC%81vel.jpg?format=1500w", "https://vulisboa.com/eventos/possvel-18-setembro"]
  ,"vul-sensorial-sounds": ["https://static1.squarespace.com/static/65d770165e44f6173a5c3868/662faee562de8c5dc364cd19/6a720d5f2c44d66fc4bb2cac/1786041872052/IMG_1138.PNG?format=1500w", "https://vulisboa.com/eventos/sensorial-sounds"]
  ,"vul-kizomba-rua": ["https://static1.squarespace.com/static/65d770165e44f6173a5c3868/662faee562de8c5dc364cd19/6a70d0ebb5cf2f5353b8a194/1786459324980/KNR+logo+vertical.png?format=1500w", "https://vulisboa.com/eventos/kizomba-na-rua-setembro"]
  ,"vul-afterglow": ["https://static1.squarespace.com/static/65d770165e44f6173a5c3868/662faee562de8c5dc364cd19/6a7f38d01a023d011a07a548/1786722893165/AFTERGLOW+logo.png?format=1500w", "https://vulisboa.com/eventos/afterglow-music-session-26-09"]
  ,"vul-riot": ["https://static1.squarespace.com/static/65d770165e44f6173a5c3868/662faee562de8c5dc364cd19/6a74af2fa3246f1b37497569/1786365717090/RIOT+LOGO.png?format=1500w", "https://vulisboa.com/eventos/riot-x-vul-october"]
  ,"vul-beleza-abstracta": ["https://static1.squarespace.com/static/65d770165e44f6173a5c3868/662faee562de8c5dc364cd19/6a74b54af480dc7087705ef1/1786033958848/beleza+abstracta+logo.png?format=1500w", "https://vulisboa.com/eventos/beleza-abstracta"]
  ,"vul-fatal-move": ["https://static1.squarespace.com/static/65d770165e44f6173a5c3868/662faee562de8c5dc364cd19/6a4bcee521561e4506d88912/1783353398892/FATAL+MOVE.jpeg?format=1500w", "https://vulisboa.com/eventos/sportswear-bookings-presents-fatal-move-/-outta-spite-/-nopath"]
  ,"campo-pequeno-alma-iberica": ["https://www.sagrescampopequeno.pt/uploads/WhatsApp%20Image%202026-04-23%20at%2009.21.16.jpeg", "https://www.sagrescampopequeno.pt/pt/agenda/alma-iberica"]
  ,"campo-pequeno-sigur-ros": ["https://www.sagrescampopequeno.pt/uploads/cropped/SIgurRos_2026_AtwSq_cpequeno_site_destaque_crop_69b7f3c7814ec.jpg", "https://www.sagrescampopequeno.pt/pt/agenda/sigur-ros-the-orchestral-tour"]
  ,"campo-pequeno-dire-straits-legacy": ["https://www.sagrescampopequeno.pt/uploads/cropped/LISBOA%20DIRE%20STRAITS%20%20%281000%20x%201450%20px%29%20%281000%20x%201450%20px%29%20%281%29_crop_699f1ef1e920a.jpg", "https://www.sagrescampopequeno.pt/pt/agenda/dire-straits-legacy-europa-tour-2026"]
  ,"campo-pequeno-roupa-nova": ["https://www.sagrescampopequeno.pt/uploads/4%20%281%29.jpg", "https://www.sagrescampopequeno.pt/pt/agenda/simplesmente-roupa-nova"]
  ,"campo-pequeno-alphaville": ["https://www.sagrescampopequeno.pt/uploads/eventos/alphaville-2026.png", "https://www.sagrescampopequeno.pt/pt/agenda/alphaville"]
  ,"campo-pequeno-titas": ["https://www.sagrescampopequeno.pt/uploads/WhatsApp%20Image%202026-05-25%20at%2009.28.01%20%283%29.jpeg", "https://www.sagrescampopequeno.pt/pt/agenda/titas"]
  ,"campo-pequeno-cat-power": ["https://www.sagrescampopequeno.pt/uploads/cropped/CatPower_banner_bol_740X960_crop_69caa0b0b60d0.jpg", "https://www.sagrescampopequeno.pt/pt/agenda/cat-power"]
  ,"campo-pequeno-this-is-michael": ["https://www.sagrescampopequeno.pt/uploads/Design%20sem%20nome%20%2840%29.png", "https://www.sagrescampopequeno.pt/pt/agenda/this-is-michael"]
  ,"campo-pequeno-nemanus": ["https://www.sagrescampopequeno.pt/uploads/cropped/NEMANUS_LX_POST_1200x1200px_crop_6936e33c0befa.jpg", "https://www.sagrescampopequeno.pt/pt/agenda/nemanus"]
  ,"campo-pequeno-beatles-symphonic": ["https://www.sagrescampopequeno.pt/uploads/TBSF_2026_AtwVrtS_cpequeno_site_agenda.jpg", "https://www.sagrescampopequeno.pt/pt/agenda/the-beatles-symphonic-fantasy"]
  ,"campo-pequeno-music-circus": ["https://www.sagrescampopequeno.pt/uploads/WhatsApp%20Image%202026-06-22%20at%2016.42.10.jpeg", "https://www.sagrescampopequeno.pt/pt/agenda/music-circus-show-on-ice-with-highlights-of-frozen"]
  ,"casamusica-choro-bastos": ["https://casadamusica.com/wp-content/uploads/2026/06/20260903-clube-choro-porto-cartao.jpg", "https://casadamusica.com/event/clube-choro-do-porto-convida-cristovao-bastos-e-ilana-volcov/?selected_session=52898"]
  ,"casamusica-barananu": ["https://casadamusica.com/wp-content/uploads/2026/05/20260904-barananu-cartao.jpg", "https://casadamusica.com/event/barananu/?selected_session=51635"]
  ,"casamusica-fischer-z": ["https://casadamusica.com/wp-content/uploads/2026/02/20260905-fischer-z-cartao.jpg", "https://casadamusica.com/event/fischer-z/?selected_session=48427"]
  ,"casamusica-bonds-festival": ["https://casadamusica.com/wp-content/uploads/2026/06/20260919-bonds-festival-cartao.jpg", "https://casadamusica.com/event/bonds-festival/"]
  ,"casamusica-berlioz": ["https://casadamusica.com/wp-content/uploads/2025/11/20260920-berlioz-em-italia-cartao.jpg", "https://casadamusica.com/event/berlioz-em-italia/"]
  ,"casamusica-mario-biondi": ["https://casadamusica.com/wp-content/uploads/2026/05/20260930-mario-biondi-cartao.jpg", "https://casadamusica.com/event/mario-biondi/"]
  ,"casamusica-grant-lee": ["https://casadamusica.com/wp-content/uploads/2026/05/20261007-grant-lee-philips-cartao.jpg", "https://casadamusica.com/event/grant-lee-philips/"]
  ,"casamusica-rita-redshoes": ["https://casadamusica.com/wp-content/uploads/2026/05/20261024-rita-redshoes-cartao.jpg", "https://casadamusica.com/event/rita-redshoes/"]
  ,"viriato-voz-rock": ["https://www.teatroviriato.com/contents/imported_images/calendario_a_voz_rock_1725023756.jpg", "https://www.teatroviriato.com/pt/programacao/espetaculo/a-voz-do-rock-and-convidadas"]
  ,"viriato-luis-lapa": ["https://www.teatroviriato.com/contents/imported_images/calendario_cantigas_lua_1578657789.jpg", "https://www.teatroviriato.com/pt/programacao/espetaculo/luis-lapa-cantigas-da-lua"]
  ,"viriato-nanook": ["https://www.teatroviriato.com/contents/imported_images/calendario_nanok1_1694195711.jpg", "https://www.teatroviriato.com/pt/programacao/espetaculo/nanook-o-esquimo"]
  ,"viriato-lagrimas-mar": ["https://www.teatroviriato.com/contents/imported_images/calendario_arnaldo_antunes_1694196828.jpg", "https://www.teatroviriato.com/pt/programacao/espetaculo/lagrimas-no-mar"]
  ,"viriato-kevin-morby": ["https://www.teatroviriato.com/contents/imported_images/calendario_kevin_morby_1719590972.jpg", "https://www.teatroviriato.com/pt/programacao/espetaculo/kevin-morby"]
  ,"viriato-ballake-piers": ["https://www.teatroviriato.com/contents/show/7f99d50edc9f59e5.webp", "https://www.teatroviriato.com/pt/programacao/espetaculo/ballake-sissoko-and-piers-faccini"]
  ,"viriato-sophia": ["https://www.teatroviriato.com/contents/imported_images/calendario_sophia_1694440897.jpg", "https://www.teatroviriato.com/pt/programacao/espetaculo/sophia-188"]
  ,"viriato-manel-cruz": ["https://www.teatroviriato.com/contents/imported_images/calendario_manel_cruz_1694441113.jpg", "https://www.teatroviriato.com/pt/programacao/espetaculo/manel-cruz"]
  ,"viriato-carminho": ["https://www.teatroviriato.com/contents/imported_images/calendario_carminho_1725032276.jpg", "https://www.teatroviriato.com/pt/programacao/espetaculo/carminho"]
  ,"leiria-carolina-deus": ["https://leiriagenda.cm-leiria.pt/uploads/agenda/eb0c3830b118aaecd6a104e62aae905e/carolinadedeus.jpg", "https://leiriagenda.cm-leiria.pt/pt/agenda/carolina-de-deus-3"]
  ,"leiria-jazz-dixie-gang": ["https://leiriagenda.cm-leiria.pt/uploads/agenda/7f7fb08c24229d91cdbcf776f828b001/leiriagenda_jazz_no_centro_historico.jpg", "https://leiriagenda.cm-leiria.pt/pt/agenda/jazz-no-centro-historico-dixie-gang"]
  ,"leiria-uhf-cartel": ["https://leiriagenda.cm-leiria.pt/uploads/agenda/34cf457ec154b56e36ba035018ccb363/uhf.jpeg", "https://leiriagenda.cm-leiria.pt/pt/agenda/concerto-solidario-uhf-e-the-cartel"]
  ,"leiria-valter-lobo": ["https://leiriagenda.cm-leiria.pt/uploads/agenda/68281920a2ffb5a337f30111b468bed6/copia_de_copia_de_20221202_valterlobo_0055_9327_sp_gabriela_mo.jpg", "https://leiriagenda.cm-leiria.pt/pt/agenda/valter-lobo"]
  ,"leiria-juntos-musica": ["https://leiriagenda.cm-leiria.pt/uploads/agenda/e915756fd241c0b63c02e925191f1670/imagem_002.jpg", "https://leiriagenda.cm-leiria.pt/pt/agenda/juntos-pela-musica"]
  ,"leiria-mendelssohn": ["https://leiriagenda.cm-leiria.pt/uploads/agenda/6232a78307be29f6f81cd2dd437cb0e6/zukerman_1600-992x558.jpg", "https://leiriagenda.cm-leiria.pt/pt/agenda/ciclo-mendelssohn--integral-das-sinfonias-e-dos-concertos"]
  ,"leiria-em-casa-amalia": ["https://teatrojlsilva.pt/storage/events/57gQygdyplUMj5Q3qqphf0J3JcPHYhlw54xoQXXd.png", "https://www.teatrojlsilva.pt/evento/em-casa-damalia-o-concerto-ao-vivo"]
  ,"leiria-diz-concerto": ["https://leiriagenda.cm-leiria.pt/uploads/agenda/4182733be7371d2eb2ac35c685e1baf9/diz_concerto.jpg", "https://leiriagenda.cm-leiria.pt/pt/agenda/diz--concerto"]
  ,"leiria-orquestra-jazz": ["https://leiriagenda.cm-leiria.pt/uploads/agenda/a6157e37db04afb5aa34f96b9830c870/rquestra_de_jazz.jpg", "https://leiriagenda.cm-leiria.pt/pt/agenda/orquestra-jazz-de-leiria-christian-mcbride"]
  ,"ccb-sul": ["https://www.ccb.pt/wp-content/uploads/2025/09/2000x940_SUL-1.jpg", "https://www.ccb.pt/evento/sul/"]
  ,"ccb-barbara-hendricks": ["https://www.ccb.pt/wp-content/uploads/2026/04/Barbara_Hendricks_2000x940.jpg", "https://www.ccb.pt/evento/still-on-the-road-to-freedom/"]
  ,"ccb-al-di-meola": ["https://www.ccb.pt/wp-content/uploads/2026/03/AlDiMeola_banner_fnac_1920x1080.jpg", "https://www.ccb.pt/evento/al-di-meola-misty-fest/"]
  ,"ccb-jazz-nights": ["https://www.ccb.pt/wp-content/uploads/2026/04/LauraMammalAnne_banner_fnac_1920x1080.jpg", "https://www.ccb.pt/evento/contemporary-jazz-nights-misty-fest/"]
  ,"ccb-youn-sun-nah": ["https://www.ccb.pt/wp-content/uploads/2026/05/Youn_banner_fnac_1920x1080-1.jpg", "https://www.ccb.pt/evento/youn-sun-nah-misty-fest/"]
  ,"ccb-galaxia-vivaldi": ["https://www.ccb.pt/wp-content/uploads/2026/05/2000x940_GalaxiaVivaldi.jpg", "https://www.ccb.pt/evento/galaxia-vivaldi/"]
  ,"ccb-glenn-miller": ["https://www.ccb.pt/wp-content/uploads/2025/04/GMO_XMAS3_2000x940-2.jpg", "https://www.ccb.pt/evento/glenn-miller-orchestra-4/"]
  ,"ccb-cabaret-songs": ["https://www.ccb.pt/wp-content/uploads/2026/05/2000x940_CabaretSongs.jpg", "https://www.ccb.pt/evento/cabaret-songs/"]
  ,"ccb-bach-natal": ["https://www.ccb.pt/wp-content/uploads/2026/05/2000x940_ConcertoDeNatal.jpg", "https://www.ccb.pt/evento/concerto-de-natal-missa-em-si-menor-de-bach/"]
  ,"amon-amarth": ["https://www.primeartists.eu/wp-content/uploads/2026/04/AmonAmarth-Evento-Main-2026.jpg", "https://www.primeartists.eu/amonamarth-2026/"]
  ,"ezhel-lisboa-2026": ["https://www.primeartists.eu/wp-content/uploads/2026/01/Ezhel-Evento-Main-2026-1.jpg", "https://www.primeartists.eu/ezhel-2026/"]
  ,"indie-music-fest": ["https://indiemusicfest.pt/wp-content/uploads/2026/04/Landing-Page-Indie-Music-Fest-2026.jpg", "https://indiemusicfest.pt/?page_id=882"]
  ,"ccb-christian-loffler": ["https://www.ccb.pt/wp-content/uploads/2026/03/Christian_banner_ticketline_1200x628.jpg", "https://www.ccb.pt/evento/until-we-meet-again-misty-fest/"]
  ,"sara-correia-porto-1": ["https://blueticketcdn.pt/imagesserver/E15763_36_PT.jpg?v=7156c1c69d889bc7401de39ab1df23fc", "https://www.wook.pt/en/bilheteira/eventos/sara-correia/32903842"]
  ,"sara-correia-porto-2": ["https://blueticketcdn.pt/imagesserver/E15763_36_PT.jpg?v=7156c1c69d889bc7401de39ab1df23fc", "https://www.wook.pt/en/bilheteira/eventos/sara-correia/32903842"]
  ,"rui-veloso-porto": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz145596_grande.jpg?v=1", "https://lisboaevents.bol.pt/Comprar/Bilhetes/169490-rui_veloso_trio-super_bock_arena/"]
  ,"transvision-lisboa": ["https://www.clap-box.com/images/TransvisionVamp.jpg", "https://www.clap-box.com/"]
  ,"transvision-porto": ["https://www.clap-box.com/images/TransvisionVamp.jpg", "https://www.clap-box.com/"]
  ,"evanescence": ["https://blueticketcdn.pt/imagesserver/E15722_36_PT.jpg", "https://www.wook.pt/bilheteira/eventos/evanescence-2026-world-tour/32884851"]
  ,"moonspell-sintra-2026": ["https://moonspell.com/galeria/images/Moonspell-Sintra-socialmedia-1920x1005.jpg", "https://moonspell.com/tours/-/live-in-sintra-81/"]
  ,"portalegre-core-fest-set": ["https://static.wixstatic.com/media/10c2c4_9fcf0e3c7ab8469fb1b675d3ac36c439~mv2.jpg", "https://www.portalegrecore.com/portalegre-core-fest"]
  ,"portalegre-core-fest-nov": ["https://static.wixstatic.com/media/10c2c4_9fcf0e3c7ab8469fb1b675d3ac36c439~mv2.jpg", "https://www.portalegrecore.com/portalegre-core-fest"]
  ,"semibreve-2026": ["https://www.gnration.pt/wp-content/uploads/2026/07/semibreve.jpg", "https://www.gnration.pt/event/2026/semibreve-4/"]
  ,"casa-capitao-abertura": ["https://casa-capitao.com/wp-content/uploads/2025/07/Untitled-1-5.jpg", "https://casa-capitao.com/evento/festa-de-abertura/"]
  ,"guimaraes-jazz-2026": ["https://img.bndlyr.com/nf1zldbhad/_assets/artemis_cjohn-abbott_2.jpeg?fit=cover&w=800&h=600", "https://www.ccvf.pt/en/detail-eventos/20261112-guimaraes-jazz-2026-geral/"]
  ,"theatrocirco-sensible-soccers": ["https://theatrocirco.com/wp-content/uploads/2026/06/Sensible-Soccers_Vertical-site.jpg", "https://theatrocirco.com/programa/"]
  ,"theatrocirco-noite-branca-opera": ["https://theatrocirco.com/wp-content/uploads/2026/07/Papa-est-mort-vertical.jpg", "https://theatrocirco.com/event/papa-est-mort/"]
  ,"theatrocirco-xxx-trovas": ["https://theatrocirco.com/wp-content/uploads/2026/07/Trovas_Vertical.jpg", "https://theatrocirco.com/programa/"]
  ,"figuras-rui-massena": ["https://teatrodasfiguras.pt/uploads/Eventos/2026/Outubro/Parents_House_MINIATURA.jpg?file=neYg9w9WPAIKcwfYcAEXFA", "https://teatrodasfiguras.pt/agenda/parents-house-piano-solo"]
  ,"figuras-pedro-abrunhosa": ["https://teatrodasfiguras.pt/uploads/Eventos/2026/Outubro/Pedro_Abrunho_EVENTO.jpg?file=vOjgCZDzIZjYzfgI9RlIkoV8Br7o97DZ8NWgycYg3q-hf-xpzSgMJB_HMG8cyyPY", "https://teatrodasfiguras.pt/agenda/pedro-abrunhosa"]
  ,"figuras-zambujo": ["https://teatrodasfiguras.pt/uploads/Eventos/2026/Dezembro/Ant%C3%B3nio_Zambujo_FINAL_EVENTO.jpg?file=rUBwN_5efRCxaiiMme2F7kkyW94j7YgChuGGWeoriKuJxEKlX2La5jILzylIeU8f", "https://teatrodasfiguras.pt/agenda/antonio-zambujo"]
  ,"aveirense-schonnbrunn": ["https://www.teatroaveirense.pt/imagens/eventos/schonbrunn-palace-orchestra-vienna-from-strauss-to-lehar-an-evening-through-viennas-golden-age_img6a3d48b753c48.jpg", "https://www.teatroaveirense.pt/pt/evento/schonbrunn-palace-orchestra-vienna/"]
  ,"aveirense-susie-filipe": ["https://www.teatroaveirense.pt/imagens/eventos/susie-filipe-banda-amizade-banda-sinfonica-de-aveiro_img6a33be845fbbe.jpg", "https://www.teatroaveirense.pt/pt/evento/susie-filipe-banda-amizade-banda-sinfonica-de-aveiro/"]
  ,"micaelense-sinfonietta": ["https://www.teatromicaelense.pt/images/contents/15751783079722_s.webp", "https://www.teatromicaelense.pt/agenda/2026-09-05/sinfonietta-de-ponta-delgada-e-antonio-di-cristofano/"]
  ,"micaelense-recantos": ["https://www.teatromicaelense.pt/images/contents/15851785253196_s.webp", "https://www.teatromicaelense.pt/agenda/2026-11-11/re-cantos/"]
  ,"micaelense-carmen": ["https://www.teatromicaelense.pt/images/contents/15881785254325_s.webp", "https://www.teatromicaelense.pt/agenda/2026-11-28/carmen/"]
  ,"micaelense-classicos-natal": ["https://www.teatromicaelense.pt/images/contents/15891785254513_s.webp", "https://www.teatromicaelense.pt/agenda/2026-12-06/classicos-de-natal-2026/"]
  ,"micaelense-rita-redshoes": ["https://www.teatromicaelense.pt/images/contents/15901785254744_s.webp", "https://www.teatromicaelense.pt/agenda/2026-12-13/mu-mim-mu/"]
  ,"amadora-festa-rui-veloso": ["https://www.cm-amadora.pt/images/NOTICIAS/AMADORA_EM_FESTA_2018/2026/amadora_em_festa26_site.png", "https://www.cm-amadora.pt/pt/cultura/10908-amadora-em-festa-2026-municipio-festeja-aniversario-de-3-a-13-de-setembro.html"]
  ,"amadora-festa-bia-matias": ["https://www.cm-amadora.pt/images/NOTICIAS/AMADORA_EM_FESTA_2018/2026/amadora_em_festa26_site.png", "https://www.cm-amadora.pt/pt/cultura/10908-amadora-em-festa-2026-municipio-festeja-aniversario-de-3-a-13-de-setembro.html"]
  ,"amadora-festa-quinta-bill": ["https://www.cm-amadora.pt/images/NOTICIAS/AMADORA_EM_FESTA_2018/2026/amadora_em_festa26_site.png", "https://www.cm-amadora.pt/pt/cultura/10908-amadora-em-festa-2026-municipio-festeja-aniversario-de-3-a-13-de-setembro.html"]
  ,"sintra-evita-1": ["https://cm-sintra.pt//images/icagenda/thumbs/themes/ic_large_w750h400q100_redes-sociais-evita6.jpg", "https://cm-sintra.pt/agenda/evita-no-olga-cadaval-com-sofia-escobar-e-diogo-morgado/2026-09-03-21-00"]
  ,"sintra-evita-2": ["https://cm-sintra.pt//images/icagenda/thumbs/themes/ic_large_w750h400q100_redes-sociais-evita6.jpg", "https://cm-sintra.pt/agenda/evita-no-olga-cadaval-com-sofia-escobar-e-diogo-morgado/2026-09-04-21-00"]
  ,"sintra-noites-orfeu": ["https://cm-sintra.pt//images/icagenda/thumbs/themes/ic_large_w750h400q100_banner-750x400-noites-de-orfeu-1.jpg", "https://cm-sintra.pt/agenda/musica/sintra-celebra-musica-e-mitologia-nas-noites-de-orfeu/2026-10-17-21-00"]
  ,"last-internationale": ["https://everythingisnew.pt/wp-content/uploads/TheLastInternationale_2026_AtwSq_SITE_SITE.jpg", "https://everythingisnew.pt/the-last-internationale/"]
  ,"hatsune-miku": ["https://everythingisnew.pt/wp-content/uploads/HatsuneMiku_2026_SITE_SITE.jpg", "https://everythingisnew.pt/hatsune-miku/"]
  ,"iolanda": ["https://everythingisnew.pt/wp-content/uploads/Iolanda_2026_SITE_SITE-3.jpg", "https://everythingisnew.pt/iolanda-lisboa-2026-2/"]
  ,"macy-gray-lisboa": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz157051_grande.jpg?v=5", "https://wr.bol.pt/Comprar/Bilhetes/182761-macy_gray_lisboa-aula_magna/"]
  ,"macy-gray-braga": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz157035_grande.jpg?v=5", "https://sodade.bol.pt/Comprar/Bilhetes/182777-macy_gray_braga-forum_braga/"]
  ,"paredes-mxgpu": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz156354_grande.jpg?v=2", "https://centroculturalparedes.bol.pt/Comprar/Bilhetes/181976-mxgpu-centro_cultural_paredes/"]
  ,"paredes-musicos-tejo": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz156348_grande.jpg?v=6", "https://centroculturalparedes.bol.pt/Comprar/Bilhetes/181973-os_musicos_do_tejo_esta_vida_trabalhosa-centro_cultural_paredes/"]
  ,"paredes-danto": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz156363_grande.jpg?v=3", "https://centroculturalparedes.bol.pt/Comprar/Bilhetes/181989-d_anto_fado_de_coimbra-centro_cultural_paredes/"]
  ,"paredes-bia-ferreira": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz156368_grande.jpg?v=2", "https://centroculturalparedes.bol.pt/Comprar/Bilhetes/181997-bia_ferreira-centro_cultural_paredes/"]
  ,"paredes-flauta-magica": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz156369_grande.jpg?v=2", "https://centroculturalparedes.bol.pt/Comprar/Bilhetes/181998-a_flauta_magica-centro_cultural_paredes/"]
  ,"paredes-regressados-fresco": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz156372_grande.jpg?v=2", "https://centroculturalparedes.bol.pt/Comprar/Bilhetes/182001-regressados_de_fresco-centro_cultural_paredes/"]
  ,"paredes-dama": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz156374_grande.jpg?v=3", "https://centroculturalparedes.bol.pt/Comprar/Bilhetes/182004-d_a_m_a-centro_cultural_paredes/"]
  ,"paredes-uhf-natal": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz156376_grande.jpg?v=2", "https://centroculturalparedes.bol.pt/Comprar/Bilhetes/182006-uhf_podia_ser_natal-centro_cultural_paredes/"]
  ,"theatrocirco-gisela-joao": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz155099.png?v=4", "https://www.bol.pt/Comprar/Bilhetes/180532-gisela_joao_inquieta-theatro_circo/Sessoes"]
  ,"theatrocirco-milhanas": ["https://theatrocirco.com/wp-content/uploads/2026/08/Milhanas-galeria-2.jpg", "https://theatrocirco.com/event/milhanas/"]
  ,"musica-esplanada-amares": ["https://ofir.pt/images/icagenda/thumbs/themes/ic_large_w900h600q100_esplanada-milho-rei.png", "https://ofir.pt/agenda/110-musica-na-esplanada-2/2026-08-28-22-00"]
  ,"concerto-lounge-braga": ["https://ofir.pt/images/icagenda/thumbs/themes/ic_large_w900h600q100_2025-10-18-novaarcada-braga.png", "https://ofir.pt/agenda/116-concerto-lounge/2026-09-05-20-00"]
  ,"bar-rio-gondoriz": ["https://ofir.pt/images/icagenda/thumbs/themes/ic_large_w900h600q100_2026-08-12-bardorio-gondoriz.png", "https://ofir.pt/agenda/119-concerto-bar-do-rio-gondoriz/2026-09-12-22-00"]
  ,"festas-sao-miguel-durraes": ["https://ofir.pt/images/icagenda/thumbs/themes/ic_large_w900h600q100_2026-10-02-festasdesaomiguel-durraes.png", "https://ofir.pt/agenda/102-festas-de-sao-miguel/2026-09-26-21-00"]
  ,"concerto-lounge-viana": ["https://ofir.pt/images/icagenda/thumbs/themes/ic_large_w900h600q100_2026-01-30-estacao-viana-shopping.png", "https://ofir.pt/agenda/117-concerto-lounge-2/2026-10-10-19-00"]
  ,"fever-candlelight-abba": ["https://applications-media.feverup.com/image/upload/f_auto,w_720,h_520,q_auto:good,c_fill/fever2/plan/photo/27f39c9e-0f94-11f0-8078-762b521a76e7.jpg", "https://feverup.com/m/107744?seasonal=p0462dp"]
  ,"fever-candlelight-adele": ["https://applications-media.feverup.com/image/upload/f_auto,w_720,h_520,q_auto:good,c_fill/fever2/plan/photo/bf21e71a-2128-11f0-8510-ca6ec07e6a29.jpg", "https://feverup.com/m/676016/pt"]
  ,"fever-jazz-room": ["https://applications-media.feverup.com/image/upload/f_auto,w_720,h_520,q_auto:good,c_fill,g_auto/fever2/plan/photo/bef7eaf6-4b10-11f1-9b40-92ff59a3bd30.jpg", "https://feverup.com/m/684390/pt"]
  ,"fever-fado-principe-real": ["https://applications-media.feverup.com/image/upload/f_auto,w_1240,h_840,q_auto:good,c_fill,g_auto/fever2/plan/photo/5da2aec8-3e7a-11f1-8460-aa22974c1666.jpeg", "https://feverup.com/m/631983"]
  ,"fever-candlelight-pink-floyd": ["https://applications-media.feverup.com/image/upload/f_auto,w_308,h_308,q_auto:good,c_fill,g_north/fever2/plan/photo/05b2963c-84a5-11ef-be66-5e2f96afade7.jpg", "https://feverup.com/pt/lisboa/candlelight/"]
  ,"rui-veloso-lisboa": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz145612_grande.jpg?v=1", "https://centraldeartistas.bol.pt/Comprar/Bilhetes/169511-rui_veloso_trio-sagres_campo_pequeno/"]
  ,"river-stone-fest-2026": ["https://bolimg.blob.core.windows.net/producao/imagens/espectaculos/cartaz147015_grande.jpg?v=2", "https://riverstone.bol.pt/Comprar/Bilhetes/171321-x_river_stone_fest-river_stone_fest/"]
  ,"meo-sons-mar": ["https://fundacao.meo.pt/media/images/events/40/MEO%20Sons%20do%20Mar%202026%20cartaz_6a8d52407ea24.webp", "https://fundacao.meo.pt/pt/events/view/id/40"]
  ,"fever-fado-chiado": ["https://applications-media.feverup.com/image/upload/f_auto,w_616,h_616,q_auto:good,c_fill,g_north/fever2/plan/photo/287f911e-bbfa-11f0-80eb-ea9fbc3a351c.jpeg", "https://feverup.com/m/67022/en?seasonal=p06e4dp"]
};

// Measured from the live official artwork on 2026-08-29. Editorial surfaces
// prefer these full portrait posters; horizontal source images remain intact
// and are never cropped or replaced with invented artwork.
const portraitPosterIds = new Set([
  "kalorama-2026", "iminente-2026", "matondi-celebration", "andru-donalds", "taguspark-carlos-bica", "taguspark-cabrita", "taguspark-ricardo-reis", "lagos-fado-jazz", "ivete-guimaraes", "rock-dao", "bota-francisco-sales", "theatrocirco-contraponto", "ana-bacalhau-almada", "esquecimento-global-guimaraes", "mario-pacheco-ccb", "natal-jop-almada", "chico-chico-ovar", "figl-lagoa-guitarras", "tt-coliseu", "gil-semedo-coliseu", "deva-premal-coliseu", "billy-corgan-coliseu", "irina-barros-monsantos", "operafest-anatema", "povoa-boney-m", "povoa-pedro-abrunhosa", "famalicao-samuel-uria", "vul-sobass-friends", "vul-omar-perry", "vul-micronova-bungee", "vul-afro-encircle", "vul-possivel", "vul-sensorial-sounds", "vul-kizomba-rua", "vul-afterglow", "vul-riot", "vul-beleza-abstracta", "vul-fatal-move", "campo-pequeno-alma-iberica", "campo-pequeno-dire-straits-legacy", "campo-pequeno-roupa-nova", "campo-pequeno-alphaville", "campo-pequeno-titas", "campo-pequeno-cat-power", "campo-pequeno-this-is-michael", "campo-pequeno-beatles-symphonic", "leiria-carolina-deus", "leiria-jazz-dixie-gang", "leiria-valter-lobo", "rui-veloso-porto", "theatrocirco-sensible-soccers", "theatrocirco-noite-branca-opera", "theatrocirco-xxx-trovas", "macy-gray-lisboa", "macy-gray-braga", "paredes-mxgpu", "paredes-musicos-tejo", "paredes-danto", "paredes-bia-ferreira", "paredes-flauta-magica", "paredes-regressados-fresco", "paredes-dama", "paredes-uhf-natal", "theatrocirco-gisela-joao", "rui-veloso-lisboa", "river-stone-fest-2026", "viriato-voz-rock", "viriato-luis-lapa", "viriato-nanook", "viriato-lagrimas-mar", "viriato-kevin-morby", "viriato-sophia", "viriato-manel-cruz", "viriato-carminho"
]);
// A festival's official bill is also the correct artwork for its programme
// sessions. These are deliberately shared — never replaced by made-up art.
const sharedProgrammePosters = {
  "festas-mar-cascais-2026": ["festas-mar-20-main","festas-mar-21-main","festas-mar-22-main","festas-mar-23-main","festas-mar-27-main","festas-mar-28-main","festas-mar-29-main","festas-mar-30-main","festas-mar-20-local","festas-mar-21-local","festas-mar-22-local","festas-mar-23-local","festas-mar-27-local","festas-mar-28-local","festas-mar-29-local","festas-mar-30-local"],
  "corroios-2026": ["corroios-21-legendary-tigerman","corroios-22-folclore","corroios-23-quatro-meia","corroios-24-santamaria","corroios-25-ricardo-ribeiro","corroios-26-revolution-within","corroios-27-djs","corroios-28-vitor-kley","corroios-29-valete","corroios-30-diogo-picarra"],
  "kalorama-2026": ["kalorama-2026-08-28","kalorama-2026-08-29","kalorama-2026-08-30"],
  "outfest-2026": ["outfest-2026-10-01","outfest-2026-10-02","outfest-2026-10-03","outfest-2026-10-04"],
  "guimaraes-jazz-2026": ["guimaraes-jazz-toninho","guimaraes-jazz-beyond-miles","guimaraes-jazz-joao-tavares","guimaraes-jazz-rempis","guimaraes-jazz-artemis","guimaraes-jazz-esmae","guimaraes-jazz-filigrana","guimaraes-jazz-rosenwinkel","guimaraes-jazz-peter-evans","guimaraes-jazz-sonoscopia","guimaraes-jazz-lex-korten","guimaraes-jazz-kurt-elling"]
};
Object.entries(sharedProgrammePosters).forEach(([parentId, childIds]) => {
  const poster = officialPosters[parentId];
  if (poster) childIds.forEach(childId => { officialPosters[childId] = poster; });
});
const legacyOfficialPosterIds = new Set(["fanna-fi-allah","johnny-hooker","ruggero","secret-chord-allgema","einar-solberg","blood-red-shoes","mercury-rev","nazareth","for-the-glory","steve-seagulls","myrath","druga-rika","porangui","city-of-the-sun","tormentor","sbp4","faro-festival-f","under-doom-fest-2026","reign-fury-hardcore-fest-2026","under-doom-2026-09-25","under-doom-2026-09-26","iminente-2026-09-17","iminente-2026-09-18","iminente-2026-09-19","iminente-2026-09-20","festival-f-2026-09-03","festival-f-2026-09-04","festival-f-2026-09-05"]);
const officialEventPages = {
  "ccb-big-bang": ["https://www.ccb.pt/evento/festival-big-bang-lx2026/2026-10-02/", "http://festivalbigbang.bol.pt/"],
  "ccb-mike-stern": ["https://www.ccb.pt/evento/mike-stern-band/", "https://www.bol.pt/Comprar/Bilhetes/175568/1936036/Sectores"],
  "ccb-handel": ["https://www.ccb.pt/evento/handel/"],
  "ccb-margarida-campelo": ["https://www.ccb.pt/evento/margarida-campelo/", "https://ccb.bol.pt/Comprar/Bilhetes/180147-margarida_campelo-fundacao_centro_cultural_de_belem/Sessoes"],
  "ccb-boca-livre": ["https://www.ccb.pt/evento/boca-canta-edu/", "https://www.bol.pt/Comprar/Bilhetes/183053-boca_livre_com_participacao_super_especial_de_edu_lobo-everything_is_new_lda/Sessoes"],
  "ccb-trio-fantasma": ["https://www.ccb.pt/evento/trio-fantasma-de-beethoven/", "https://www.bol.pt/Comprar/Bilhetes/180395/1956762/Sectores"],
  "ccb-joana-gama": ["https://www.ccb.pt/evento/a-mind-in-the-heart-de-ivan-vukosavljevic/", "https://www.bol.pt/Comprar/Bilhetes/180164/1956129/Sectores"],
  "ccb-pedro-melo-alves": ["https://www.ccb.pt/evento/pedro-melo-alves-omniae-large-ensemble/", "https://www.bol.pt/Comprar/Bilhetes/180177/1956146/Sectores"],
  "ccb-carmen": ["https://www.ccb.pt/evento/carmen-de-bizet/2026-10-28/", "https://www.bol.pt/Comprar/Bilhetes/180184-carmen_de_bizet_opera-ccb/Sessoes"],
  "ccb-marco-rodrigues": ["https://www.ccb.pt/evento/marco-rodrigues-canta-carlos-do-carmo/", "https://ccb.bol.pt/Comprar/Bilhetes/162165/1741114/Sectores"],
  "ccb-100-miles": ["https://www.ccb.pt/evento/100-miles-centennial-celebration-of-miles-davis/", "https://www.bol.pt/Comprar/Bilhetes/179321/1952266/Sectores"],
  "ccb-cancioneiro-elvas": ["https://www.ccb.pt/evento/cancioneiro-de-elvas/", "https://www.bol.pt/Comprar/Bilhetes/180195/1956170/Sectores"],
  "ccb-bolero-ravel": ["https://www.ccb.pt/evento/o-bolero-de-ravel/", "https://ccb.bol.pt/Comprar/Bilhetes/179843-o_bolero_de_ravel_oml-fundacao_centro_cultural_de_belem/Sessoes"],
  "ccb-alan-stivell": ["https://www.ccb.pt/evento/alan-stivell-misty-fest/"],
  "ccb-nancy-vieira": ["https://www.ccb.pt/evento/nancy-vieira-francisco-sassetti-misty-fest/"],
  "ccb-maria-joao": ["https://www.ccb.pt/evento/maria-joao-joao-farinha-misty-fest/"],
  "ccb-eliana-glass": ["https://www.ccb.pt/evento/eliana-glass-misty-fest/", "https://ccb.bol.pt/Comprar/Bilhetes/179611-eliana_glass_misty_fest-fundacao_centro_cultural_de_belem/Sessoes?lang=pt-PT"],
  "ccb-gospel-choir": ["https://www.ccb.pt/evento/black-heritage-gospel-choir/", "https://uguru.bol.pt/Comprar/Bilhetes/176584-black_heritage_gospel_choir-uguru_ii_producoes_unipessoal_lda/Sessoes?lang=pt-PT"],
  "gnration-maria-amaro-calgon": ["https://www.gnration.pt/event/2026/maria-amaro-calgon/", null, "gnration — página do evento"],
  "gnration-coral-autotune": ["https://www.gnration.pt/event/2026/grupo-coral-do-auto-tune/", null, "gnration — página do evento"],
  "gnration-ocenpsiea": ["https://www.gnration.pt/event/2026/ocenpsiea/", null, "gnration — página do evento"],
  "gnration-kalia-vandever": ["https://www.gnration.pt/event/2026/kalia-vandever/", "https://gnration.bol.pt/Comprar/Bilhetes/180299-kalia_vandever_mana-gnration/", "gnration — página do evento"],
  "gnration-zona-franca": ["https://www.gnration.pt/event/2026/zona-franca-fabio-krayze-x-dj-poco/", "https://gnration.bol.pt/Comprar/Bilhetes/180301-zona_franca_fabio_krayze_x_dj_poco-gnration/", "gnration — página do evento"],
  "gnration-ana-teresa-pereira": ["https://www.gnration.pt/event/2026/radiografia-9-ana-teresa-pereira/", "https://gnration.bol.pt/Comprar/Bilhetes/180308-radiografia_9_ana_teresa_pereira-gnration/", "gnration — página do evento"],
  "gnration-midori-hirano": ["https://www.gnration.pt/event/2026/midori-hirano/", "https://gnration.bol.pt/Comprar/Bilhetes/180310-midori_hirano_otonoma-gnration/", "gnration — página do evento"],
  "gnration-joana-sa": ["https://www.gnration.pt/event/2026/joana-sa-2/", "https://gnration.bol.pt/Comprar/Bilhetes/180312-joana_sa_corpo_territorio_variacoes_sobre_inquietacao-gnration/", "gnration — página do evento"],
  "gnration-travo": ["https://www.gnration.pt/event/2026/travo/", "https://gnration.bol.pt/Comprar/Bilhetes/180368-travo_wasteland-gnration/", "gnration — página do evento"],
  "gnration-easter-island-head": ["https://www.gnration.pt/event/2026/ex-easter-island-head/", "https://gnration.bol.pt/Comprar/Bilhetes/180370-ex_easter_island_head-gnration/", "gnration — página do evento"],
  "gnration-ana-lua-caiano": ["https://www.gnration.pt/event/2026/ana-lua-caiano/", "https://gnration.bol.pt/Comprar/Bilhetes/180171-ana_lua_caiano_devagar_que_a_vida_e_curta-gnration/", "gnration — página do evento"],
  "gnration-angel-bat-dawid": ["https://www.gnration.pt/event/2026/angel-bat-dawid/", "https://gnration.bol.pt/Comprar/Bilhetes/180372-angel_bat_dawid-gnration/", "gnration — página do evento"],
  "gnration-park-jiha": ["https://www.gnration.pt/event/2026/park-jiha/", "https://gnration.bol.pt/Comprar/Bilhetes/180375-park_jiha-gnration/", "gnration — página do evento"],
  "gnration-felicia-atkinson": ["https://www.gnration.pt/event/2026/felicia-atkinson/", "https://www.bol.pt/Comprar/Bilhetes/180378-felicia_atkinson-gnration/", "gnration — página do evento"],
  "gnration-bvhz": ["https://www.gnration.pt/event/2026/bvhz/", null, "gnration — página do evento"],
  "gnration-joao-ms": ["https://www.gnration.pt/event/2026/joao-ms/", null, "gnration — página do evento"],
  "gnration-iav": ["https://www.gnration.pt/event/2026/iav/", null, "gnration — página do evento"],
  "gnration-jose-israel": ["https://www.gnration.pt/event/2026/jose-goncalves-rios-israel-machado/", null, "gnration — página do evento"],
  "gnration-maquina-scuru": ["https://www.gnration.pt/event/2026/maquina-scuru-fitchadu/", "https://gnration.bol.pt/Comprar/Bilhetes/180379-maquina_scuru_fitchadu-gnration/", "gnration — página do evento"],
  "vul-sobass-friends": ["https://vulisboa.com/eventos/sobass-friends-04-09", "https://3cket.com/en/event/sobass-friends-95711", "Village Underground Lisboa — página do evento"],
  "vul-omar-perry": ["https://vulisboa.com/eventos/2-aniversario-atlantic-sound-omar-perry-friends", "https://3cket.com/en/event/2-aniversario-atlantic-sound-omar-perry-friends", "Village Underground Lisboa — página do evento"],
  "vul-micronova-bungee": ["https://vulisboa.com/eventos/micronova-x-bungee-day-night", "https://3cket.com/event/bungee-x-micronova-day-night", "Village Underground Lisboa — página do evento"],
  "vul-afro-encircle": ["https://vulisboa.com/eventos/afro-encircle-setembro", null, "Village Underground Lisboa — página do evento"],
  "vul-possivel": ["https://vulisboa.com/eventos/possvel-18-setembro", "https://3cket.com/event/possivel", "Village Underground Lisboa — página do evento"],
  "vul-sensorial-sounds": ["https://vulisboa.com/eventos/sensorial-sounds", "https://3cket.com/event/sensorial-sounds/cjlsf", "Village Underground Lisboa — página do evento"],
  "vul-kizomba-rua": ["https://vulisboa.com/eventos/kizomba-na-rua-setembro", null, "Village Underground Lisboa — página do evento"],
  "vul-afterglow": ["https://vulisboa.com/eventos/afterglow-music-session-26-09", null, "Village Underground Lisboa — página do evento"],
  "vul-riot": ["https://vulisboa.com/eventos/riot-x-vul-october", null, "Village Underground Lisboa — página do evento"],
  "vul-beleza-abstracta": ["https://vulisboa.com/eventos/beleza-abstracta", null, "Village Underground Lisboa — página do evento"],
  "vul-fatal-move": ["https://vulisboa.com/eventos/sportswear-bookings-presents-fatal-move-/-outta-spite-/-nopath", "https://3cket.com/event/sportswear-bookings-presents-fatal-move-outta-spite-nopath", "Village Underground Lisboa — página do evento"],
  "campo-pequeno-alma-iberica": ["https://www.sagrescampopequeno.pt/pt/agenda/alma-iberica", "https://www.ticketline.pt/evento/alma-iberica-104374", "Sagres Campo Pequeno — página do evento"],
  "campo-pequeno-sigur-ros": ["https://www.sagrescampopequeno.pt/pt/agenda/sigur-ros-the-orchestral-tour", "https://www.ticketline.pt/evento/sigur-ros-102956", "Sagres Campo Pequeno — página do evento"],
  "campo-pequeno-dire-straits-legacy": ["https://www.sagrescampopequeno.pt/pt/agenda/dire-straits-legacy-europa-tour-2026", "https://www.ticketline.pt/pt/evento/dire-straits-legacy-europa-tour-2026-102008", "Sagres Campo Pequeno — página do evento"],
  "campo-pequeno-roupa-nova": ["https://www.sagrescampopequeno.pt/pt/agenda/simplesmente-roupa-nova", "https://www.ticketline.pt/evento/simplesmente-roupa-nova-tour-2026-lisboa-105957", "Sagres Campo Pequeno — página do evento"],
  "campo-pequeno-alphaville": ["https://www.sagrescampopequeno.pt/pt/agenda/alphaville", "https://blueticket.meo.pt/pt/event/15712/alphaville-in-concert", "Sagres Campo Pequeno — página do evento"],
  "campo-pequeno-titas": ["https://www.sagrescampopequeno.pt/pt/agenda/titas", "https://lisboaevents.bol.pt/Comprar/Bilhetes/179258-titas_lisboa-sagres_campo_pequeno/", "Sagres Campo Pequeno — página do evento"],
  "campo-pequeno-cat-power": ["https://www.sagrescampopequeno.pt/pt/agenda/cat-power", "https://www.ticketline.pt/evento/cat-power-misty-fest-103614", "Sagres Campo Pequeno — página do evento"],
  "campo-pequeno-this-is-michael": ["https://www.sagrescampopequeno.pt/pt/agenda/this-is-michael", "https://www.ticketline.pt/evento/this-is-michael-world-tour-2026-100251", "Sagres Campo Pequeno — página do evento"],
  "campo-pequeno-nemanus": ["https://www.sagrescampopequeno.pt/pt/agenda/nemanus", "https://www.bol.pt/Comprar/Bilhetes/168684-nemanus_ao_vivo_sagres_campo_pequeno-sagres_campo_pequeno/", "Sagres Campo Pequeno — página do evento"],
  "campo-pequeno-beatles-symphonic": ["https://www.sagrescampopequeno.pt/pt/agenda/the-beatles-symphonic-fantasy", "https://www.ticketline.pt/evento/102519", "Sagres Campo Pequeno — página do evento"],
  "campo-pequeno-music-circus": ["https://www.sagrescampopequeno.pt/pt/agenda/music-circus-show-on-ice-with-highlights-of-frozen", "https://www.ticketline.pt/evento/music-circus-show-on-ice-with-highlights-of-105929", "Sagres Campo Pequeno — página do evento"],
  "casamusica-choro-bastos": ["https://casadamusica.com/event/clube-choro-do-porto-convida-cristovao-bastos-e-ilana-volcov/?selected_session=52898", "https://casadamusica.com/event/clube-choro-do-porto-convida-cristovao-bastos-e-ilana-volcov/?selected_session=52898", "Casa da Música — página do evento"],
  "casamusica-barananu": ["https://casadamusica.com/event/barananu/?selected_session=51635", "https://casadamusica.com/event/barananu/?selected_session=51635", "Casa da Música — página do evento"],
  "casamusica-fischer-z": ["https://casadamusica.com/event/fischer-z/?selected_session=48427", "https://casadamusica.com/event/fischer-z/?selected_session=48427", "Casa da Música — página do evento"],
  "casamusica-bonds-festival": ["https://casadamusica.com/event/bonds-festival/", "https://casadamusica.com/event/bonds-festival/", "Casa da Música — página do evento"],
  "casamusica-berlioz": ["https://casadamusica.com/event/berlioz-em-italia/", "https://casadamusica.com/event/berlioz-em-italia/", "Casa da Música — página do evento"],
  "casamusica-mario-biondi": ["https://casadamusica.com/event/mario-biondi/", "https://casadamusica.com/event/mario-biondi/", "Casa da Música — página do evento"],
  "casamusica-grant-lee": ["https://casadamusica.com/event/grant-lee-philips/", "https://casadamusica.com/event/grant-lee-philips/", "Casa da Música — página do evento"],
  "casamusica-rita-redshoes": ["https://casadamusica.com/event/rita-redshoes/", "https://casadamusica.com/event/rita-redshoes/", "Casa da Música — página do evento"],
  "viriato-voz-rock": ["https://www.teatroviriato.com/pt/programacao/espetaculo/a-voz-do-rock-and-convidadas", null, "Teatro Viriato — página do evento"],
  "viriato-luis-lapa": ["https://www.teatroviriato.com/pt/programacao/espetaculo/luis-lapa-cantigas-da-lua", null, "Teatro Viriato — página do evento"],
  "viriato-nanook": ["https://www.teatroviriato.com/pt/programacao/espetaculo/nanook-o-esquimo", null, "Teatro Viriato — página do evento"],
  "viriato-lagrimas-mar": ["https://www.teatroviriato.com/pt/programacao/espetaculo/lagrimas-no-mar", null, "Teatro Viriato — página do evento"],
  "viriato-kevin-morby": ["https://www.teatroviriato.com/pt/programacao/espetaculo/kevin-morby", null, "Teatro Viriato — página do evento"],
  "viriato-ballake-piers": ["https://www.teatroviriato.com/pt/programacao/espetaculo/ballake-sissoko-and-piers-faccini", "https://caeviseu.bol.pt/Comprar/Bilhetes/160651-ballake_sissoko_piers_faccini-centro_artes_espectaculo_de_viseu_assoc_cult_pedag/Sessoes", "Teatro Viriato — página do evento"],
  "viriato-sophia": ["https://www.teatroviriato.com/pt/programacao/espetaculo/sophia-188", null, "Teatro Viriato — página do evento"],
  "viriato-manel-cruz": ["https://www.teatroviriato.com/pt/programacao/espetaculo/manel-cruz", null, "Teatro Viriato — página do evento"],
  "viriato-carminho": ["https://www.teatroviriato.com/pt/programacao/espetaculo/carminho", null, "Teatro Viriato — página do evento"],
  "leiria-carolina-deus": ["https://leiriagenda.cm-leiria.pt/pt/agenda/carolina-de-deus-3", null, "Leiriagenda — página do evento"],
  "leiria-jazz-dixie-gang": ["https://leiriagenda.cm-leiria.pt/pt/agenda/jazz-no-centro-historico-dixie-gang", null, "Leiriagenda — página do evento"],
  "leiria-uhf-cartel": ["https://leiriagenda.cm-leiria.pt/pt/agenda/concerto-solidario-uhf-e-the-cartel", null, "Leiriagenda — página do evento"],
  "leiria-valter-lobo": ["https://leiriagenda.cm-leiria.pt/pt/agenda/valter-lobo", null, "Leiriagenda — página do evento"],
  "leiria-juntos-musica": ["https://leiriagenda.cm-leiria.pt/pt/agenda/juntos-pela-musica", null, "Leiriagenda — página do evento"],
  "leiria-mendelssohn": ["https://leiriagenda.cm-leiria.pt/pt/agenda/ciclo-mendelssohn--integral-das-sinfonias-e-dos-concertos", null, "Leiriagenda — página do evento"],
  "leiria-em-casa-amalia": ["https://www.teatrojlsilva.pt/evento/em-casa-damalia-o-concerto-ao-vivo", null, "Teatro José Lúcio da Silva — página oficial"],
  "leiria-diz-concerto": ["https://leiriagenda.cm-leiria.pt/pt/agenda/diz--concerto", null, "Leiriagenda — página do evento"],
  "leiria-orquestra-jazz": ["https://leiriagenda.cm-leiria.pt/pt/agenda/orquestra-jazz-de-leiria-christian-mcbride", null, "Leiriagenda — página do evento"],
  "ccb-sul": ["https://www.ccb.pt/evento/sul/", "https://ccb.bol.pt/Comprar/Bilhetes/162118/1741094/Sectores"],
  "ccb-barbara-hendricks": ["https://www.ccb.pt/evento/still-on-the-road-to-freedom/", "https://incubadoradartes.bol.pt/Comprar/Bilhetes/177182/1940979/Sectores"],
  "ccb-christian-loffler": ["https://www.ccb.pt/evento/until-we-meet-again-misty-fest/", "https://www.bol.pt/Comprar/Bilhetes/176065/1937573/Sectores"],
  "ccb-al-di-meola": ["https://www.ccb.pt/evento/al-di-meola-misty-fest/", "https://www.bol.pt/Comprar/Bilhetes/175829/1936588/Sectores"],
  "ccb-jazz-nights": ["https://www.ccb.pt/evento/contemporary-jazz-nights-misty-fest/", "https://ccb.bol.pt/Comprar/Bilhetes/177249/1941312/Sectores"],
  "ccb-youn-sun-nah": ["https://www.ccb.pt/evento/youn-sun-nah-misty-fest/", "https://ccb.bol.pt/Comprar/Bilhetes/179616/1953760/Sectores"],
  "ccb-galaxia-vivaldi": ["https://www.ccb.pt/evento/galaxia-vivaldi/", "https://www.bol.pt/Comprar/Bilhetes/180212/1956212/Sectores"],
  "ccb-glenn-miller": ["https://www.ccb.pt/evento/glenn-miller-orchestra-4/", "https://www.bol.pt/Comprar/Bilhetes/174071/1927123/Sectores"],
  "ccb-cabaret-songs": ["https://www.ccb.pt/evento/cabaret-songs/", "https://www.bol.pt/Comprar/Bilhetes/180217/1956220/Sectores"],
  "ccb-bach-natal": ["https://www.ccb.pt/evento/concerto-de-natal-missa-em-si-menor-de-bach/", "https://www.bol.pt/Comprar/Bilhetes/180224/1956226/Sectores"],
  "evanescence": ["https://www.wook.pt/bilheteira/eventos/evanescence-2026-world-tour/32884851", "https://www.wook.pt/bilheteira/eventos/evanescence-2026-world-tour/32884851", "WOOK — página oficial do evento"],
  "moonspell-sintra-2026": ["https://moonspell.com/tours/-/live-in-sintra-81/", "https://regaleira.byblueticket.pt/pt/event/15946/moonspell", "Moonspell — página oficial / Blueticket"],
  "theatrocirco-noite-branca-opera": ["https://theatrocirco.com/event/papa-est-mort/", "https://theatrocirco.com/event/papa-est-mort/", "Theatro Circo — página do evento"],
  "figuras-rui-massena": ["https://teatrodasfiguras.pt/agenda/parents-house-piano-solo", "https://teatrodasfiguras.pt/agenda/parents-house-piano-solo", "Teatro das Figuras — página do evento"],
  "figuras-pedro-abrunhosa": ["https://teatrodasfiguras.pt/agenda/pedro-abrunhosa", "https://teatrodasfiguras.pt/agenda/pedro-abrunhosa", "Teatro das Figuras — página do evento"],
  "figuras-zambujo": ["https://teatrodasfiguras.pt/agenda/antonio-zambujo", "https://teatrodasfiguras.pt/agenda/antonio-zambujo", "Teatro das Figuras — página do evento"],
  "aveirense-schonnbrunn": ["https://www.teatroaveirense.pt/pt/evento/schonbrunn-palace-orchestra-vienna/", "https://www.teatroaveirense.pt/pt/evento/schonbrunn-palace-orchestra-vienna/", "Teatro Aveirense — página do evento"],
  "aveirense-susie-filipe": ["https://www.teatroaveirense.pt/pt/evento/susie-filipe-banda-amizade-banda-sinfonica-de-aveiro/", "https://www.teatroaveirense.pt/pt/evento/susie-filipe-banda-amizade-banda-sinfonica-de-aveiro/", "Teatro Aveirense — página do evento"],
  "micaelense-sinfonietta": ["https://www.teatromicaelense.pt/agenda/2026-09-05/sinfonietta-de-ponta-delgada-e-antonio-di-cristofano/", "https://www.teatromicaelense.pt/agenda/2026-09-05/sinfonietta-de-ponta-delgada-e-antonio-di-cristofano/", "Teatro Micaelense — página do evento"],
  "micaelense-recantos": ["https://www.teatromicaelense.pt/agenda/2026-11-11/re-cantos/", "https://www.teatromicaelense.pt/agenda/2026-11-11/re-cantos/", "Teatro Micaelense — página do evento"],
  "micaelense-carmen": ["https://www.teatromicaelense.pt/agenda/2026-11-28/carmen/", "https://www.teatromicaelense.pt/agenda/2026-11-28/carmen/", "Teatro Micaelense — página do evento"],
  "micaelense-classicos-natal": ["https://www.teatromicaelense.pt/agenda/2026-12-06/classicos-de-natal-2026/", "https://www.teatromicaelense.pt/agenda/2026-12-06/classicos-de-natal-2026/", "Teatro Micaelense — página do evento"],
  "micaelense-rita-redshoes": ["https://www.teatromicaelense.pt/agenda/2026-12-13/mu-mim-mu/", "https://www.teatromicaelense.pt/agenda/2026-12-13/mu-mim-mu/", "Teatro Micaelense — página do evento"],
  "amadora-festa-rui-veloso": ["https://www.cm-amadora.pt/pt/cultura/10908-amadora-em-festa-2026-municipio-festeja-aniversario-de-3-a-13-de-setembro.html", "https://www.cm-amadora.pt/pt/cultura/10908-amadora-em-festa-2026-municipio-festeja-aniversario-de-3-a-13-de-setembro.html", "Câmara Municipal da Amadora — programa oficial"],
  "amadora-festa-bia-matias": ["https://www.cm-amadora.pt/pt/cultura/10908-amadora-em-festa-2026-municipio-festeja-aniversario-de-3-a-13-de-setembro.html", "https://www.cm-amadora.pt/pt/cultura/10908-amadora-em-festa-2026-municipio-festeja-aniversario-de-3-a-13-de-setembro.html", "Câmara Municipal da Amadora — programa oficial"],
  "amadora-festa-quinta-bill": ["https://www.cm-amadora.pt/pt/cultura/10908-amadora-em-festa-2026-municipio-festeja-aniversario-de-3-a-13-de-setembro.html", "https://www.cm-amadora.pt/pt/cultura/10908-amadora-em-festa-2026-municipio-festeja-aniversario-de-3-a-13-de-setembro.html", "Câmara Municipal da Amadora — programa oficial"],
  "sintra-evita-1": ["https://cm-sintra.pt/agenda/evita-no-olga-cadaval-com-sofia-escobar-e-diogo-morgado/2026-09-03-21-00", "https://cm-sintra.pt/agenda/evita-no-olga-cadaval-com-sofia-escobar-e-diogo-morgado/2026-09-03-21-00", "Câmara Municipal de Sintra — página do evento"],
  "sintra-evita-2": ["https://cm-sintra.pt/agenda/evita-no-olga-cadaval-com-sofia-escobar-e-diogo-morgado/2026-09-04-21-00", "https://cm-sintra.pt/agenda/evita-no-olga-cadaval-com-sofia-escobar-e-diogo-morgado/2026-09-04-21-00", "Câmara Municipal de Sintra — página do evento"],
  "sintra-noites-orfeu": ["https://cm-sintra.pt/agenda/musica/sintra-celebra-musica-e-mitologia-nas-noites-de-orfeu/2026-10-17-21-00", "https://cm-sintra.pt/agenda/musica/sintra-celebra-musica-e-mitologia-nas-noites-de-orfeu/2026-10-17-21-00", "Câmara Municipal de Sintra — página do evento"],
  "last-internationale": ["https://everythingisnew.pt/the-last-internationale/", "https://www.ticketline.pt/evento/104875", "Everything Is New — página oficial do evento"],
  "hatsune-miku": ["https://everythingisnew.pt/hatsune-miku/", "https://www.ticketline.pt/evento/102520", "Everything Is New — página oficial do evento"],
  "iolanda": ["https://everythingisnew.pt/iolanda-lisboa-2026-2/", "https://coliseulisboa.bol.pt/Comprar/Bilhetes/168837-iolanda-coliseu_dos_recreios/Sessoes", "Everything Is New — página oficial do evento"],
  "macy-gray-lisboa": ["https://wr.bol.pt/Comprar/Bilhetes/182761-macy_gray_lisboa-aula_magna/", "https://serveasy.bol.pt/Comprar/Bilhetes/182761-macy_gray_lisboa-aula_magna/", "BOL — página oficial do evento"],
  "macy-gray-braga": ["https://sodade.bol.pt/Comprar/Bilhetes/182777-macy_gray_braga-forum_braga/", "https://sodade.bol.pt/Comprar/Bilhetes/182777/1969556/Sectores", "BOL — página oficial do evento"],
  "paredes-mxgpu": ["https://centroculturalparedes.bol.pt/Comprar/Bilhetes/181976-mxgpu-centro_cultural_paredes/", "https://centroculturalparedes.bol.pt/Comprar/Bilhetes/181976/1966160/Sectores", "Centro Cultural Paredes / BOL — página do evento"],
  "paredes-musicos-tejo": ["https://centroculturalparedes.bol.pt/Comprar/Bilhetes/181973-os_musicos_do_tejo_esta_vida_trabalhosa-centro_cultural_paredes/", "https://centroculturalparedes.bol.pt/Comprar/Bilhetes/181973/1966820/Sectores", "Centro Cultural Paredes / BOL — página do evento"],
  "paredes-danto": ["https://centroculturalparedes.bol.pt/Comprar/Bilhetes/181989-d_anto_fado_de_coimbra-centro_cultural_paredes/", "https://centroculturalparedes.bol.pt/Comprar/Bilhetes/181989/1966174/Sectores", "Centro Cultural Paredes / BOL — página do evento"],
  "paredes-bia-ferreira": ["https://centroculturalparedes.bol.pt/Comprar/Bilhetes/181997-bia_ferreira-centro_cultural_paredes/", "https://centroculturalparedes.bol.pt/Comprar/Bilhetes/181997/1966188/Sectores", "Centro Cultural Paredes / BOL — página do evento"],
  "paredes-flauta-magica": ["https://centroculturalparedes.bol.pt/Comprar/Bilhetes/181998-a_flauta_magica-centro_cultural_paredes/", "https://centroculturalparedes.bol.pt/Comprar/Bilhetes/181998/1966189/Sectores", "Centro Cultural Paredes / BOL — página do evento"],
  "paredes-regressados-fresco": ["https://centroculturalparedes.bol.pt/Comprar/Bilhetes/182001-regressados_de_fresco-centro_cultural_paredes/", "https://centroculturalparedes.bol.pt/Comprar/Bilhetes/182001/1966191/Sectores", "Centro Cultural Paredes / BOL — página do evento"],
  "paredes-dama": ["https://centroculturalparedes.bol.pt/Comprar/Bilhetes/182004-d_a_m_a-centro_cultural_paredes/", "https://centroculturalparedes.bol.pt/Comprar/Bilhetes/182004/1966194/18217/Lotacao", "Centro Cultural Paredes / BOL — página do evento"],
  "paredes-uhf-natal": ["https://centroculturalparedes.bol.pt/Comprar/Bilhetes/182006-uhf_podia_ser_natal-centro_cultural_paredes/", "https://centroculturalparedes.bol.pt/Comprar/Bilhetes/182006/1966200/Sectores", "Centro Cultural Paredes / BOL — página do evento"],
  "theatrocirco-gisela-joao": ["https://theatrocirco.com/event/giselajoao/", "https://www.bol.pt/Comprar/Bilhetes/180532-gisela_joao_inquieta-theatro_circo/Sessoes", "Theatro Circo — página do evento"],
  "theatrocirco-milhanas": ["https://theatrocirco.com/event/milhanas/", "https://www.bol.pt/Comprar/Bilhetes/183594-milhanas-theatro_circo/Sessoes", "Theatro Circo — página do evento"],
  "musica-esplanada-amares": ["https://ofir.pt/agenda/110-musica-na-esplanada-2/2026-08-28-22-00", "https://ofir.pt/agenda/110-musica-na-esplanada-2/2026-08-28-22-00", "Ofir — página do evento"],
  "concerto-lounge-braga": ["https://ofir.pt/agenda/116-concerto-lounge/2026-09-05-20-00", "https://ofir.pt/agenda/116-concerto-lounge/2026-09-05-20-00", "Ofir — página do evento"],
  "bar-rio-gondoriz": ["https://ofir.pt/agenda/119-concerto-bar-do-rio-gondoriz/2026-09-12-22-00", "https://ofir.pt/agenda/119-concerto-bar-do-rio-gondoriz/2026-09-12-22-00", "Ofir — página do evento"],
  "festas-sao-miguel-durraes": ["https://ofir.pt/agenda/102-festas-de-sao-miguel/2026-09-26-21-00", "https://ofir.pt/agenda/102-festas-de-sao-miguel/2026-09-26-21-00", "Ofir — página do evento"],
  "concerto-lounge-viana": ["https://ofir.pt/agenda/117-concerto-lounge-2/2026-10-10-19-00", "https://ofir.pt/agenda/117-concerto-lounge-2/2026-10-10-19-00", "Ofir — página do evento"],
  "fever-candlelight-abba": ["https://feverup.com/m/107744?seasonal=p0462dp", "https://feverup.com/m/107744?seasonal=p0462dp", "Fever — página oficial do evento"],
  "fever-candlelight-adele": ["https://feverup.com/m/676016/pt", "https://feverup.com/m/676016/pt", "Fever — página oficial do evento"],
  "fever-jazz-room": ["https://feverup.com/m/684390/pt", "https://feverup.com/m/684390/pt", "Fever — página oficial do evento"],
  "fever-fado-principe-real": ["https://feverup.com/m/631983", "https://feverup.com/m/631983", "Fever — página oficial do evento"],
  "fever-candlelight-pink-floyd": ["https://feverup.com/pt/lisboa/candlelight/", "https://feverup.com/pt/lisboa/candlelight/", "Fever — agenda oficial"]
  ,"rui-veloso-lisboa": ["https://www.sagrescampopequeno.pt/en/rui-veloso-trio", "https://centraldeartistas.bol.pt/Comprar/Bilhetes/169511/1832219/Sectores", "Sagres Campo Pequeno / Central de Artistas — página do evento"]
  ,"river-stone-fest-2026": ["https://riverstone.bol.pt/Comprar/Bilhetes/171321-x_river_stone_fest-river_stone_fest/", "https://riverstone.bol.pt/Comprar/Bilhetes/171321/1898666/14127/Lotacao", "River Stone Fest / BOL — página do evento"]
  ,"fever-fado-chiado": ["https://feverup.com/m/67022/en?seasonal=p06e4dp", "https://feverup.com/m/67022/en?seasonal=p06e4dp", "Fever — página oficial do evento"]
  ,"faro-alternativo-2026": ["https://www.facebook.com/faroalternativofest/", null, "Faro Alternativo Fest — página oficial"]
  ,"vialonga-fest-2026": ["https://www.facebook.com/vialongafest/", null, "Vialonga Fest — página oficial"]
  ,"viseu-rock-fest-2026": ["https://www.facebook.com/viseurockfest/", null, "Viseu Rockfest — página oficial"]
  ,"colapso-fest-2026": ["https://www.facebook.com/ColapsoFest/", null, "Metalpunk Coimbra Fest — página oficial"]
  ,"black-box-fest-2026": ["https://www.facebook.com/BlackBoxFest/", "https://forms.gle/gfpRyg8mkNbDNSqv7", "Black Box Fest — página oficial"]
  ,"heavy-duty-fest-2026": ["https://www.facebook.com/HeavyDutyFest/", null, "Heavy Duty Fest — página oficial"]
  ,"portalegre-core-fest-set": ["https://www.portalegrecore.com/portalegre-core-fest", "https://www.portalegrecore.com/portalegre-core-fest", "Portalegre Core — página oficial do festival"]
  ,"portalegre-core-fest-nov": ["https://www.portalegrecore.com/portalegre-core-fest", "https://www.portalegrecore.com/portalegre-core-fest", "Portalegre Core — página oficial do festival"]
};
const auditedEventDetails = {
  "festa-avante-2026": {
    venue: "Quinta da Atalaia", source:"Festa do Avante! — programação oficial", sourceUrl:"https://www.festadoavante.pcp.pt/2026/musica", posterVerifiedAt:"2026-08-30", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Quinta%20da%20Atalaia%2C%20Avenida%20Ba%C3%ADa%20Natural%20do%20Seixal%20415%2C%20Amora",
    tickets: "Entrada Permanente 35 € até 3 setembro", ticketUrl: "https://www.festadoavante.pcp.pt/2026/comprar-ep", availability: "Disponível",
    programme: [
      { date:"2026-09-04", time:"18:45–00:00", title:"Malabá · Fjords · DEVASSAS · Baleia Baleia Baleia · Ex-Votos", venue:"Palco Paz" },
      { date:"2026-09-04", time:"20:00–00:00", title:"Eneiva Lapa · Batucadeiras da Quinta da Princesa · Irma · Beethoven 9.ª Sinfonia · The Black Mamba · Yuri da Cunha", venue:"Cidade da Juventude · Auditório 1.º de Maio · Palco 25 de Abril" },
      { date:"2026-09-05", time:"15:30–00:30", title:"Grupo Coral de São Brás do Regedouro · Grupo Coral do Sindicato da Indústria Mineira de Aljustrel · Adufeiras em Flor · Impasse B · Fala Povo Fala · Roda Ibérica · Cabra Çega · Piropop", venue:"Palco Paz" },
      { date:"2026-09-05", time:"14:30–00:30", title:"Chico Romelo · Ja Yl’ Son · Anarchicks · Erica Brown and The Bluegrass Connection · King Bigs · Bombino · Gabriel Gomes convida Rodrigo Leão · Janita Salomé c/ Maria João e Ana Bacalhau · Tim c/ Mário Laginha, Pedro Jóia e Coro Feminino TuttiEncantus · António Zambujo · 47 Soul · Cara de Espelho · Pedro Jóia convida Ney Matogrosso · Talismán · Ivandro · Rave Avante! · Carlão", venue:"Palco 25 de Abril · Auditório 1.º de Maio" },
      { date:"2026-09-05", time:"21:00–00:00", title:"Batalha do conhecimento · Yzulado", venue:"Cidade da Juventude" },
      { date:"2026-09-06", time:"14:30–22:00", title:"Cores do Vietname · donaranha · Espiral · Xoteiras · G-Combo · Moro Acid · Tropicaustica + O gringo sou eu?", venue:"Palco Paz" },
      { date:"2026-09-06", time:"15:00–21:30", title:"Coro Lopes Graça · Ghoya · Laurent Filipe · Luta livre · JP Simões · Diana Vilarinho · Regula · Pedro Moutinho e Hélder Moutinho · Carolina Deslandes · Aldina Duarte", venue:"Palco 25 de Abril · Auditório 1.º de Maio" },
      { date:"2026-09-06", time:"19:30–22:00", title:"Francisco Antunes · Naomy", venue:"Cidade da Juventude" }
    ]
  },
  "festival-moscatel-douro-2026": {
    venue: "Adega de Favaios", posterVerifiedAt:"2026-08-30", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Adega%20de%20Favaios%2C%20Alij%C3%B3", tickets: "Entrada e bilheteira por confirmar", ticketUrl: "", availability: "Por confirmar",
    programme: ["2026-09-11", "2026-09-12", "2026-09-13"].map(date => ({ date, time:"Horário por anunciar", title:"Programação musical por dia ainda não publicada pela organização", venue:"Favaios" }))
  },
  "festival-jovens-musicos-2026": {
    source:"RTP Antena 2 — programação oficial", sourceUrl:"https://antena2.rtp.pt/pjm/festival-jovens-musicos/em-contagem-decrescente-para-o-festival-jovens-musicos-2026/", posterVerifiedAt:"2026-08-30", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Funda%C3%A7%C3%A3o%20Calouste%20Gulbenkian%2C%20Lisboa", tickets: "Entrada livre", ticketUrl: "", availability: "Entrada livre",
    programme: [
      { date:"2026-09-15", time:"15:00–21:00", title:"Instalação sonora Lugares Invisíveis · entrega de prémios · Henrique Pinto Quarteto · Orquestra GeraJazz c/ João Barradas · Solistas SAMP", venue:"Lisboa Incomum · Auditório 3 · Grande Auditório Gulbenkian" },
      { date:"2026-09-16", time:"16:00–21:00", title:"CD de João Diogo Leitão · mesa redonda do Instituto Gregoriano · KerberosTrio EPME · Flowing Reeds Duo · Orquestra Metropolitana de Lisboa c/ Teresa Macedo Ferreira", venue:"Auditório 2 · Grande Auditório Gulbenkian" },
      { date:"2026-09-17", time:"16:00–21:00", title:"Mesa redonda arte, ciência e tecnologia · homenagem a Maria Teresa de Macedo · Quarteto Tágide · Cecília Quartet · Irene Lima · solistas laureados PJM 2026 com Orquestra Gulbenkian", venue:"Auditório 3 · Grande Auditório Gulbenkian" }
    ]
  },
  "festival-colombo-2026": {
    venue: "Vila Baleira", source:"Events Madeira — cartaz oficial", sourceUrl:"https://eventsmadeira.com/en/event/columbus-festival-2/", posterVerifiedAt:"2026-08-30", mapsUrl: "https://www.google.com/maps?q=33.078403181695826,-16.334833570347325", time: "17 setembro 15:00 — 20 setembro 23:00", tickets: "Entrada e bilheteira por confirmar", ticketUrl: "", availability: "Por confirmar",
    programme: ["2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20"].map(date => ({ date, time: date === "2026-09-17" ? "A partir das 15:00" : date === "2026-09-20" ? "Até às 23:00" : "Horário por anunciar", title:"Concertos, encenações e mercado quinhentista — programa detalhado por dia ainda não publicado", venue:"Vila Baleira, Porto Santo" }))
  },
  "vul-afro-encircle": { tickets: "Entrada gratuita (19:00–23:00); bilhetes em breve" },
  "vul-kizomba-rua": { tickets: "Entrada gratuita; RSVP em breve" },
  "vul-afterglow": { tickets: "Registo obrigatório; bilhetes em breve" },
  "vul-riot": { tickets: "Bilhetes em breve" },
  "vul-beleza-abstracta": { tickets: "Entrada gratuita (17:00–23:00); bilhetes em breve" },
  "viriato-voz-rock": { tickets: "Bilheteira oficial ainda não localizada" },
  "viriato-luis-lapa": { tickets: "Bilheteira oficial ainda não localizada" },
  "viriato-nanook": { tickets: "Bilheteira oficial ainda não localizada" },
  "viriato-lagrimas-mar": { tickets: "Bilheteira oficial ainda não localizada" },
  "viriato-kevin-morby": { tickets: "Bilheteira oficial ainda não localizada" },
  "viriato-sophia": { tickets: "Bilheteira oficial ainda não localizada" },
  "viriato-manel-cruz": { tickets: "Bilheteira oficial ainda não localizada" },
  "viriato-carminho": { tickets: "Bilheteira oficial ainda não localizada" },
  "leiria-carolina-deus": { tickets: "Bilheteira oficial ainda não localizada" },
  "leiria-uhf-cartel": { tickets: "Bilheteira oficial ainda não localizada" },
  "leiria-valter-lobo": { tickets: "Bilheteira oficial ainda não localizada" },
  "leiria-juntos-musica": { tickets: "Bilheteira oficial ainda não localizada" },
  "leiria-mendelssohn": { tickets: "Bilheteira oficial ainda não localizada" },
  "leiria-em-casa-amalia": { tickets: "Bilheteira oficial ainda não localizada", availability: "Por confirmar", verifiedAt: "2026-09-05" },
  "leiria-diz-concerto": { tickets: "Bilheteira oficial ainda não localizada" },
  "leiria-orquestra-jazz": { tickets: "Bilheteira oficial ainda não localizada" }
  ,"faro-alternativo-2026": { tickets: "Informação e bilhetes para a edição 2026 por confirmar", availability: "Por confirmar" }
  ,"vialonga-fest-2026": { time: "17:00", venue: "Sociedade Recreativa da Granja", tickets: "Entrada livre · recolha solidária para a Kausa Animal", availability: "Entrada livre", lineup: "Lesados · Endless 2.0 · Dalai Lume · Last Piss Before Death · Faemine · Cobra ao Pescoço · Chaos Addiction · Vasco Rodrigues" }
  ,"viseu-rock-fest-2026": { tickets: "Informação e bilhetes por confirmar", availability: "Por confirmar" }
  ,"colapso-fest-2026": { time: "Portas 17:00 · concertos 18:00", tickets: "Pré-venda 17,50 € · 20 € no dia", availability: "Disponível", lineup: "Hetta · Soul of Anubis · Pledge · Dokuga · Lord of Confusion · So Dead" }
  ,"black-box-fest-2026": { venue: "Sede dos Trovadores do Cano", tickets: "Pré-venda online", availability: "Disponível", lineup: "Cutterred Flesh · Totengott · Booby Trap · Warside · The Small Hours · Vomitous Iniquity · Viledög · Putrid Offal · Xerión · Sonneillon · Square · Nojo · Armatilha" }
  ,"heavy-duty-fest-2026": { tickets: "35 € pré-venda · 40 € no dia", availability: "Disponível", lineup: "Medieval Steel · Elixir · Tarantula · Venator · Wicked Leather · Toxik Attack" }
  ,"portalegre-core-fest-set": { time: "Portas 21:00 · concertos 21:30", tickets: "5 € por dia · sócios: entrada gratuita", availability: "Disponível", lineup: "Henriette B · Destroyers of All · Incordian · António Freitas DJ" }
  ,"portalegre-core-fest-nov": { time: "Portas 21:00 · concertos 21:30", tickets: "5 € por dia · sócios: entrada gratuita", availability: "Disponível", lineup: "Alchemists · Empire of Disease · Vaneno · Black Flamingo DJ" }
  ,"moonspell-sintra-2026": { tickets: "Esgotado", availability: "Esgotado", capacity: "Esgotado", salesCheckedAt: "2026-09-05", verifiedAt: "2026-09-05" }
};
EVENTS.forEach(event => {
  const poster = officialPosters[event.id];
  const page = officialEventPages[event.id];
  if (poster) [event.image, event.posterSourceUrl] = poster;
  if (page) {
    event.sourceUrl = page[0];
    event.source = page[2] || "CCB — página do evento";
    if (page[1]) event.ticketUrl = page[1];
    else delete event.ticketUrl;
  }
  if (auditedEventDetails[event.id]) Object.assign(event, auditedEventDetails[event.id]);
  if (legacyOfficialPosterIds.has(event.id) && event.image) event.posterSourceUrl = event.sourceUrl;
  if (event.posterSourceUrl) event.posterVerifiedAt ||= "2026-08-23";
});

// Caminhos Metálicos is a valuable discovery calendar, but its public agenda
// does not provide event-level sales pages. Never present that calendar as a
// ticket button; the entry remains visible while its official page is audited.
EVENTS.forEach(event => {
  if (event.source === "Caminhos Metálicos") {
    delete event.ticketUrl;
    event.tickets = "Bilheteira oficial ainda não localizada";
    event.availability = "Por confirmar";
    event.source = "Caminhos Metálicos — agenda";
  }
  if (event.source === "gnration — página do evento" && event.tickets !== "Entrada livre" && !event.salesCheckedAt) {
    event.availability = "Por confirmar";
  }
  if (event.source === "Village Underground Lisboa — página do evento" && !event.salesCheckedAt) {
    event.availability = "Por confirmar";
  }
  if (event.source === "Sagres Campo Pequeno — página do evento" && !event.salesCheckedAt) {
    event.availability = "Por confirmar";
  }
  if (event.source === "Casa da Música — página do evento" && !event.salesCheckedAt) {
    event.availability = "Por confirmar";
  }
  if (event.source === "Teatro Viriato — página do evento" && !event.salesCheckedAt) {
    event.availability = "Por confirmar";
  }
  if (event.source === "Leiriagenda — página do evento" && !event.salesCheckedAt) {
    event.availability = "Por confirmar";
  }
  if (event.source === "CCB — página do evento" && !event.salesCheckedAt) {
    event.availability = "Por confirmar";
  }
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

[dateSelect, priceSelect].forEach(setupCustomSelect);
const multiFilterSync = [];
function setupMultiFilter(button, menu, values, key, allLabel, onChange = () => {}) {
  let availableValues = unique(values);
  const sync = () => {
    const selected = state[key];
    button.querySelector("strong").textContent = selected.length ? `${selected.length} selecionado${selected.length === 1 ? "" : "s"}` : allLabel;
    button.classList.toggle("has-value", Boolean(selected.length));
    [...menu.children].forEach(option => option.setAttribute("aria-pressed", String(selected.includes(option.dataset.value))));
  };
  const rebuild = () => {
    menu.innerHTML = "";
    availableValues.forEach(value => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "multi-select-option";
      option.dataset.value = value;
      option.textContent = value;
      option.setAttribute("aria-pressed", "false");
      option.addEventListener("click", () => {
        state[key] = state[key].includes(value) ? state[key].filter(item => item !== value) : [...state[key], value];
        state.page = 1;
        onChange(key);
        sync();
        render();
      });
      menu.append(option);
    });
    sync();
  };
  button.addEventListener("click", () => {
    const open = !menu.classList.contains("open");
    document.querySelectorAll(".multi-select-menu.open").forEach(other => other.classList.remove("open"));
    menu.classList.toggle("open", open);
    button.setAttribute("aria-expanded", String(open));
  });
  multiFilterSync.push(sync);
  rebuild();
  return {
    sync,
    refresh(nextValues) {
      availableValues = unique(nextValues);
      state[key] = state[key].filter(value => availableValues.includes(value));
      rebuild();
    }
  };
}
const locationEvents = (skip = "") => EVENTS.filter(event =>
  (skip === "area" || !state.area.length || state.area.includes(event.area)) &&
  (skip === "district" || !state.district.length || state.district.includes(event.district)) &&
  (skip === "city" || !state.city.length || state.city.includes(event.city))
);
const locationValues = (key, skip = "") => unique(locationEvents(skip).map(event => event[key]));
let areaMultiFilter;
let districtMultiFilter;
let cityMultiFilter;
// The last choice leads the chain. Incompatible choices in the other two
// controls disappear instead of creating an impossible location combination.
const refreshLocationOptions = (changedKey = "") => {
  const priority = changedKey === "area"
    ? ["district", "city", "area"]
    : changedKey === "district"
      ? ["area", "city", "district"]
      : changedKey === "city"
        ? ["area", "district", "city"]
        : ["area", "district", "city"];
  const filters = { area: areaMultiFilter, district: districtMultiFilter, city: cityMultiFilter };
  priority.forEach(key => filters[key]?.refresh(locationValues(key, key)));
};
const genreMultiFilter = setupMultiFilter(genreFilter, genreMenu, EVENTS.flatMap(event => event.genres), "genre", "Todos os géneros");
const typeMultiFilter = setupMultiFilter(typeFilter, typeMenu, EVENTS.map(eventType), "type", "Todos os formatos");
const ticketPriceMultiFilter = setupMultiFilter(ticketPriceFilter, ticketPriceMenu, ["Entrada livre", "Até 10 €", "10–25 €", "25–50 €", "Mais de 50 €", "Preço por confirmar"], "ticketPrice", "Qualquer preço");
areaMultiFilter = setupMultiFilter(areaFilter, areaMenu, EVENTS.map(event => event.area), "area", "Todas as áreas", refreshLocationOptions);
districtMultiFilter = setupMultiFilter(districtFilter, districtMenu, EVENTS.map(event => event.district), "district", "Todos os distritos", refreshLocationOptions);
cityMultiFilter = setupMultiFilter(cityFilter, cityMenu, EVENTS.map(event => event.city), "city", "Todos os concelhos", refreshLocationOptions);
refreshLocationOptions();
document.addEventListener("click", event => {
  if (!event.target.closest(".custom-select")) document.querySelectorAll(".custom-select.open").forEach(select => select.classList.remove("open"));
  if (!event.target.closest(".multi-filter-wrap")) {
    document.querySelectorAll(".multi-select-menu.open").forEach(menu => menu.classList.remove("open"));
    [genreFilter, typeFilter, ticketPriceFilter, areaFilter, districtFilter, cityFilter].forEach(button => button.setAttribute("aria-expanded", "false"));
  }
});
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
const hasFreeEntry = event => /entrada livre|entrada gratuita|gratuit[oa]|gr[aá]tis|\bfree\b/i.test(`${event.tickets} ${event.capacity} ${event.title}`);
const freeEntryOnly = event => /^\s*(entrada livre|entrada gratuita|gratuit[oa]|gr[aá]tis|free)\s*[.!]?\s*$/i.test(event.tickets || "");
const availabilityLabel = event => freeEntryOnly(event)
  ? "Entrada livre"
  : event.salesCheckedAt || ["Esgotado", "Cancelado", "Adiado"].includes(event.availability)
  ? event.availability
  : "Bilhetes a confirmar";
const ticketStatus = event => event.availability === "Esgotado"
  ? "Esgotado"
  : hasFreeEntry(event) ? event.tickets : genericTicketUrl(event.ticketUrl) ? "Bilheteira a confirmar" : event.tickets;
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
const isCurrentOrUpcoming = (event, today = shiftedIso(0)) => eventLastDate(event) >= today;
const dateFilterRange = value => {
  if (!value) return null;
  const today = shiftedIso(0);
  if (value === "today") return [today, today];
  if (value === "week") return [today, shiftedIso(6)];
  if (value === "month") {
    const start = new Date();
    start.setHours(12, 0, 0, 0);
    start.setMonth(start.getMonth() + 1, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 12);
    return [localIso(start), localIso(end)];
  }
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  const weekday = date.getDay();
  if (weekday === 0) return [today, today];
  const untilFriday = weekday <= 5 ? 5 - weekday : 0;
  date.setDate(date.getDate() + untilFriday);
  const start = localIso(date);
  date.setDate(date.getDate() + (weekday === 6 ? 1 : 2));
  return [start, localIso(date)];
};
const overlapsRange = (event, range) => !range || (event.date <= range[1] && (event.endDate || event.date) >= range[0]);
const isFreeEvent = freeEntryOnly;
const matchesPrice = event => !state.price ||
  (state.price === "free" && isFreeEvent(event)) ||
  (state.price === "available" && !isFreeEvent(event) && !["Esgotado", "Cancelado", "Bilhetes a confirmar"].includes(availabilityLabel(event))) ||
  (state.price === "pending" && availabilityLabel(event) === "Bilhetes a confirmar") ||
  (state.price === "sold" && availabilityLabel(event) === "Esgotado");
const ticketPriceCategory = event => {
  if (freeEntryOnly(event)) return "Entrada livre";
  const prices = [...String(event.tickets || "").matchAll(/(\d{1,4}(?:[.,]\d{1,2})?)\s*€/g)]
    .map(match => Number(match[1].replace(",", ".")))
    .filter(Number.isFinite);
  if (!prices.length) return "Preço por confirmar";
  const price = Math.min(...prices);
  if (price <= 10) return "Até 10 €";
  if (price <= 25) return "10–25 €";
  if (price <= 50) return "25–50 €";
  return "Mais de 50 €";
};
const matchesTicketPrice = event => !state.ticketPrice.length || state.ticketPrice.includes(ticketPriceCategory(event));
const isUnderground = event => event.genres.some(genre => /metal|hardcore|punk|doom|death/i.test(genre)) || /bar|local/i.test(eventType(event));
const matchesHighlight = event => !state.highlight ||
  (state.highlight === "free" && isFreeEvent(event)) ||
  (state.highlight === "festival" && eventType(event) === "Festival") ||
  (state.highlight === "underground" && isUnderground(event)) ||
  (state.highlight === "sold" && availabilityLabel(event) === "Esgotado");
const hasOfficialPoster = event => Boolean(event.image && event.posterSourceUrl);
const posterStyle = image => {
  const url = safePublicUrl(image);
  return url ? `style="--poster-image:url(&quot;${escapeHtml(encodeURI(url))}&quot;)"` : "";
};
const feedbackAction = event => `<button class="report-link feedback-open" type="button" data-feedback-kind="correction" data-feedback-event-id="${escapeHtml(event.id)}" data-feedback-event-title="${escapeHtml(encodeURIComponent(event.title))}">Informação errada?</button>`;
const eventUrl = event => `/evento/${encodeURIComponent(event.id)}`;
const compactNearbyDate = event => {
  const [startDay, startMonth] = dateParts(event.date);
  if (!event.endDate) return `${startDay} ${startMonth}`;
  const [endDay, endMonth] = dateParts(event.endDate);
  return startMonth === endMonth ? `${startDay}–${endDay} ${startMonth}` : `${startDay} ${startMonth} — ${endDay} ${endMonth}`;
};

function renderNearby(latitude, longitude, area) {
  const today = shiftedIso(0);
  const matches = EVENTS
    .filter(event => !event.seriesId && hasOfficialPoster(event) && isCurrentOrUpcoming(event, today) && areaCentres[event.area])
    .map(event => ({ event, distance: distanceTo(latitude, longitude, ...areaCentres[event.area]) }))
    .sort((left, right) => left.distance - right.distance || left.event.date.localeCompare(right.event.date))
    .slice(0, 16)
    .sort((left, right) => Number(portraitPosterIds.has(right.event.id)) - Number(portraitPosterIds.has(left.event.id)) || left.distance - right.distance)
    .slice(0, 8);
  nearbyEvents.hidden = false;
  if (!matches.length) {
    nearbyRail.innerHTML = '<p class="nearby-empty">Ainda não há eventos com cartaz oficial perto de ti.</p>';
    nearbyHint.textContent = `Ainda não encontrámos cartazes oficiais perto de ${area}.`;
    syncNearbyControls();
    return;
  }
  nearbyRail.innerHTML = matches.map(({ event }) => `<article class="nearby-card">
    <a href="${eventUrl(event)}" aria-label="Abrir ${escapeHtml(event.title)}">
      <span class="nearby-poster" ${posterStyle(event.image)}><img src="${escapeHtml(safePublicUrl(event.image))}" alt="Cartaz oficial de ${escapeHtml(event.title)}" loading="lazy" decoding="async" /></span>
      <span class="nearby-copy"><time datetime="${escapeHtml(event.date)}">${escapeHtml(compactNearbyDate(event))}</time><h3>${escapeHtml(event.title)}</h3></span>
    </a>
  </article>`).join("");
  nearbyRail.querySelectorAll("img").forEach(image => image.addEventListener("error", () => image.closest(".nearby-card")?.remove(), { once: true }));
  nearbyRail.scrollLeft = 0;
  syncNearbyControls();
}

function syncNearbyControls() {
  if (!nearbyPrevious || !nearbyNext) return;
  const remaining = nearbyRail.scrollWidth - nearbyRail.clientWidth - nearbyRail.scrollLeft;
  nearbyPrevious.disabled = nearbyRail.scrollLeft < 4;
  nearbyNext.disabled = remaining < 4;
}

function moveNearby(direction) {
  const card = nearbyRail.querySelector(".nearby-card");
  const step = card ? card.getBoundingClientRect().width + 12 : nearbyRail.clientWidth * .8;
  nearbyRail.scrollBy({ left: direction * step, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

function renderFeatured() {
  const today = shiftedIso(0);
  featuredRail.setAttribute("aria-busy", "true");
  window.clearInterval(featuredAutoscroll);
  const featured = EVENTS
    // These are the five events whose programmes still begin today or later.
    // A festival from the previous month never occupies a future slot.
    .filter(event => !event.seriesId && hasOfficialPoster(event) && event.date >= today)
    .filter(event => event.availability !== "Cancelado")
    .sort((a, b) => a.date.localeCompare(b.date) || Number(portraitPosterIds.has(b.id)) - Number(portraitPosterIds.has(a.id)) || a.title.localeCompare(b.title, "pt"))
    .slice(0, 5);
  featuredRail.innerHTML = featured.length ? featured.map(event => {
    const date = event.endDate ? `${prettyDate(event.date)} — ${prettyDate(event.endDate)}` : prettyDate(event.date);
    return `<article class="featured-card" data-event-id="${escapeHtml(event.id)}">
      <span class="featured-poster" ${posterStyle(event.image)}><img src="${escapeHtml(safePublicUrl(event.image))}" alt="Cartaz oficial de ${escapeHtml(event.title)}" loading="lazy" decoding="async"></span>
      <div class="featured-copy"><p>${escapeHtml(eventType(event))} · ${escapeHtml(event.city)}</p><h3>${escapeHtml(event.title)}</h3><time datetime="${escapeHtml(event.date)}">${escapeHtml(date)}</time><a href="${eventUrl(event)}">Abrir evento <svg class="link-arrow" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 15 15 5M7 5h8v8" /></svg></a></div>
    </article>`;
  }).join("") : '<p class="featured-empty">Ainda estamos a confirmar os próximos eventos.</p>';
  featuredRail.querySelectorAll("img").forEach(image => image.addEventListener("error", () => {
    image.closest(".featured-poster")?.classList.add("poster-unavailable");
    image.alt = "Cartaz oficial temporariamente indisponível";
  }, { once: true }));
  featuredRail.setAttribute("aria-label", "Cinco próximos eventos por ordem cronológica");
  featuredRail.setAttribute("aria-busy", "false");
  startFeaturedAutoscroll();
}

function scheduleFeaturedRefresh() {
  window.clearTimeout(featuredRefreshTimer);
  const nextDay = new Date();
  nextDay.setHours(24, 0, 3, 0);
  featuredRefreshTimer = window.setTimeout(() => {
    const today = shiftedIso(0);
    const cursorMonth = `${calendarCursor.getFullYear()}-${String(calendarCursor.getMonth() + 1).padStart(2, "0")}`;
    if (cursorMonth < today.slice(0, 7)) {
      const next = EVENTS.filter(event => !event.seriesId && isCurrentOrUpcoming(event, today))
        .sort((left, right) => left.date.localeCompare(right.date))[0];
      calendarCursor = eventDate(next ? (next.date < today ? today : next.date) : today);
    }
    renderFeatured();
    render();
    scheduleFeaturedRefresh();
  }, Math.max(1_000, nextDay.getTime() - Date.now()));
}

function startFeaturedAutoscroll() {
  // A suggestion should stay where the visitor leaves it. On desktop all five
  // are visible; on mobile the rail is deliberately explored by touch.
  window.clearInterval(featuredAutoscroll);
  featuredAutoscroll = undefined;
}

function eventCard(event) {
  const [day, month] = dateParts(event.date);
  const endDay = event.endDate ? eventDate(event.endDate).getDate() : null;
  const availability = availabilityLabel(event);
  const statusClass = availability === "Esgotado" ? "sold" : availability === "Cancelado" ? "cancelled" : availability === "Bilhetes a confirmar" ? "pending" : "";
  return `<article class="event-card" data-event-id="${escapeHtml(event.id)}">
    <a class="event-card-link" href="${eventUrl(event)}" aria-label="Abrir ${escapeHtml(event.title)}">
      <time class="date-box" datetime="${escapeHtml(event.date)}"><b>${escapeHtml(endDay ? `${day}–${endDay}` : day)}</b><span>${escapeHtml(month)}</span></time>
      <span class="event-main"><span class="event-title">${escapeHtml(event.title)}</span><span class="event-venue">${escapeHtml(event.venue)} · ${escapeHtml(event.city)}</span></span>
      <span class="format">${escapeHtml(eventType(event))}</span>
      <span class="status ${statusClass}">${escapeHtml(availability)}</span>
      <span class="chevron" aria-hidden="true"><svg viewBox="0 0 20 20" focusable="false"><path d="M5 15 15 5M7 5h8v8" /></svg></span>
    </a>
  </article>`;
}

function filteredEvents() {
  const query = searchableText(state.search.trim());
  const selectedRange = dateFilterRange(state.date);
  const today = shiftedIso(0);
  return EVENTS.filter(event => !event.seriesId && isCurrentOrUpcoming(event, today)).filter(event => {
    const group = [event, ...festivalChildren(event)];
    const text = searchableText(group.flatMap(item => [item.title, item.venue, item.city, item.district, item.area, eventType(item), ...item.genres]).join(" "));
    return (!query || text.includes(query)) &&
      group.some(item => overlapsRange(item, selectedRange)) &&
      (!state.genre.length || group.some(item => item.genres.some(genre => state.genre.includes(genre)))) &&
      (!state.area.length || group.some(item => state.area.includes(item.area))) &&
      (!state.district.length || group.some(item => state.district.includes(item.district))) &&
      (!state.city.length || group.some(item => state.city.includes(item.city))) &&
      (!state.type.length || group.some(item => state.type.includes(eventType(item)))) &&
      matchesPrice(event) &&
      matchesTicketPrice(event) &&
      matchesHighlight(event);
  }).sort((a, b) => a.date.localeCompare(b.date));
}

function renderCalendar(matches) {
  calendarGrid.setAttribute("aria-busy", "true");
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const eventByDay = new Map();
  matches.forEach(event => {
    const first = eventDate(event.date);
    const last = eventDate(event.endDate || event.date);
    for (const date = new Date(first); date <= last; date.setDate(date.getDate() + 1)) {
      if (date.getFullYear() !== year || date.getMonth() !== month) continue;
      const day = date.getDate();
      eventByDay.set(day, [...(eventByDay.get(day) || []), event]);
    }
  });
  calendarLabel.textContent = monthLabel(calendarCursor);
  const weekdayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const blanks = Array.from({ length: mondayOffset }, () => '<div class="calendar-day empty" aria-hidden="true"></div>');
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const events = eventByDay.get(day) || [];
    return `<article class="calendar-day"><time datetime="${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}">${day}</time>${events.slice(0, 3).map(event => `<a href="${eventUrl(event)}">${escapeHtml(event.title)}</a>`).join("")}${events.length > 3 ? `<small>+${events.length - 3} eventos</small>` : ""}</article>`;
  });
  calendarGrid.innerHTML = weekdayLabels.map(day => `<span class="calendar-weekday">${day}</span>`).join("") + blanks.join("") + days.join("");
  calendarGrid.setAttribute("aria-busy", "false");
}

function render() {
  const matches = filteredEvents();
  const pages = Math.max(1, Math.ceil(matches.length / perPage));
  state.page = Math.min(state.page, pages);
  const first = (state.page - 1) * perPage;
  const visible = matches.slice(first, first + perPage);
  const calendarMode = state.view === "calendar";
  list.hidden = calendarMode;
  list.setAttribute("aria-busy", "true");
  calendarView.hidden = !calendarMode;
  document.querySelector(".event-list-heading").hidden = calendarMode;
  list.classList.remove("is-updating");
  list.innerHTML = visible.map(eventCard).join("");
  agendaEmpty.hidden = calendarMode || matches.length > 0;
  window.requestAnimationFrame(() => list.classList.add("is-updating"));
  list.setAttribute("aria-busy", "false");
  if (calendarMode) renderCalendar(matches);
  if (resultCount) resultCount.textContent = `${matches.length} ${matches.length === 1 ? "evento" : "eventos"}`;
  pagination.hidden = calendarMode || matches.length <= perPage;
  pageLabel.textContent = `Página ${state.page} de ${pages}`;
  previousPage.disabled = state.page === 1;
  nextPage.disabled = state.page === pages;
  syncFilterToggle();
}

function syncFilterToggle() {
  const active = [state.date, state.price, state.highlight].filter(Boolean).length + state.ticketPrice.length + state.genre.length + state.type.length + state.area.length + state.district.length + state.city.length;
  const isOpen = !filterPanel.hidden;
  filterToggle.querySelector("span").textContent = isOpen ? "Fechar filtros" : active ? `Filtros · ${active}` : "Filtros";
  filterToggle.querySelector("i").textContent = isOpen ? "×" : "+";
  filterToggle.classList.toggle("has-active", Boolean(active));
}

function updateFilter(key, value) { state[key] = value; state.page = 1; render(); }
function resetAgendaSelection() {
  Object.assign(state, { search: "", date: "", price: "", ticketPrice: [], genre: [], area: [], district: [], city: [], type: [], highlight: "", page: 1 });
  document.querySelector("#search").value = "";
  dateSelect.value = "";
  priceSelect.value = "";
  document.querySelectorAll("[data-quick-pick]").forEach(button => button.setAttribute("aria-pressed", "false"));
  refreshLocationOptions();
  multiFilterSync.forEach(sync => sync());
  [dateSelect, priceSelect].forEach(select => select.dispatchEvent(new Event("change")));
}
function openFeaturedEvent(id) {
  const eventPage = `/evento/${encodeURIComponent(id)}`;
  location.assign(eventPage);
}
function renderSources() {
  document.querySelector("#source-groups").innerHTML = SOURCE_GROUPS.map(group => `<article class="source-group"><h3>${escapeHtml(group.title)}</h3>${group.sources.map(([name, type, url]) => url ? `<a href="${escapeHtml(safePublicUrl(url))}" target="_blank" rel="noopener">${escapeHtml(name)}<span>${escapeHtml(type)}</span></a>` : `<p class="source-pending"><b>${escapeHtml(name)}</b><span>${escapeHtml(type)}</span></p>`).join("")}</article>`).join("");
}

document.querySelector("#search").addEventListener("input", event => updateFilter("search", event.target.value));
featuredRail.addEventListener("click", event => {
  if (event.target.closest(".featured-copy a")) return;
  const card = event.target.closest(".featured-card");
  if (card) openFeaturedEvent(card.dataset.eventId);
});
filterToggle.addEventListener("click", () => {
  filterPanel.hidden = !filterPanel.hidden;
  filterToggle.setAttribute("aria-expanded", String(!filterPanel.hidden));
  syncFilterToggle();
});
dateSelect.addEventListener("change", event => updateFilter("date", event.target.value));
priceSelect.addEventListener("change", event => updateFilter("price", event.target.value));
document.querySelectorAll("[data-agenda-view]").forEach(button => button.addEventListener("click", () => {
  state.view = button.dataset.agendaView;
  document.querySelectorAll("[data-agenda-view]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
  render();
}));
calendarPrevious.addEventListener("click", () => { calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1, 12); render(); });
calendarNext.addEventListener("click", () => { calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1, 12); render(); });
document.querySelector("#clear-filters").addEventListener("click", () => {
  resetAgendaSelection();
  render();
});
document.querySelectorAll("[data-quick-pick]").forEach(button => button.addEventListener("click", () => {
  const pick = button.dataset.quickPick;
  const isDatePick = ["today", "weekend", "week"].includes(pick);
  const next = isDatePick ? (state.date === pick ? "" : pick) : (state.highlight === pick ? "" : pick);
  state.highlight = isDatePick ? "" : next;
  state.date = isDatePick ? next : state.date;
  dateSelect.value = state.date;
  state.page = 1;
  document.querySelectorAll("[data-quick-pick]").forEach(item => item.setAttribute("aria-pressed", String(item === button && Boolean(next))));
  dateSelect.dispatchEvent(new Event("change"));
}));
nearbyPrevious?.addEventListener("click", () => moveNearby(-1));
nearbyNext?.addEventListener("click", () => moveNearby(1));
nearbyRail.addEventListener("scroll", syncNearbyControls, { passive: true });
function requestNearby() {
  if (!navigator.geolocation) {
    nearbyHint.textContent = "Localização não disponível neste browser.";
    return;
  }
  if (!window.isSecureContext) {
    nearbyHint.textContent = "A localização só funciona numa ligação segura.";
    return;
  }
  nearbyButton.disabled = true;
  nearbyHint.textContent = "A localizar a tua área…";
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    const [area, distance] = Object.entries(areaCentres).reduce((closest, [name, [latitude, longitude]]) => {
      const kilometres = distanceTo(coords.latitude, coords.longitude, latitude, longitude);
      return kilometres < closest[1] ? [name, kilometres] : closest;
    }, ["", Infinity]);
    nearbyPosition = { latitude: coords.latitude, longitude: coords.longitude, area };
    nearbyHint.textContent = `A mostrar os eventos mais próximos da região de ${area}.`;
    renderNearby(coords.latitude, coords.longitude, area);
    nearbyButton.disabled = false;
  }, error => {
    nearbyHint.textContent = error?.code === 1
      ? "Autoriza a localização no browser para ver eventos perto de ti."
      : error?.code === 3
        ? "A localização demorou demasiado. Tenta novamente."
        : "Não foi possível determinar a tua localização. Tenta novamente.";
    nearbyButton.disabled = false;
  }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 3600000 });
}
nearbyButton.addEventListener("click", requestNearby);
previousPage.addEventListener("click", () => { state.page -= 1; render(); });
nextPage.addEventListener("click", () => { state.page += 1; render(); });
agendaEmpty.querySelector("button").addEventListener("click", () => {
  resetAgendaSelection();
  render();
});
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

function setFeedbackMode(kind, eventId = "", eventTitle = "") {
  const promoter = kind === "promoter";
  const correction = kind === "correction";
  const context = `${correction ? "correction" : promoter ? "promoter" : "suggestion"}:${eventId}`;
  const contextChanged = feedbackForm.dataset.draftContext !== context;
  if (contextChanged) feedbackForm.reset();
  feedbackKind.value = correction ? "correction" : promoter ? "promoter" : "suggestion";
  feedbackEventId.value = eventId;
  feedbackEventTitle.value = eventTitle;
  if (contextChanged || correction) feedbackEventName.value = eventTitle;
  feedbackEventName.readOnly = correction;
  feedbackEventField.hidden = correction;
  feedbackTypePicker.hidden = correction;
  feedbackTypePicker.querySelectorAll("[data-feedback-choice]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.feedbackChoice === feedbackKind.value));
  });
  feedbackFields.hidden = false;
  feedbackEventDetails.hidden = promoter;
  feedbackPromoterDetails.hidden = !promoter;
  feedbackPosterField.hidden = promoter;
  feedbackForm.elements.posterUrl.setCustomValidity("");
  ["name", "email", "officialUrl", "message"].forEach(name => {
    feedbackForm.elements[name].required = !correction;
  });
  ["eventDate", "city"].forEach(name => { feedbackForm.elements[name].required = !correction && !promoter; });
  ["promoterLocation", "genres", "instagramUrl", "agendaUrl"].forEach(name => { feedbackForm.elements[name].required = promoter; });
  feedbackEventName.required = !correction;
  feedbackTitle.textContent = correction ? "Corrigir esta informação." : promoter ? "Adicionar uma página." : "Sugerir um evento.";
  feedbackContext.textContent = correction
    ? `Vais corrigir: ${eventTitle}. Indica o que mudou e deixa uma fonte oficial que o confirme.`
    : promoter
      ? "Ajuda-nos a encontrar a tua agenda. A página será sempre confirmada por uma pessoa antes de entrar nas fontes do Desvio."
      : "Preenche todos os dados e inclui uma fonte oficial. A sugestão será sempre revista antes de aparecer na agenda.";
  feedbackNameLabel.textContent = promoter ? "Nome da promotora, sala ou projeto" : "Evento";
  feedbackEventName.placeholder = promoter ? "Ex.: Nome da promotora ou sala" : "Artista, festival ou nome do evento";
  feedbackOfficialLabel.textContent = promoter ? "Site oficial" : "Link oficial";
  feedbackMessageLabel.innerHTML = correction
    ? "O que está errado ou desatualizado?"
    : promoter ? "Conta-nos brevemente o que programas" : "O que devemos adicionar?";
  feedbackForm.dataset.draftContext = context;
  feedbackStatus.textContent = "";
  feedbackSubmit.disabled = false;
  feedbackSubmit.innerHTML = "Enviar para revisão <span>↗</span>";
}

function feedbackHasContent() {
  const fieldNames = ["name", "email", "eventName", "eventDate", "city", "promoterLocation", "genres", "instagramUrl", "agendaUrl", "officialUrl", "posterUrl", "message"];
  const hasText = fieldNames.some(name => String(feedbackForm.elements[name]?.value || "").trim());
  const hasPoster = feedbackForm.elements.posterFile?.files?.length > 0;
  const hasConsent = Boolean(feedbackForm.elements.privacyAcknowledged?.checked);
  return hasText || hasPoster || hasConsent;
}

function requestFeedbackClose() {
  if (feedbackHasContent() && !window.confirm("Ao fechar, os dados ainda não enviados serão perdidos. Queres continuar?")) return;
  feedbackDialog.close();
}

function openFeedback(button) {
  const kind = button.dataset.feedbackKind || "suggestion";
  const eventId = button.dataset.feedbackEventId || "";
  const eventTitle = button.dataset.feedbackEventTitle ? decodeURIComponent(button.dataset.feedbackEventTitle) : "";
  setFeedbackMode(kind, eventId, eventTitle);
  configureTurnstile();
  feedbackDialog.showModal();
}

async function configureTurnstile() {
  if (turnstileConfigured) return;
  try {
    const response = await fetch("/api/config", { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const config = await response.json();
    if (!config.turnstileSiteKey) return;
    turnstileWrap.hidden = false;
    turnstileWrap.innerHTML = `<div class="cf-turnstile" data-sitekey="${config.turnstileSiteKey}" data-theme="light"></div>`;
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    document.head.append(script);
    turnstileConfigured = true;
  } catch {
    // The public form only becomes live after the Cloudflare Function is deployed.
  }
}

const canvasToBlob = (canvas, quality) => new Promise(resolve => canvas.toBlob(resolve, "image/webp", quality));

async function optimisePosterFile(file) {
  if (!(file instanceof File) || !file.size) return file;
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) {
    throw new Error("O cartaz deve ser JPG, PNG ou WebP.");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Escolhe um cartaz com menos de 15 MB antes da otimização.");
  }

  const image = await createImageBitmap(file);
  let scale = Math.min(1, maxPosterDimension / Math.max(image.width, image.height));
  let blob;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, height);

    for (const quality of [0.92, 0.88, 0.84, 0.8]) {
      blob = await canvasToBlob(canvas, quality);
      if (blob && blob.size <= maxPosterUploadBytes) break;
    }
    if (blob && blob.size <= maxPosterUploadBytes) break;
    scale *= 0.82;
  }
  image.close();
  if (!blob || blob.size > maxPosterUploadBytes) {
    throw new Error("Não foi possível reduzir este cartaz para 2 MB. Tenta uma imagem mais pequena.");
  }

  const filename = (file.name || "cartaz").replace(/\.[^.]+$/, "") + ".webp";
  return new File([blob], filename, { type: "image/webp" });
}

document.addEventListener("click", event => {
  const trigger = event.target.closest(".feedback-open");
  if (trigger) openFeedback(trigger);
  const choice = event.target.closest("[data-feedback-choice]");
  if (choice) setFeedbackMode(choice.dataset.feedbackChoice);
});
document.querySelector("#feedback-close").addEventListener("click", requestFeedbackClose);
feedbackDialog.addEventListener("cancel", event => {
  if (!feedbackHasContent()) return;
  event.preventDefault();
  requestFeedbackClose();
});
feedbackForm.addEventListener("submit", async event => {
  event.preventDefault();
  const suggestion = feedbackKind.value === "suggestion";
  const posterUrl = String(feedbackForm.elements.posterUrl.value || "").trim();
  const posterFile = feedbackForm.elements.posterFile.files?.[0];
  feedbackForm.elements.posterUrl.setCustomValidity(suggestion && !posterUrl && !posterFile
    ? "Inclui o link do cartaz ou envia uma imagem oficial."
    : "");
  if (!feedbackForm.reportValidity()) return;
  const data = new FormData(feedbackForm);
  const submittedPosterFile = data.get("posterFile");
  try {
    if (submittedPosterFile instanceof File && submittedPosterFile.size) {
      feedbackStatus.textContent = "A otimizar o cartaz…";
      data.set("posterFile", await optimisePosterFile(submittedPosterFile));
    }
  } catch (error) {
    feedbackStatus.textContent = error.message || "Não foi possível otimizar o cartaz.";
    return;
  }
  feedbackStatus.textContent = "A enviar…";
  feedbackSubmit.disabled = true;
  feedbackSubmit.textContent = "A enviar…";
  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: data
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Não foi possível enviar agora.");
    feedbackStatus.textContent = "Recebido para revisão. Se deixaste um email, usamos esse contacto apenas para responder ao pedido.";
    feedbackForm.reset();
    feedbackSubmit.textContent = "Enviado ✓";
  } catch (error) {
    feedbackStatus.textContent = error.message || "Não foi possível enviar agora. Tenta novamente mais tarde.";
    feedbackSubmit.disabled = false;
    feedbackSubmit.innerHTML = "Tentar novamente <span>↗</span>";
  }
});

renderSources();
renderFeatured();
scheduleFeaturedRefresh();
render();

function openCorrectionFromUrl() {
  const eventId = new URLSearchParams(location.search).get("corrigir");
  const event = EVENTS.find(item => item.id === eventId);
  if (!event) return;
  setFeedbackMode("correction", event.id, event.title);
  configureTurnstile();
  feedbackDialog.showModal();
  const url = new URL(location.href);
  url.searchParams.delete("corrigir");
  history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

openCorrectionFromUrl();

// Community suggestions only arrive here after the private review area has
// confirmed a direct official source. The bundled list remains the fast,
// free-to-serve catalogue; D1 adds newly approved records without exposing a
// raw public submission.
async function loadApprovedCloudflareEvents() {
  try {
    const response = await fetch("/api/events", { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const result = await response.json();
    if (!Array.isArray(result.items)) return;
    const overrides = Array.isArray(result.overrides) ? result.overrides : [];
    let changed = false;
    const safePatchFields = new Set(["title", "tickets", "ticketUrl", "availability", "sourceUrl"]);
    overrides.forEach(override => {
      const existing = EVENTS.find(event => event.id === override.id);
      if (!existing || !override.patch || typeof override.patch !== "object") return;
      for (const [key, value] of Object.entries(override.patch)) {
        if (!safePatchFields.has(key) || typeof value !== "string") continue;
        existing[key] = key.endsWith("Url") ? safePublicUrl(value) : value.slice(0, key === "title" ? 180 : 1000);
      }
      changed = true;
    });
    const known = new Set(EVENTS.map(event => event.id));
    const additions = result.items.flatMap(raw => {
      if (!raw || typeof raw !== "object" || !/^[a-z0-9-]{1,180}$/i.test(raw.id || "") || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date || "") || known.has(raw.id)) return [];
      const sourceUrl = safePublicUrl(raw.sourceUrl);
      if (!sourceUrl || !String(raw.title || "").trim()) return [];
      const string = (key, fallback = "") => typeof raw[key] === "string" ? raw[key].trim().slice(0, 1000) : fallback;
      return [{
        id: raw.id,
        title: string("title").slice(0, 180),
        date: raw.date,
        endDate: /^\d{4}-\d{2}-\d{2}$/.test(raw.endDate || "") ? raw.endDate : undefined,
        time: string("time", "Consultar organização"),
        venue: string("venue", "Local a confirmar"),
        city: string("city", "A confirmar"),
        district: string("district", "A confirmar"),
        area: string("area", "A confirmar"),
        type: string("type", "Concerto"),
        genres: Array.isArray(raw.genres) ? raw.genres.filter(value => typeof value === "string").map(value => value.slice(0, 80)).slice(0, 12) : ["Outro"],
        age: string("age", "Consultar organização"),
        tickets: string("tickets", "Bilheteira por confirmar"),
        ticketUrl: safePublicUrl(raw.ticketUrl),
        availability: string("availability", "Por confirmar"),
        capacity: string("capacity", "Não divulgado"),
        source: string("source", "Fonte oficial confirmada pelo Desvio"),
        sourceUrl,
        image: safePublicUrl(raw.image),
        posterSourceUrl: safePublicUrl(raw.posterSourceUrl),
        verifiedAt: /^\d{4}-\d{2}-\d{2}$/.test(raw.verifiedAt || "") ? raw.verifiedAt : ""
      }];
    });
    if (!additions.length && !changed) return;
    additions.forEach(event => EVENTS.push(event));
    genreMultiFilter.refresh(EVENTS.flatMap(event => event.genres));
    typeMultiFilter.refresh(EVENTS.map(eventType));
    refreshLocationOptions();
    renderFeatured();
    if (nearbyPosition) renderNearby(nearbyPosition.latitude, nearbyPosition.longitude, nearbyPosition.area);
    render();
  } catch {
    // The static agenda is intentionally a complete offline-safe fallback.
  }
}

loadApprovedCloudflareEvents();
