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
const filterToggle = document.querySelector("#filter-toggle");
const filterPanel = document.querySelector("#filter-panel");

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
  ,"leiria-em-casa-amalia": ["https://leiriagenda.cm-leiria.pt/uploads/agenda/c80de5605d5ae093c34710d994df6f39/em_casa_damalia_o_concerto_ao_vivo_358x329.jpg", "https://leiriagenda.cm-leiria.pt/pt/agenda/em-casa-damalia--o-concerto-ao-vivo"]
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
  ,"moonspell-sintra-2026": ["https://www.moonspell.com/galeria/tours/b9e0a2e983aa6f22debdf7e90f0d0e79.png", "https://www.moonspell.com/tours/"]
};
// A festival's official bill is also the correct artwork for its programme
// sessions. These are deliberately shared — never replaced by made-up art.
const sharedProgrammePosters = {
  "festas-mar-cascais-2026": ["festas-mar-20-main","festas-mar-21-main","festas-mar-22-main","festas-mar-23-main","festas-mar-27-main","festas-mar-28-main","festas-mar-29-main","festas-mar-30-main","festas-mar-20-local","festas-mar-21-local","festas-mar-22-local","festas-mar-23-local","festas-mar-27-local","festas-mar-28-local","festas-mar-29-local","festas-mar-30-local"],
  "corroios-2026": ["corroios-21-legendary-tigerman","corroios-22-folclore","corroios-23-quatro-meia","corroios-24-santamaria","corroios-25-ricardo-ribeiro","corroios-26-revolution-within","corroios-27-djs","corroios-28-vitor-kley","corroios-29-valete","corroios-30-diogo-picarra"],
  "kalorama-2026": ["kalorama-2026-08-28","kalorama-2026-08-29","kalorama-2026-08-30"],
  "outfest-2026": ["outfest-2026-10-01","outfest-2026-10-02","outfest-2026-10-03","outfest-2026-10-04"]
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
  "leiria-em-casa-amalia": ["https://leiriagenda.cm-leiria.pt/pt/agenda/em-casa-damalia--o-concerto-ao-vivo", null, "Leiriagenda — página do evento"],
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
  "moonspell-sintra-2026": ["https://www.moonspell.com/tours/", "https://reservas-worten.byblueticket.pt/Eventos/15946", "Moonspell — página oficial / MEO Blueticket"]
};
const auditedEventDetails = {
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
  "leiria-em-casa-amalia": { tickets: "Bilheteira oficial ainda não localizada" },
  "leiria-diz-concerto": { tickets: "Bilheteira oficial ainda não localizada" },
  "leiria-orquestra-jazz": { tickets: "Bilheteira oficial ainda não localizada" }
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
  if (event.posterSourceUrl) event.posterVerifiedAt = "2026-08-23";
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
  : "Bilhetes a confirmar";
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
const hasOfficialPoster = event => Boolean(event.image && event.posterSourceUrl);
const posterStyle = image => `style="--poster-image:url(&quot;${encodeURI(image)}&quot;)"`;
const reportUrl = event => `https://github.com/fabio-rafael-sorted/radareventos/issues/new?title=${encodeURIComponent(`Correção: ${event.title}`)}&body=${encodeURIComponent(`Evento: ${event.title}\nData: ${prettyDate(event.date)}\nFonte atual: ${event.sourceUrl}\n\nO que está errado ou falta atualizar?\n`)}`;

function renderFeatured() {
  const today = shiftedIso(0);
  const featured = EVENTS
    .filter(event => !event.seriesId && hasOfficialPoster(event) && (event.endDate || event.date) >= today)
    .sort((a, b) => Math.max(eventDate(a.date).getTime(), eventDate(today).getTime()) - Math.max(eventDate(b.date).getTime(), eventDate(today).getTime()))
    .slice(0, 5);
  featuredRail.innerHTML = featured.map(event => {
    const date = event.endDate ? `${prettyDate(event.date)} — ${prettyDate(event.endDate)}` : prettyDate(event.date);
    return `<article class="featured-card">
      <button class="featured-poster poster-trigger" type="button" ${posterStyle(event.image)} aria-label="Ampliar cartaz oficial de ${event.title}"><img src="${event.image}" alt="Cartaz oficial de ${event.title}" loading="lazy"></button>
      <div class="featured-copy"><p>${eventType(event)} · ${event.city}</p><h3>${event.title}</h3><time datetime="${event.date}">${date}</time><a href="${event.sourceUrl}" target="_blank" rel="noopener">Página oficial ↗</a></div>
    </article>`;
  }).join("");
}

function eventCard(event) {
  const [day, month] = dateParts(event.date);
  const endDay = event.endDate ? eventDate(event.endDate).getDate() : null;
  const fullDate = event.endDate ? `${prettyDate(event.date)} — ${prettyDate(event.endDate)}` : prettyDate(event.date);
  const availability = availabilityLabel(event);
  const statusClass = availability === "Esgotado" ? "sold" : availability === "Cancelado" ? "cancelled" : availability === "Bilhetes a confirmar" ? "pending" : "";
  const children = festivalChildren(event).sort((a, b) => `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`));
  const groupedDays = [...new Set(children.map(child => child.date))];
  const schedule = children.length ? `<div class="festival-program"><span class="detail-label">${event.endDate ? "Programa por dia / sessões" : "Alinhamento e horário"}</span>${groupedDays.length > 1 ? `<div class="festival-day-tabs" role="tablist">${groupedDays.map((date, index) => `<button type="button" role="tab" data-festival-day="${event.id}-${date}" aria-selected="${index === 0}">${prettyDate(date)}</button>`).join("")}</div>` : ""}${groupedDays.map((date, index) => `<section class="festival-day" data-festival-day-panel="${event.id}-${date}"${index ? " hidden" : ""}><h4>${prettyDate(date)}</h4>${children.filter(child => child.date === date).map(child => `<div class="festival-slot">${hasOfficialPoster(child) ? `<button class="festival-slot-art poster-trigger" type="button" ${posterStyle(child.image)} aria-label="Ampliar cartaz oficial de ${child.title}"><img src="${child.image}" alt="Cartaz oficial de ${child.title}" loading="lazy"></button>` : ""}<time>${child.time || "Horário a confirmar"}</time><div><strong>${child.title.replace(/^.*?— /, "")}</strong><span>${child.venue}</span></div><em>${ticketStatus(child)}</em>${programmeAction(child)}</div>`).join("")}</section>`).join("")}</div>` : `<div class="single-program"><span class="detail-label">Alinhamento / horário</span><div class="festival-slot"><time>${event.time || "Horário a confirmar"}</time><div><strong>${event.lineup || event.title}</strong><span>${event.venue}</span></div><em>${ticketStatus(event)}</em>${programmeAction(event)}</div></div>`;
  const art = hasOfficialPoster(event) ? `<button class="event-art poster-trigger" type="button" ${posterStyle(event.image)} aria-label="Ampliar cartaz oficial de ${event.title}"><img src="${event.image}" alt="Cartaz oficial de ${event.title}" loading="lazy"><span class="event-art-caption">Ampliar cartaz</span></button>` : `<p class="event-art-missing">Não existe cartaz oficial ainda.</p>`;
  const ticket = event.availability === "Esgotado" ? `<span class="ticket-link ticket-pending">Esgotado</span>` : genericTicketUrl(event.ticketUrl) ? `<span class="ticket-link ticket-pending">Bilheteira oficial ainda não localizada</span>` : `<a class="ticket-link" href="${event.ticketUrl}" target="_blank" rel="noopener">${event.tickets} ↗</a>`;
  const sourceLabel = "Fonte";
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
  syncFilterToggle();
}

function syncFilterToggle() {
  const active = [state.date, state.genre, state.area, state.type, state.highlight].filter(Boolean).length + state.district.length + state.city.length;
  const isOpen = !filterPanel.hidden;
  filterToggle.querySelector("span").textContent = isOpen ? "Fechar filtros" : active ? `Filtros · ${active}` : "Filtros";
  filterToggle.querySelector("i").textContent = isOpen ? "×" : "+";
  filterToggle.classList.toggle("has-active", Boolean(active));
}

function updateFilter(key, value) { state[key] = value; state.page = 1; render(); }
function renderSources() {
  document.querySelector("#source-groups").innerHTML = SOURCE_GROUPS.map(group => `<article class="source-group"><h3>${group.title}</h3>${group.sources.map(([name, type, url]) => url ? `<a href="${url}" target="_blank" rel="noopener">${name}<span>${type}</span></a>` : `<p class="source-pending"><b>${name}</b><span>${type}</span></p>`).join("")}</article>`).join("");
}

document.querySelector("#search").addEventListener("input", event => updateFilter("search", event.target.value));
filterToggle.addEventListener("click", () => {
  filterPanel.hidden = !filterPanel.hidden;
  filterToggle.setAttribute("aria-expanded", String(!filterPanel.hidden));
  syncFilterToggle();
});
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
render();
