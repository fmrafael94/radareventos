/*
  Source watchlist. Official sources confirm a listing. Editorial, community and
  social sources create leads, which are labelled before being confirmed.
*/
window.SOURCE_GROUPS = [
  { title:"Descoberta nacional", sources:[
    ["NoCartaz","Agenda por distrito","https://www.nocartaz.pt/"],
    ["Arte-Factos","Agenda de concertos","https://www.arte-factos.net/agenda/"],
    ["Música.com.pt","Concertos e festivais","https://musica.com.pt/concertos-e-festivais/"],
    ["Visit Portugal","Eventos de música","https://www.visitportugal.com/pt-pt/encontre/grandes-eventos/list?field_data_fim_value%5Bvalue%5D%5Bdate%5D=&field_data_inicio_value%5Bvalue%5D%5Bdate%5D=&field_poi_tipo_de_evento_value_i18n=All&order=1&page=9&term_node_tid_depth_i18n=204&term_node_tid_depth_i18n_1=239"],
    ["Viral Agenda","Agenda nacional","https://www.viralagenda.com/pt/"], ["Bandsintown","Concertos por artista","https://www.bandsintown.com/f/countries/pt"],
    ["JamBase","Concertos em Portugal","https://www.jambase.com/concerts/pt"], ["Route des Festivals","Festivais","https://www.routedesfestivals.com/en/portugal"],
    ["Agenda LX","Agenda Lisboa","https://www.agendalx.pt/"], ["Agenda Cultural do Porto","Agenda Porto","https://agendaculturalporto.org/concertos-de-musica-no-porto/"],
    ["Câmaras Municipais","308 agendas locais","https://www.anmp.pt/"], ["Cascais Cultura","Festas e concertos","https://www.cascais.pt/noticia/musica-esta-de-volta-ao-palco-mais-proximo-do-atlantico"], ["Festival F","Faro — festival municipal","https://bilheteira.fnac.pt/Evento-559465/FESTIVAL-F"],
    ["Agenda Cultural Sintrense","Sintra — agenda municipal","https://cm-sintra.pt/agenda?filter_category=3&filter_from=2026-08-08"], ["Amadora em Festa","Amadora — concertos gratuitos","https://www.cm-amadora.pt/pt/cultura/10908-amadora-em-festa-2026-municipio-festeja-aniversario-de-3-a-13-de-setembro.html"], ["Loures Agenda","Loures — cultura municipal","https://cm-loures.pt/agenda.aspx?displayid=17086"],
    ["Festas Populares de Corroios","Seixal — festas populares","https://www.cm-seixal.pt/evento/festas-populares-de-corroios-2026"], ["Sagres Campo Pequeno","Lisboa — agenda oficial","https://www.sagrescampopequeno.pt/pt/agenda"], ["Leiriagenda","Leiria — agenda cultural municipal","https://leiriagenda.cm-leiria.pt/pt/agenda/proximos-eventos?agente=teatro-jose-lucio-da-silva"], ["CCP — Centro Cultural de Paredes","Paredes — agenda set/dez 2026","https://www.cm-paredes.pt/cmparedes/uploads/writer_file/document/8298/agenda_ccp_centro_cultural_de_paredes_set_dez_2026_f.pdf"], ["Póvoa Arena / BOL","Póvoa de Varzim — bilheteira","https://www.bol.pt/Comprar/Bilhetes/176838-boney_m_povoa_de_varzim-povoa_arena/"], ["Casa das Artes Famalicão / BOL","Vila Nova de Famalicão — bilheteira","https://casadasartesvnf.bol.pt/Comprar/Bilhetes/182460-samuel_uria_cine_concerto-casa_das_artes_de_famalicao/"]
  ]},
  { title:"Promotores e bilheteiras", sources:[
    ["Everything Is New","Promotor","https://everythingisnew.pt/"], ["House of Fun","Promotor","https://houseoffun.pt/"],
    ["Amplificasom","Promotor","https://amplificasom.com/"], ["CLAP/BOX","Promotor","https://www.clap-box.com/"],
    ["Ticketline","Bilheteira","https://ticketline.sapo.pt/"], ["FNAC Bilheteira","Bilheteira","https://www.fnac.pt/Bilheteira-FNAC-os-espetaculos-que-nao-podes-perder-em-2026/cp4569/w-4"], ["BOL","Bilheteira","https://www.bol.pt/"], ["Clockwork Store","Bilheteira hardcore","https://clockworkstore.com/"], ["Kontramarka","Bilheteira internacional","https://www.kontramarka.com/"], ["Vibess","Bilheteira","https://tickets.vibess.es/"], ["Ticket Tailor","Bilheteira de promotores","https://www.tickettailor.com/"],
    ["MEO Blueticket","Bilheteira","https://www.blueticket.pt/"], ["WOOK Bilheteira","Bilheteira","https://www.wook.pt/en/bilheteira"], ["Fever","Bilheteira","https://feverup.com/"], ["Fienta","Bilheteira de festivais","https://fienta.com/"],
    ["Shotgun","Clubes e eletrónica","https://shotgun.live/pt-pt"], ["DICE","Concertos","https://dice.fm/"], ["Resident Advisor","Eletrónica","https://ra.co/events/pt/lisbon"],
    ["Xceed","Noites e clubes","https://xceed.me/"], ["Eventbrite Portugal","Eventos locais","https://www.eventbrite.pt/"], ["See Tickets","Bilheteira","https://www.seetickets.com/pt"],
    ["Live Nation Portugal","Promotor","https://www.livenation.pt/"], ["Last Tour Portugal","Promotor","https://lasttour.org/pt-pt/"],
    ["Música no Coração","Promotor","https://www.musicanocoracao.pt/"], ["Sons em Trânsito","Promotor","https://sonsemtransito.com/"], ["UAU","Promotor","https://www.uau.pt/"],
    ["Hell Xis Agency","Promotor underground","https://www.instagram.com/hellxis/"], ["Prime Artists","Promotor","https://www.primeartists.eu/"], ["Born2Resist","Fonte sugerida — página oficial a localizar",null]
  ]},
  { title:"Salas e agendas locais", sources:[
    ["RCA Club","Lisboa","https://www.rcaclub.com/agenda/"], ["Hard Club","Porto","https://www.hardclubporto.com/"],
    ["Casa da Música","Porto","https://casadamusica.com/agenda/"], ["CCB","Lisboa","https://www.ccb.pt/eventos/"],
    ["Teatro Aveirense","Aveiro","https://www.teatroaveirense.pt/"], ["Theatro Circo","Braga","https://www.theatrocirco.com/"],
    ["Teatro das Figuras","Faro","https://www.teatrodasfiguras.pt/"], ["Teatro Micaelense","Ponta Delgada","https://www.teatromicaelense.pt/agenda/musica/"],
    ["CCVF / Guimarães Jazz","Guimarães","https://www.ccvf.pt/en/detail-eventos/20261112-guimaraes-jazz-2026-geral/"], ["Rock & Dão","Viseu","https://www.freguesiadeviseu.pt/rock-dao/"],
    ["Museu do Fado","Lisboa","https://museudofado.pt/eventos"], ["B.Leza","Lisboa","https://linktr.ee/b.leza"],
    ["Lisboa Cultura","Lisboa","https://egeac.pt/programacao-espacos-culturais/"], ["Hip Hop Portugal","Hip-Hop","https://hiphopportugal.pt/agenda/"],
    ["Ofir","Concertos locais e bares","https://ofir.pt/agenda"], ["República da Música","Lisboa","https://republicadamusica.pt/eventos/"],
    ["São Carlos","Ópera e música clássica","https://www.saocarlos.pt/"], ["Festas Portugal","Festas e palcos locais","https://festasportugal.pt/"],
    ["Festival Iminente","Lisboa","https://festivaliminente.com/"], ["MEO Kalorama","Lisboa","https://meokalorama.pt/en/"],
    ["Indie Music Fest","Baltar / Paredes","https://indiemusicfest.pt/"], ["OUT.FEST","Barreiro","https://outfest.pt/programa/"],
    ["Taguspark Music Sessions","Oeiras","https://www.bol.pt/Comprar/Bilhetes/180813-ciclo_de_concertos_taguspark_music_sessions-taguspark/"], ["Orquestra Ligeira de Lagos","Lagos","https://www.orquestraligeiradelagos.pt/agenda/"],
    ["Ferro Bar","Porto / underground","https://www.agenda-porto.pt/local/ferro-bar/"], ["Caminhos Metálicos","Metal / hardcore","https://www.caminhosmetalicos.com/agenda/"], ["Faro Alternativo","Faro / rock e metal","https://www.caminhosmetalicos.com/agenda/"], ["Under The Doom","Lisboa / doom metal","https://www.notredameproductions.com/copy-of-first-event-2"], ["Reign Of Fury Fest","Corroios / hardcore","https://reignfuryfest.com/"],
    ["Ruído Sonoro","Musa e salas pequenas","https://ruidosonoro.com/agenda/"], ["Time Out Market","Lisboa","https://timeoutmarket.loadhtl.com/lisboa/en/shows-events/"],
    ["Musicbox","Lisboa / independente","https://musicboxlisboa.com/"], ["Lux Frágil","Lisboa / eletrónica","https://www.luxfragil.com/"],
    ["Casa do Capitão","Lisboa / independente","https://casa-capitao.com/evento/festa-de-abertura/"], ["Village Underground","Lisboa / club e concertos","https://vulisboa.com/eventos"],
    ["Gulbenkian","Lisboa / clássica e jazz","https://gulbenkian.pt/agenda/"], ["Culturgest","Lisboa / concertos","https://www.culturgest.pt/"],
    ["Tivoli BBVA","Lisboa / concertos","https://www.teatrotivolibbva.pt/"], ["Super Bock Arena","Porto","https://www.superbockarena.pt/"],
    ["Coliseu Porto Ageas","Porto","https://www.coliseu.pt/"], ["Maus Hábitos","Porto / independente","https://maushabitos.com/"],
    ["Plano B","Porto / eletrónica","https://planob.pt/"], ["gnration","Braga / experimental","https://gnration.pt/"],
    ["Convento São Francisco","Coimbra","https://www.conventosaofrancisco.pt/"], ["Salão Brazil","Coimbra / jazz","https://www.salaobrazil.pt/"],
    ["TAGV","Coimbra","https://tagv.pt/"], ["Teatro Viriato","Viseu","https://www.teatroviriato.com/"],
    ["Teatro Municipal da Guarda","Guarda","https://www.tmg.pt/"], ["Cine-Teatro Louletano","Loulé","https://cineteatrolouletano.pt/"]
  ]},
  { title:"Revistas, blogs e comunidade", sources:[
    ["Time Out Lisboa","Editorial","https://www.timeout.pt/lisboa/pt/musica"], ["Noite e Música","Editorial","https://www.noitemusicamagazine.pt/agenda"],
    ["Arte Sonora","Editorial","https://artesonora.pt/"], ["Noise Culture","Editorial","https://noiseculture.pt/"],
    ["MIC.PT","Música portuguesa","https://mic.pt/agenda"], ["Agenda Porto","Comunitária","https://www.agenda-porto.pt/"],
    ["r/porto","Comunidade","https://www.reddit.com/r/porto/"], ["r/MetalPortugal","Comunidade","https://www.reddit.com/r/MetalPortugal/"],
    ["Música Sem Capa","Instagram","https://www.instagram.com/musicasemcapa/"], ["Ferro Bar","Instagram","https://www.instagram.com/ferrobar/"],
    ["Moshpit","Metal, punk e pesado","https://moshpit.pt/"], ["Rimas e Batidas","Hip-Hop e eletrónica","https://www.rimasebatidas.pt/"],
    ["BLITZ","Música e anúncios","https://blitz.pt/"], ["Gerador","Cultura e eventos","https://gerador.eu/"], ["Wherever","Lisboa e Porto","https://wherever.pt/"]
  ]}
];
