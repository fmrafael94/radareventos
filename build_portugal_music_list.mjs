import fs from 'node:fs/promises';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const outDir = '/Users/fabioxrafael/.codex/.chatgpt-projects/g-p-6a89ed430ab48191863d37bf581b78d5/outputs/portugal_music_event_promotion_20260823';
const municipalCsv = '/private/tmp/portugal_municipal_sites/Official_Websites_of_the_Portuguese_Municipalities.csv';

const source = (name, category, coverage, place, website, instagram, notes) => [
  name, category, coverage, place, website, instagram, notes,
];

const sources = [
  source('Viral Agenda', 'National discovery / calendar', 'Portugal-wide', 'Portugal', 'https://www.viralagenda.com/pt/', 'https://www.instagram.com/viralagenda/', 'Event directory; filter by music, date, municipality, venue and promoter.'),
  source('Visit Portugal — music events', 'National discovery / calendar', 'Portugal-wide', 'Portugal', 'https://www.visitportugal.com/pt-pt/encontre-tipo?f%5B0%5D=sm_field_origem_evento%3A1&f%5B1%5D=sm_field_poi_tipo_de_evento%3A8&page=1&visitas=1', '', 'National tourism board music-event directory.'),
  source('Música.com.pt', 'National discovery / calendar', 'Portugal-wide', 'Portugal', 'https://musica.com.pt/concertos-e-festivais/', '', 'Concert and festival listing.'),
  source('Festas Portugal', 'National discovery / calendar', 'Portugal-wide', 'Portugal', 'https://festasportugal.pt/', '', 'Regional festas, romarias and festival listings; often includes live music.'),
  source('Bandsintown Portugal', 'National discovery / calendar', 'Portugal-wide', 'Portugal', 'https://www.bandsintown.com/f/countries/pt', '', 'Artist-led concerts and festival discovery.'),
  source('JamBase Portugal', 'National discovery / calendar', 'Portugal-wide', 'Portugal', 'https://www.jambase.com/concerts/pt', '', 'Concert discovery.'),
  source('Route des Festivals — Portugal', 'National discovery / calendar', 'Portugal-wide', 'Portugal', 'https://www.routedesfestivals.com/en/portugal', '', 'Festival dates, line-ups and ticketing.'),
  source('Festival Lynx', 'National discovery / calendar', 'Portugal-wide', 'Portugal', 'https://www.festivallynx.com/en', '', 'Festival discovery.'),
  source('Arte-Factos agenda', 'Music media / calendar', 'Portugal-wide', 'Portugal', 'https://www.arte-factos.net/agenda/', '', 'Concert agenda with city filters.'),
  source('Noite e Música Magazine', 'Music media / calendar', 'Portugal-wide', 'Portugal', 'https://www.noitemusicamagazine.pt/agenda', '', 'Concert and festival news / agenda.'),
  source('Wherever', 'Independent calendar', 'Lisbon and Porto', 'Lisbon / Porto', 'https://wherever.pt/', 'https://www.instagram.com/wherever.pt/', 'Independent local cultural programming, including music.'),
  source('Agenda LX', 'City cultural calendar', 'Lisbon', 'Lisbon', 'https://www.agendalx.pt/', 'https://www.instagram.com/agendalx/', 'Official-style monthly cultural agenda.'),
  source('Agenda Cultural do Porto', 'City cultural calendar', 'Porto', 'Porto', 'https://agendaculturalporto.org/concertos-de-musica-no-porto/', '', 'Music-specific Porto calendar.'),
  source('Moshpit', 'Genre calendar', 'Portugal-wide', 'Portugal', 'https://moshpit.pt/', 'https://www.instagram.com/moshpit.pt/', 'Metal, punk and heavy music events.'),
  source('Rimas e Batidas', 'Music media', 'Portugal-wide', 'Portugal', 'https://www.rimasebatidas.pt/', 'https://www.instagram.com/rimasebatidas/', 'Hip-hop, electronic and Portuguese music coverage.'),
  source('BLITZ', 'Music media', 'Portugal-wide', 'Portugal', 'https://blitz.pt/', 'https://www.instagram.com/blitzmagazine/', 'Music news, announcements and live coverage.'),
  source('Gerador', 'Culture media', 'Portugal-wide', 'Portugal', 'https://gerador.eu/', 'https://www.instagram.com/gerador.eu/', 'Culture and event coverage.'),
  source('Time Out Lisboa — Música', 'City media / calendar', 'Lisbon', 'Lisbon', 'https://www.timeout.pt/lisboa/pt/musica', 'https://www.instagram.com/timeoutlisboa/', 'Editorial picks and listings.'),
  source('Time Out Porto', 'City media / calendar', 'Porto', 'Porto', 'https://www.timeout.pt/porto/pt', 'https://www.instagram.com/timeoutporto/', 'Editorial picks and listings.'),
  source('Música Sem Capa', 'Instagram music calendar', 'Portugal-wide', 'Portugal', '', 'https://www.instagram.com/musicasemcapa/', 'Regional posts about Portuguese artists and concerts.'),

  source('BOL', 'Ticketing / discovery', 'Portugal-wide', 'Portugal', 'https://www.bol.pt/', 'https://www.instagram.com/bol.pt/', 'Music & Festivals category.'),
  source('Ticketline', 'Ticketing / discovery', 'Portugal-wide', 'Portugal', 'https://ticketline.sapo.pt/', 'https://www.instagram.com/ticketlineportugal/', 'Major ticketing inventory.'),
  source('MEO Blueticket', 'Ticketing / discovery', 'Portugal-wide', 'Portugal', 'https://blueticket.meo.pt/', 'https://www.instagram.com/blueticketpt/', 'Major ticketing inventory.'),
  source('Shotgun', 'Ticketing / discovery', 'Portugal-wide', 'Portugal', 'https://shotgun.live/pt-pt', 'https://www.instagram.com/shotgun.live/', 'Clubs, electronic music and independent events.'),
  source('Fever', 'Ticketing / discovery', 'Major cities', 'Portugal', 'https://feverup.com/', 'https://www.instagram.com/fever_global/', 'Experiences and concerts.'),
  source('DICE', 'Ticketing / discovery', 'Major cities', 'Portugal', 'https://dice.fm/', 'https://www.instagram.com/dicefm/', 'Concert ticketing and discovery.'),
  source('Resident Advisor', 'Electronic-music calendar', 'Portugal-wide', 'Portugal', 'https://ra.co/events/pt/lisbon', 'https://www.instagram.com/resident_advisor/', 'Electronic / club listings; alter city in the URL or search.'),
  source('Xceed', 'Ticketing / discovery', 'Major cities', 'Portugal', 'https://xceed.me/', 'https://www.instagram.com/xceed.me/', 'Club and nightlife events.'),
  source('Eventbrite Portugal', 'Ticketing / discovery', 'Portugal-wide', 'Portugal', 'https://www.eventbrite.pt/', 'https://www.instagram.com/eventbrite/', 'Self-published local events.'),
  source('See Tickets Portugal', 'Ticketing / discovery', 'Portugal-wide', 'Portugal', 'https://www.seetickets.com/pt', '', 'Ticketing inventory.'),
  source('Ticketle', 'Ticketing / discovery', 'Portugal-wide', 'Portugal', 'https://www.ticketle.pt/', '', 'Shows, festivals and tour dates.'),
  source('FNAC Portugal', 'Retail / ticketing / showcases', 'Portugal-wide', 'Portugal', 'https://www.fnac.pt/', 'https://www.instagram.com/fnacportugal/', 'Track local-store showcases, ticketing and cultural campaigns.'),

  source('Everything Is New', 'Promoter', 'Portugal-wide', 'Lisbon', 'https://everythingisnew.pt/', 'https://www.instagram.com/everythingisnew.pt/', 'Large concert and festival promoter; NOS Alive etc.'),
  source('Last Tour Portugal', 'Promoter', 'Portugal-wide', 'Portugal', 'https://lasttour.org/pt-pt/', 'https://www.instagram.com/lasttourportugal/', 'Concerts, festivals and brand music experiences.'),
  source('Ritmos & Blues', 'Promoter', 'Portugal-wide', 'Portugal', 'https://ritmoseblues.pt/', 'https://www.instagram.com/ritmoseblues/', 'Live concerts and large productions.'),
  source('Live Nation Portugal', 'Promoter', 'Portugal-wide', 'Portugal', 'https://www.livenation.pt/', 'https://www.instagram.com/livenationportugal/', 'International concert promoter.'),
  source('Prime Artists', 'Promoter', 'Portugal-wide', 'Portugal', 'https://primeartists.eu/', 'https://www.instagram.com/primeartists/', 'Concert and tour promoter.'),
  source('Música no Coração', 'Promoter', 'Portugal-wide', 'Portugal', 'https://www.musicanocoracao.pt/', 'https://www.instagram.com/musicanocoracao/', 'Festival and music-event promoter.'),
  source('PEV Entertainment', 'Promoter', 'Portugal-wide', 'Porto', 'https://peventertainment.pt/', 'https://www.instagram.com/peventertainment/', 'Concert and entertainment promoter.'),
  source('House of Fun', 'Promoter', 'Portugal-wide', 'Portugal', 'https://houseoffun.pt/', 'https://www.instagram.com/houseoffunpt/', 'Concert promoter.'),
  source('Sons em Trânsito', 'Promoter / artist management', 'Portugal-wide', 'Portugal', 'https://sonsemtransito.com/', 'https://www.instagram.com/sonsemtransito/', 'Portuguese artist and concert promotion.'),
  source('UAU', 'Promoter', 'Portugal-wide', 'Lisbon / Porto', 'https://www.uau.pt/', 'https://www.instagram.com/uauproducoes/', 'Concerts and live productions.'),

  source('NOS Alive', 'Festival', 'Annual', 'Oeiras / Lisbon', 'https://nosalive.com/', 'https://www.instagram.com/nos_alive/', 'Festival-specific announcements.'),
  source('MEO Kalorama', 'Festival', 'Annual', 'Lisbon', 'https://meokalorama.pt/', 'https://www.instagram.com/meokalorama/', 'Festival-specific announcements.'),
  source('Rock in Rio Lisboa', 'Festival', 'Annual', 'Lisbon', 'https://rockinriolisboa.sapo.pt/', 'https://www.instagram.com/rockinriolisboa/', 'Festival-specific announcements.'),
  source('Primavera Sound Porto', 'Festival', 'Annual', 'Porto', 'https://www.primaverasound.com/porto', 'https://www.instagram.com/primavera_sound/', 'Festival-specific announcements.'),
  source('MEO Marés Vivas', 'Festival', 'Annual', 'Vila Nova de Gaia', 'https://maresvivas.meo.pt/', 'https://www.instagram.com/meomaresvivas/', 'Festival-specific announcements.'),
  source('Vodafone Paredes de Coura', 'Festival', 'Annual', 'Paredes de Coura', 'https://www.paredesdecoura.com/', 'https://www.instagram.com/paredesdecoura/', 'Festival-specific announcements.'),
  source('Neopop', 'Festival', 'Annual', 'Viana do Castelo', 'https://neopopfestival.com/', 'https://www.instagram.com/neopopfestival/', 'Electronic-music festival.'),
  source('SonicBlast', 'Festival', 'Annual', 'Vila Praia de Âncora', 'https://sonicblastfestival.com/', 'https://www.instagram.com/sonicblastfest/', 'Rock / psych / heavy music festival.'),
  source('Vagos Metal Fest', 'Festival', 'Annual', 'Vagos', 'https://vagosmetalfest.com/', 'https://www.instagram.com/vagosmetalfest/', 'Metal festival.'),
  source('Bons Sons', 'Festival', 'Annual', 'Cem Soldos / Tomar', 'https://www.bonssons.com/', 'https://www.instagram.com/bonssonsfestival/', 'Portuguese music festival.'),
  source('Festival Músicas do Mundo', 'Festival', 'Annual', 'Sines', 'https://www.fmm.com.pt/', 'https://www.instagram.com/fmmsines/', 'World-music festival.'),
  source('Festival F', 'Festival', 'Annual', 'Faro', 'https://festivalf.pt/', 'https://www.instagram.com/festivalf/', 'Portuguese music festival.'),
  source('Festival do Crato', 'Festival', 'Annual', 'Crato', 'https://festivaldocrato.pt/', 'https://www.instagram.com/festivaldocrato/', 'Festival-specific announcements.'),
  source('Festival MED', 'Festival', 'Annual', 'Loulé', 'https://festivalmed.pt/', 'https://www.instagram.com/festivalmed/', 'World-music festival.'),
  source('Sol da Caparica', 'Festival', 'Annual', 'Almada', 'https://soldacaparica.pt/', 'https://www.instagram.com/soldacaparica/', 'Portuguese music festival.'),
  source('Afro Nation Portugal', 'Festival', 'Annual', 'Portimão', 'https://www.afronation.com/', 'https://www.instagram.com/afronation/', 'Festival-specific announcements.'),
  source('RFM Somnii', 'Festival', 'Annual', 'Figueira da Foz', 'https://rfmsomnii.com/', 'https://www.instagram.com/rfmsomnii/', 'Electronic / dance festival.'),
  source('MOGA Caparica', 'Festival', 'Annual', 'Costa da Caparica', 'https://mogafestival.com/', 'https://www.instagram.com/mogafestival/', 'Electronic-music festival.'),
  source('EDP Vilar de Mouros', 'Festival', 'Annual', 'Caminha', 'https://vilar-de-mouros.com/', 'https://www.instagram.com/vilardemourosfestival/', 'Festival-specific announcements.'),
  source('Ageas Cooljazz', 'Festival', 'Annual', 'Cascais / Oeiras', 'https://cooljazz.pt/', 'https://www.instagram.com/ageascooljazz/', 'Festival-specific announcements.'),
  source('Jardins do Marquês', 'Festival', 'Annual', 'Oeiras', 'https://jardinsdomarques.pt/', 'https://www.instagram.com/jardinsdomarques/', 'Summer concert festival.'),
  source('Somersby Out Jazz', 'Festival / concert series', 'Seasonal', 'Lisbon / Oeiras', 'https://outjazz.pt/', 'https://www.instagram.com/outjazz/', 'Free outdoor concert series.'),
  source('Jazz em Agosto', 'Festival', 'Annual', 'Lisbon', 'https://gulbenkian.pt/jazzemagosto/', 'https://www.instagram.com/fcgulbenkian/', 'Gulbenkian jazz festival.'),
  source('Cistermúsica', 'Festival', 'Annual', 'Alcobaça', 'https://www.cistermusica.com/', 'https://www.instagram.com/cistermusica/', 'Classical and contemporary music festival.'),
  source('Festival Internacional de Música de Marvão', 'Festival', 'Annual', 'Marvão', 'https://fim-marvao.com/', 'https://www.instagram.com/festivalmarvao/', 'Classical music festival.'),
  source('Festival de Sintra', 'Festival', 'Annual', 'Sintra', 'https://festivaldesintra.pt/', 'https://www.instagram.com/festivaldesintra/', 'Classical and cross-genre programme.'),

  source('MEO Arena', 'Venue calendar', 'Major touring acts', 'Lisbon', 'https://arena.meo.pt/', 'https://www.instagram.com/meoarenaoficial/', 'Venue programme.'),
  source('Coliseu dos Recreios', 'Venue calendar', 'Concerts', 'Lisbon', 'https://coliseulisboa.com/', 'https://www.instagram.com/coliseudosrecreios/', 'Venue programme.'),
  source('Musicbox Lisboa', 'Venue calendar', 'Independent / club', 'Lisbon', 'https://musicboxlisboa.com/', 'https://www.instagram.com/musicboxlisboa/', 'Venue programme.'),
  source('Lux Frágil', 'Venue calendar', 'Club / electronic', 'Lisbon', 'https://www.luxfragil.com/', 'https://www.instagram.com/luxfragil/', 'Venue programme.'),
  source('B.Leza', 'Venue calendar', 'Lusophone music', 'Lisbon', 'https://bleza.pt/', 'https://www.instagram.com/bleza_lisboa/', 'Venue programme.'),
  source('Casa do Capitão', 'Venue calendar', 'Independent / community', 'Lisbon', 'https://casadocapitao.com/', 'https://www.instagram.com/casadocapitao/', 'Venue programme.'),
  source('RCA Club', 'Venue calendar', 'Rock / metal', 'Lisbon', 'https://rcaclub.com/', 'https://www.instagram.com/rcaclub/', 'Venue programme.'),
  source('Village Underground Lisboa', 'Venue calendar', 'Independent / club', 'Lisbon', 'https://villageunderground.co.uk/portugal/', 'https://www.instagram.com/villageundergroundlisboa/', 'Venue programme.'),
  source('Centro Cultural de Belém', 'Venue calendar', 'Culture / concerts', 'Lisbon', 'https://www.ccb.pt/', '', 'Venue programme.'),
  source('Fundação Calouste Gulbenkian', 'Venue calendar', 'Classical / jazz / contemporary', 'Lisbon', 'https://gulbenkian.pt/agenda/', 'https://www.instagram.com/fcgulbenkian/', 'Venue programme.'),
  source('Culturgest', 'Venue calendar', 'Culture / concerts', 'Lisbon', 'https://www.culturgest.pt/', 'https://www.instagram.com/culturgest/', 'Venue programme.'),
  source('Teatro Tivoli BBVA', 'Venue calendar', 'Concerts', 'Lisbon', 'https://www.teatrotivolibbva.pt/', 'https://www.instagram.com/teatrotivolibbva/', 'Venue programme.'),
  source('Teatro Nacional de São Carlos', 'Venue calendar', 'Opera / classical', 'Lisbon', 'https://tnsc.pt/', 'https://www.instagram.com/tnsc_oficial/', 'Venue programme.'),
  source('Aula Magna', 'Venue calendar', 'Concerts', 'Lisbon', 'https://www.ulisboa.pt/aula-magna', '', 'Venue programme / university auditorium.'),
  source('Casa da Música', 'Venue calendar', 'All genres', 'Porto', 'https://www.casadamusica.com/', 'https://www.instagram.com/casadamusica/', 'Venue programme.'),
  source('Super Bock Arena', 'Venue calendar', 'Major touring acts', 'Porto', 'https://www.superbockarena.pt/', 'https://www.instagram.com/superbockarena/', 'Venue programme.'),
  source('Coliseu Porto Ageas', 'Venue calendar', 'Concerts', 'Porto', 'https://www.coliseu.pt/', 'https://www.instagram.com/coliseuportoageas/', 'Venue programme.'),
  source('Hard Club', 'Venue calendar', 'Independent / rock / electronic', 'Porto', 'https://hardclub.pt/', 'https://www.instagram.com/hardclubporto/', 'Venue programme.'),
  source('Maus Hábitos', 'Venue calendar', 'Independent / club', 'Porto', 'https://maushabitos.com/', 'https://www.instagram.com/maushabitos/', 'Venue programme.'),
  source('Plano B', 'Venue calendar', 'Club / electronic', 'Porto', 'https://planob.pt/', 'https://www.instagram.com/planobporto/', 'Venue programme.'),
  source('Theatro Circo', 'Venue calendar', 'Concerts', 'Braga', 'https://www.theatrocirco.com/', 'https://www.instagram.com/theatrocirco/', 'Venue programme.'),
  source('gnration', 'Venue calendar', 'Electronic / experimental', 'Braga', 'https://gnration.pt/', 'https://www.instagram.com/gnration/', 'Venue programme.'),
  source('Centro Cultural Vila Flor', 'Venue calendar', 'Concerts', 'Guimarães', 'https://www.ccvf.pt/', 'https://www.instagram.com/ccvf_guimaraes/', 'Venue programme.'),
  source('Teatro Aveirense', 'Venue calendar', 'Concerts', 'Aveiro', 'https://teatroaveirense.pt/', 'https://www.instagram.com/teatroaveirense/', 'Venue programme.'),
  source('Convento São Francisco', 'Venue calendar', 'Concerts', 'Coimbra', 'https://www.conventosaofrancisco.pt/', 'https://www.instagram.com/conventosaofrancisco/', 'Venue programme.'),
  source('Salão Brazil', 'Venue calendar', 'Jazz / independent', 'Coimbra', 'https://www.salaobrazil.pt/', 'https://www.instagram.com/salaobrazil/', 'Venue programme.'),
  source('Teatro Académico Gil Vicente', 'Venue calendar', 'University / concerts', 'Coimbra', 'https://tagv.pt/', 'https://www.instagram.com/tagv_coimbra/', 'Venue programme.'),
  source('Teatro Viriato', 'Venue calendar', 'Concerts', 'Viseu', 'https://www.teatroviriato.com/', 'https://www.instagram.com/teatroviriato/', 'Venue programme.'),
  source('Teatro Municipal da Guarda', 'Venue calendar', 'Concerts', 'Guarda', 'https://www.tmg.pt/', 'https://www.instagram.com/tmg_guarda/', 'Venue programme.'),
  source('Cine-Teatro Louletano', 'Venue calendar', 'Concerts', 'Loulé', 'https://cineteatrolouletano.pt/', 'https://www.instagram.com/cineteatrolouletano/', 'Venue programme.'),
  source('Teatro Micaelense', 'Venue calendar', 'Concerts', 'Ponta Delgada', 'https://teatromicaelense.pt/', 'https://www.instagram.com/teatromicaelense/', 'Venue programme.'),

  source('MEO', 'Brand / sponsor channel', 'Portugal-wide', 'Portugal', 'https://www.meo.pt/', 'https://www.instagram.com/meo/', 'Track music sponsorships, festival campaigns and subscriber presales.'),
  source('NOS', 'Brand / sponsor channel', 'Portugal-wide', 'Portugal', 'https://www.nos.pt/', 'https://www.instagram.com/nos/', 'Track NOS Alive and related campaigns.'),
  source('Vodafone Portugal', 'Brand / sponsor channel', 'Portugal-wide', 'Portugal', 'https://www.vodafone.pt/', 'https://www.instagram.com/vodafonept/', 'Track music sponsorships, especially Paredes de Coura.'),
  source('Super Bock', 'Brand / sponsor channel', 'Portugal-wide', 'Portugal', 'https://www.superbock.pt/', 'https://www.instagram.com/superbock/', 'Track music sponsorships and venue campaigns.'),
  source('Sagres', 'Brand / sponsor channel', 'Portugal-wide', 'Portugal', 'https://www.sagres.pt/', 'https://www.instagram.com/cervejasagres/', 'Track event partnerships and campaigns.'),
  source('Ageas Portugal', 'Brand / sponsor channel', 'Portugal-wide', 'Portugal', 'https://www.ageas.pt/', 'https://www.instagram.com/ageasportugal/', 'Track Cooljazz and venue sponsorships.'),
  source('Somersby Portugal', 'Brand / sponsor channel', 'Portugal-wide', 'Portugal', 'https://www.somersby.pt/', 'https://www.instagram.com/somersbyportugal/', 'Track Out Jazz and event sponsorships.'),
  source('EDP', 'Brand / sponsor channel', 'Portugal-wide', 'Portugal', 'https://www.edp.pt/', 'https://www.instagram.com/edp/', 'Track festival and cultural sponsorships.'),
  source('Continente', 'Brand / sponsor channel', 'Portugal-wide', 'Portugal', 'https://feed.continente.pt/', 'https://www.instagram.com/continente/', 'Track branded cultural and music campaigns; not a dedicated event calendar.'),
  source('Worten', 'Brand / sponsor channel', 'Portugal-wide', 'Portugal', 'https://www.worten.pt/', 'https://www.instagram.com/wortenpt/', 'Track branded cultural and music campaigns; not a dedicated event calendar.'),
];

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  return lines.slice(1).map((line) => {
    const [district, city, url] = line.split(',');
    return { district, city, url: url?.startsWith('http') ? url : `https://${url}` };
  });
}

const municipalData = parseCsv(await fs.readFile(municipalCsv, 'utf8'));
if (municipalData.length !== 308) throw new Error(`Expected 308 municipalities; found ${municipalData.length}`);

const workbook = Workbook.create();
const readme = workbook.worksheets.add('Read me');
const master = workbook.worksheets.add('Master sources');
const municip = workbook.worksheets.add('Municipal long tail');

readme.showGridLines = false;
master.showGridLines = false;
municip.showGridLines = false;

readme.getRange('A1:G1').merge();
readme.getRange('A1').values = [['Portugal — music-event promotion sources']];
readme.getRange('A3:G3').merge();
readme.getRange('A3').values = [["A research snapshot for finding sites, promoters, ticketing pages, festival channels, venues and the full municipal long tail. Filter the other sheets by category, location or district."]];
readme.getRange('A5:B10').values = [
  ['What is included', 'Count / detail'],
  ['Direct music-promotion sources', '=COUNTA(\'Master sources\'!A7:A200)'],
  ['Municipal long-tail sources', '=COUNTA(\'Municipal long tail\'!A7:A400)'],
  ['Municipality scope', 'All 308 Portuguese municipalities — official council website per row'],
  ['Snapshot date', '2026-08-23'],
  ['Important limit', 'No finite list can capture every one-off Instagram Story, Facebook Event, venue, collective, artist, association, parish or sponsored post. This workbook makes the national and municipal starting universe explicit.'],
];
readme.getRange('A12:G12').merge();
readme.getRange('A12').values = [['How to use the municipal sheet']];
readme.getRange('A13:G15').merge();
readme.getRange('A13').values = [["Each municipality row contains its official website, which is the primary local channel for municipal cultural agendas, festas, festivals and public concerts. The ‘recommended social lookup’ field gives a targeted search phrase for the city council’s Instagram/Facebook event posts. Municipal website data was sourced from the public 308-municipality directory; cross-check time-sensitive event details on each council’s live agenda."]];
readme.getRange('A17:G17').merge();
readme.getRange('A17').values = [['Source notes']];
readme.getRange('A18:G21').merge();
readme.getRange('A18').values = [["Municipality names and official website addresses: public dataset ‘Official Websites of the Portuguese Municipalities’ (based on DGAL; collected 2023), supplemented by the ANMP directory updated January 2026. Core music/event sources were individually researched from their official sites. Instagram links are included as practical follow targets where known; validate before outreach because social handles can change."]];

master.getRange('A1:G1').merge();
master.getRange('A1').values = [['National, promoter, festival, venue and brand sources']];
master.getRange('A3:G3').merge();
master.getRange('A3').values = [["These are organisations and platforms that actively list, market, sell or sponsor music events in Portugal. Use filters to build a focused follow list."]];
master.getRange('A6:G6').values = [['Name', 'Category', 'Coverage', 'Location', 'Website', 'Instagram', 'Notes']];
master.getRangeByIndexes(6, 0, sources.length, 7).values = sources;
master.tables.add(`A6:G${6 + sources.length}`, true, 'MasterSources');

municip.getRange('A1:G1').merge();
municip.getRange('A1').values = [['Complete municipal long tail — all Portuguese municipalities']];
municip.getRange('A3:G3').merge();
municip.getRange('A3').values = [["Every municipality’s official website is included. Their cultural agenda, news page and official social profiles are primary sources for local concerts, festas, festivals and free public programming."]];
municip.getRange('A6:G6').values = [['Municipality', 'District / region', 'Source type', 'Official website', 'Recommended social lookup', 'Primary music-promotion path', 'Source / verification note']];
const municipalRows = municipalData.map(({ district, city, url }) => [
  city,
  district,
  'Municipal cultural / event channel',
  url,
  `Câmara Municipal de ${city} Instagram Facebook agenda cultural`,
  'Website menu: Agenda / Cultura / Eventos / Notícias; then official Instagram and Facebook',
  'Official website directory (DGAL-based 308-municipality dataset; cross-check ANMP live directory)',
]);
municip.getRangeByIndexes(6, 0, municipalRows.length, 7).values = municipalRows;
municip.tables.add(`A6:G${6 + municipalRows.length}`, true, 'MunicipalSources');

const titleFmt = { fill: '#123047', font: { bold: true, color: '#FFFFFF', size: 16 }, horizontalAlignment: 'left', verticalAlignment: 'center' };
const subFmt = { fill: '#E8F1F5', font: { color: '#23485E', italic: true }, wrapText: true, verticalAlignment: 'center' };
const headerFmt = { fill: '#1F6F8B', font: { bold: true, color: '#FFFFFF' }, wrapText: true, verticalAlignment: 'center' };
for (const sheet of [readme, master, municip]) {
  sheet.getRange('A1:G1').format = titleFmt;
  sheet.getRange('A1:G1').format.rowHeight = 28;
  sheet.getRange('A3:G3').format = subFmt;
  sheet.getRange('A3:G3').format.rowHeight = 34;
}
readme.getRange('A5:B5').format = headerFmt;
readme.getRange('A12:G12').format = headerFmt;
readme.getRange('A17:G17').format = headerFmt;
master.getRange('A6:G6').format = headerFmt;
municip.getRange('A6:G6').format = headerFmt;
readme.getRange('A5:B10').format.borders = { preset: 'outside', style: 'thin', color: '#B8C9D3' };
readme.getRange('A13:G15').format.wrapText = true;
readme.getRange('A18:G21').format.wrapText = true;
readme.getRange('B6:B10').format.wrapText = true;
readme.getRange('A10:B10').format.rowHeight = 44;
readme.getRange('A13:G15').format.fill = '#F5F8FA';
readme.getRange('A18:G21').format.fill = '#F5F8FA';

master.getRange(`E7:F${6 + sources.length}`).format.font = { color: '#0563C1', underline: 'single' };
municip.getRange(`D7:D${6 + municipalRows.length}`).format.font = { color: '#0563C1', underline: 'single' };
master.getRange(`A6:G${6 + sources.length}`).format.wrapText = true;
municip.getRange(`A6:G${6 + municipalRows.length}`).format.wrapText = true;

readme.getRange('A1').format.columnWidth = 30;
readme.getRange('B1').format.columnWidth = 75;
for (const col of ['C','D','E','F','G']) readme.getRange(`${col}1`).format.columnWidth = 16;
master.getRange('A:A').format.columnWidth = 26;
master.getRange('B:B').format.columnWidth = 23;
master.getRange('C:C').format.columnWidth = 20;
master.getRange('D:D').format.columnWidth = 19;
master.getRange('E:E').format.columnWidth = 40;
master.getRange('F:F').format.columnWidth = 36;
master.getRange('G:G').format.columnWidth = 48;
municip.getRange('A:A').format.columnWidth = 25;
municip.getRange('B:B').format.columnWidth = 19;
municip.getRange('C:C').format.columnWidth = 28;
municip.getRange('D:D').format.columnWidth = 36;
municip.getRange('E:E').format.columnWidth = 45;
municip.getRange('F:F').format.columnWidth = 52;
municip.getRange('G:G').format.columnWidth = 54;
master.getRange(`A7:G${6 + sources.length}`).format.rowHeight = 32;
municip.getRange(`A7:G${6 + municipalRows.length}`).format.rowHeight = 34;
master.freezePanes.freezeRows(6);
municip.freezePanes.freezeRows(6);
municip.freezePanes.freezeColumns(2);

await fs.mkdir(outDir, { recursive: true });
const check = await workbook.inspect({
  kind: 'table',
  range: 'Master sources!A6:G16',
  include: 'values,formulas',
  tableMaxRows: 11,
  tableMaxCols: 7,
});
const errors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 50 },
  summary: 'final formula error scan',
});
const preview = await workbook.render({ sheetName: 'Read me', range: 'A1:G21', scale: 1.5, format: 'png' });
await fs.writeFile(`${outDir}/preview.png`, new Uint8Array(await preview.arrayBuffer()));
const masterPreview = await workbook.render({ sheetName: 'Master sources', range: 'A1:G20', scale: 1, format: 'png' });
await fs.writeFile(`${outDir}/master_preview.png`, new Uint8Array(await masterPreview.arrayBuffer()));
const municipalPreview = await workbook.render({ sheetName: 'Municipal long tail', range: 'A1:G20', scale: 1, format: 'png' });
await fs.writeFile(`${outDir}/municipal_preview.png`, new Uint8Array(await municipalPreview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outDir}/portugal_music_event_promotion_sources.xlsx`);

console.log(JSON.stringify({ coreSources: sources.length, municipalities: municipalRows.length, check: check.ndjson, formulaErrors: errors.ndjson, output: `${outDir}/portugal_music_event_promotion_sources.xlsx` }));
