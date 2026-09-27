import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, "../..");
const posterRoot = path.join(root, "social/editorial-redesign/posters");

const c = {
  ink: "#182226",
  inkSoft: "#263135",
  cream: "#f7f5f0",
  gold: "#b7a45a",
  coral: "#e35e44",
  muted: "#bdc5c2",
  mutedLight: "#5b676a",
};

const styles = `<style>
  .display { font-family: Arial, Helvetica, sans-serif; font-weight: 800; letter-spacing: -4px; }
  .strong { font-family: Arial, Helvetica, sans-serif; font-weight: 800; }
  .body { font-family: Arial, Helvetica, sans-serif; font-weight: 500; }
  .mono { font-family: Menlo, Monaco, monospace; font-weight: 700; letter-spacing: 1.8px; }
</style>`;

const pngData = async file => `data:image/png;base64,${(await sharp(file).png().toBuffer()).toString("base64")}`;

const posts = [
  {
    dir: "2026-09-22-reign-fury",
    prefix: "odesvio-fim-de-semana-editorial-25-27set",
    dates: "25–27 SET",
    kicker: "LISBOA · CORROIOS · PORTO",
    punchline: ["O fim de semana", "não pede licença."],
    intro: "Doom, hardcore e peso com três cartazes oficiais.",
    mascotDir: path.join(here, "2026-09-22-reign-fury/mascots"),
    mascotPoseOrder: [2, 1, 3, 5, 4],
    mascotFlips: [false, false, false, false, false],
    events: [
      { date: "26 SET · PÓVOA DE VARZIM", title: "Boney M.", venue: "Póvoa Arena · 21h30", promoter: "@BONEYM.OFFICIAL · EVENTO DE SODADE", poster: path.join(posterRoot, "boney-m.jpg") },
      { date: "25–26 SET · LISBOA", title: "Under The Doom Festival", venue: "LAV — Lisboa ao Vivo", promoter: "EVENTO DE @NOTREDAMEPRODUCTIONS.PT", poster: path.join(posterRoot, "under-doom.jpg") },
      { date: "26 SET · CORROIOS", title: "Reign Of Fury Fest", venue: "Ginásio Clube de Corroios", promoter: "EVENTO DE @REIGNFURYFEST", poster: path.join(posterRoot, "reign-fury.png"), posterBackground: "#0c1113" },
      { date: "26 SET · PORTO", title: "Paws and Claws 9", venue: "Heaven’s Social Club · 17h00", promoter: "EVENTO DE @LANCACHAMAS2026", poster: path.join(posterRoot, "paws-claws.webp") },
    ],
    caption: `O fim de semana não pede licença: começa na pista de dança, atravessa o doom e o hardcore e acaba a ajudar uma associação animal.\n\n26 SET · @boneym.official · Póvoa Arena · Póvoa de Varzim · evento de Sodade\n25–26 SET · Under The Doom Festival · @lavlisboaaovivo · Lisboa · evento de @notredameproductions.pt\n26 SET · @reignfuryfest · Ginásio Clube de Corroios · Corroios\n26 SET · Nightzero + Bisarma + Ashes in the Ocean · Heaven’s Social Club · Porto · evento de @lancachamas2026\n\nDesliza para veres os cartazes oficiais, guarda o post e confirma horários, bilhetes e fontes em odesvio.pt.\n\nMenos procura. Mais música.\n\n#odesvio #concertosportugal #fimdesemana #disco #hardcore #metal #musicaaovivo`,
  },
  {
    dir: "2026-09-30-faro-alternativo",
    prefix: "odesvio-fim-de-semana-editorial-02-04out",
    dates: "2–4 OUT",
    kicker: "FARO · LISBOA",
    punchline: ["O sul também sabe", "fazer barulho."],
    intro: "Festival, hard rock e uma arena em modo gótico.",
    mascotDir: path.join(here, "2026-09-30-faro-alternativo/mascots"),
    mascotPoseOrder: [2, 3, 4, 5, 1],
    mascotFlips: [false, false, false, false, false],
    events: [
      { date: "2–4 OUT · FARO", title: "Faro Alternativo", venue: "Passeio Ribeirinho · portas 20h30", promoter: "EVENTO DE @FAROALTERNATIVO", poster: path.join(posterRoot, "faro-alternativo.jpg") },
      { date: "2–3 OUT · LISBOA", title: "Festival BIG BANG LX", venue: "CCB · vários espaços", promoter: "@CCBELEM · FAMÍLIAS · EXPERIMENTAL", poster: path.join(posterRoot, "big-bang.png") },
      { date: "3 OUT · LISBOA", title: "Nazareth", venue: "República da Música · 19h00", promoter: "@REPUBLICA_DA_MUSICA", poster: path.join(posterRoot, "nazareth.png") },
      { date: "4 OUT · LISBOA", title: "Evanescence", venue: "MEO Arena · 20h00", promoter: "EVENTO DE @MUSICANOCORACAOOFICIAL", poster: path.join(posterRoot, "evanescence.png") },
    ],
    caption: `O sul também sabe fazer barulho. Faro abre três noites de guitarras e Lisboa responde com aventura musical, hard rock e uma arena em modo gótico.\n\n2–4 OUT · Faro Alternativo · Passeio Ribeirinho · Faro · evento de @faroalternativo\n2–3 OUT · Festival BIG BANG LX · @ccbelem · Lisboa\n3 OUT · @nazarethband · @republica_da_musica · Lisboa\n4 OUT · @evanescence + @impoppy + @novatwinsmusic · @meoarenaoficial · Lisboa · evento de @musicanocoracaooficial\n\nDesliza para veres os cartazes oficiais, guarda o post e confirma horários, bilhetes e fontes em odesvio.pt.\n\nMenos procura. Mais música.\n\n#odesvio #concertosportugal #fimdesemana #faroalternativo #rock #musicaaovivo`,
  },
  {
    dir: "2026-10-07-fatal-move",
    prefix: "odesvio-fim-de-semana-editorial-09-11out",
    dates: "9–11 OUT",
    kicker: "PORTO · SANTO TIRSO · LISBOA",
    punchline: ["Duas cidades.", "O mesmo breakdown."],
    intro: "A carrinha passa pelo rock, hardcore e hip-hop.",
    mascotDir: path.join(here, "2026-10-07-fatal-move/mascots"),
    mascotPoseOrder: [1, 3, 4, 2, 5],
    mascotFlips: [false, false, false, true, false],
    events: [
      {
        date: "9–10 OUT · LISBOA + SANTO TIRSO",
        title: "Fatal Move · Portugal tour",
        venue: "Duas datas · dois alinhamentos completos",
        promoter: "EVENTOS DE @SPORTSWEAR.BOOKINGS · @BORN_TO_RESIST_EVENTS_BOOKING",
        poster: path.join(root, "brand/event-posters/fatal-move-santo-tirso-2026.webp"),
        tourPosters: [
          { label: "LISBOA · 9 OUT", file: path.join(root, "brand/event-posters/fatal-move-lisboa-2026.jpg") },
          { label: "SANTO TIRSO · 10 OUT", file: path.join(root, "brand/event-posters/fatal-move-santo-tirso-2026.webp") },
        ],
        tourDates: [
          { date: "9 OUT · LISBOA", lineup: "Fatal Move · Outta Spite · NoPath", venue: "Village Underground · 20h00" },
          { date: "10 OUT · SANTO TIRSO", lineup: "Fatal Move · Fear The Lord · Lost Grave", venue: "Carpe Diem · 22h00" },
        ],
      },
      { date: "9 OUT · PORTO", title: "Rui Veloso Trio", venue: "Super Bock Arena · 21h00", promoter: "@RUIVELOSOOFICIAL · @SUPERBOCKARENA", poster: path.join(posterRoot, "rui-veloso.jpg") },
      { date: "11 OUT · LISBOA", title: "Handel", venue: "CCB · Grande Auditório · 19h00", promoter: "LES MUSICIENS DU LOUVRE · @CCBELEM", poster: path.join(posterRoot, "handel.jpg") },
      { date: "11 OUT · LISBOA", title: "Ezhel", venue: "LAV — Lisboa ao Vivo · 21h00", promoter: "EVENTO DE @PRIMEARTISTSPT", poster: path.join(posterRoot, "ezhel.jpg") },
    ],
    caption: `Duas cidades, o mesmo breakdown — e uma carrinha que ainda encontra espaço para guitarras portuguesas, Handel e hip-hop de Istambul.\n\n9 OUT · @fatalmovehc + @outtaspitehc + @nopathnoise · @villageundergroundlisboa · Lisboa · evento de @sportswear.bookings\n10 OUT · @fatalmovehc + @ftlband + @lostgravehc · @carpediem_sts · Santo Tirso · evento de @born_to_resist_events_booking\n9 OUT · @ruivelosooficial · @superbockarena · Porto\n11 OUT · Handel · Les Musiciens du Louvre · @ccbelem · Lisboa\n11 OUT · @ezhel · @lavlisboaaovivo · Lisboa · evento de @primeartistspt\n\nDesliza para veres os cartazes oficiais, guarda o post e confirma horários, bilhetes e fontes em odesvio.pt.\n\nMenos procura. Mais música.\n\n#odesvio #concertosportugal #fimdesemana #fatalmove #classica #hiphop #musicaaovivo`,
  },
  {
    dir: "2026-10-14-black-box",
    prefix: "odesvio-fim-de-semana-editorial-16-18out",
    dates: "16–18 OUT",
    kicker: "GUIMARÃES · LISBOA · ALMADA",
    punchline: ["O fim de semana", "entra no pit."],
    intro: "Dois festivais e um regresso que pede coro.",
    mascotDir: path.join(root, "social/weekly-mascots/guitar"),
    mascotPoseOrder: [1, 4, 3, 5, 2],
    mascotFlips: [false, false, false, false, false],
    events: [
      { date: "17–18 OUT · FARO", title: "Pedro Abrunhosa", venue: "Teatro das Figuras", promoter: "TOUR INVERBO · POP · ROCK", poster: path.join(posterRoot, "pedro-abrunhosa.jpg") },
      { date: "17 OUT · LISBOA", title: "For The Glory · Fear The Lord · Sunny Slam", titleLines: ["For The Glory · Fear The Lord", "Sunny Slam"], venue: "República da Música · 20h00", promoter: "EVENTO DE @HELLXIS", poster: path.join(root, "social/giveaway/2026-10-for-the-glory/for-the-glory-official-poster.jpg") },
      { date: "16–17 OUT · GUIMARÃES", title: "Black Box Fest 2026", venue: "Sede dos Trovadores do Cano", promoter: "EVENTO DE @BLACKBOXFEST", poster: path.join(root, "social/editorial-redesign/black-box-instagram.jpg") },
      { date: "16–17 OUT · ALMADA", title: "Purgatory Fest 2026", venue: "Hollywood Spot · Feijó", promoter: "EVENTO DE @PURGATORYMETALFEST", poster: path.join(root, "social/editorial-redesign/purgatory-official.webp") },
    ],
    caption: `O fim de semana entra no pit, mas primeiro passa pelo Algarve: pop português, dois festivais pesados e um regresso para cantar em coro.\n\n17–18 OUT · @pedroabrunhosa · @teatrodasfiguras · Faro · evento de @sonsemtransito\n16–17 OUT · Black Box Fest 2026 · Sede dos Trovadores do Cano · Guimarães · evento de @blackboxfest\n16–17 OUT · Purgatory Fest 2026 · Hollywood Spot · Feijó, Almada · evento de @purgatorymetalfest\n17 OUT · @forthegloryhc + @ftlband + @sunny_slam · @republica_da_musica · Lisboa · evento de @hellxis\n\nDesliza para veres os cartazes oficiais, guarda o post e confirma horários, bilhetes e fontes em odesvio.pt.\n\nMenos procura. Mais música.\n\n#odesvio #concertosportugal #fimdesemana #hardcore #metal #musicaportuguesa #musicaaovivo`,
  },
  {
    dir: "2026-10-21-semibreve",
    prefix: "odesvio-fim-de-semana-editorial-23-25out",
    dates: "23–25 OUT",
    kicker: "BRAGA · LISBOA",
    punchline: ["Escolhe a tua", "frequência."],
    intro: "Eletrónica, death metal e soul no mesmo botão.",
    mascotDir: path.join(root, "social/weekly-mascots/vinyl"),
    mascotPoseOrder: [1, 4, 5, 2, 3],
    mascotFlips: [false, false, false, false, false],
    events: [
      { date: "22–25 OUT · BRAGA", title: "Semibreve 2026", venue: "Vários espaços", promoter: "PROGRAMA EM @SEMIBREVE", poster: path.join(posterRoot, "semibreve-official-site.png") },
      { date: "23 OUT · LISBOA", title: "Suffocation · Ingested · Undeath · Eternal", titleLines: ["Suffocation · Ingested", "Undeath · Eternal"], venue: "Lisbon Stage · Music Station", promoter: "SUFFOCATION · INGESTED · UNDEATH · ETERNAL", poster: path.join(posterRoot, "suffocation.jpg") },
      { date: "24 OUT · PORTO", title: "Rita Redshoes", venue: "Casa da Música · Sala 2 · 21h30", promoter: "@RITAREDSHOES · @CASADAMUSICAPORTO", poster: path.join(posterRoot, "rita-redshoes.jpg") },
      { date: "24 OUT · LISBOA", title: "Jungle", venue: "MEO Arena · 20h00", promoter: "EVENTO DE @EVERYTHINGISNEWPT", poster: path.join(posterRoot, "jungle.jpg") },
    ],
    caption: `Escolhe a tua frequência: Braga desmonta o som, o Lisbon Stage leva-o ao limite, o Porto puxa pela canção e a MEO Arena transforma-se numa pista.\n\n22–25 OUT · Semibreve 2026 · vários espaços · Braga · programa em @semibreve\n23 OUT · @suffocationofficial + @ingested + @undeathny + @eternalbandaz · Lisbon Stage · Lisboa\n24 OUT · @ritaredshoes · @casadamusicaporto · Porto\n24 OUT · @jungle4eva · @meoarenaoficial · Lisboa · evento de @everythingisnewpt\n\nDesliza para veres os cartazes oficiais, guarda o post e confirma horários, bilhetes e fontes em odesvio.pt.\n\nMenos procura. Mais música.\n\n#odesvio #concertosportugal #fimdesemana #semibreve #deathmetal #indie #soul #musicaaovivo`,
  },
  {
    dir: "2026-10-28-patrimonios",
    prefix: "odesvio-fim-de-semana-editorial-30out-01nov",
    dates: "30 OUT — 1 NOV",
    kicker: "FOZ CÔA · PORTO · PORTIMÃO",
    punchline: ["Outubro sai", "com estrondo."],
    intro: "Património, Halloween e entrada livre no Algarve.",
    mascotDir: path.join(here, "2026-09-22-reign-fury/mascots"),
    mascotPoseOrder: [2, 1, 3, 5, 4],
    mascotFlips: [false, false, false, false, false],
    events: [
      { date: "31 OUT · PAREDES", title: "Bia Ferreira · Amefrica", venue: "Centro Cultural de Paredes · 21h30", promoter: "@FERREIRABIAOFICIAL · SOUL · WORLD", posterLabel: "IMAGEM OFICIAL", poster: path.join(posterRoot, "bia-ferreira.jpg") },
      { date: "30–31 OUT · FOZ CÔA", title: "Patrimónios de Peso", venue: "Expocoa · entrada livre", promoter: "@PATRIMONIOS_DE_PESO", poster: path.join(posterRoot, "patrimonios.jpg") },
      { date: "31 OUT · PORTO", title: "Moonspell + NÜN", venue: "Hard Club · 21h00 · esgotado", promoter: "EVENTO DE @FREEMUSICEVENTS", poster: path.join(posterRoot, "moonspell.jpg") },
      { date: "31 OUT · PORTIMÃO", title: "No Candy Tonight", venue: "Clube da Pedra Mourinha · 21h30", promoter: "EVENTO DE @ASSOCIACAOMARGINALIA", poster: path.join(root, "brand/event-posters/no-candy-tonight-2026.jpg") },
    ],
    caption: `Outubro sai com estrondo: soul e resistência em Paredes, património e peso em Foz Côa, ritual no Porto e Halloween junto ao mar.\n\n31 OUT · @ferreirabiaoficial · @ccp_paredes · Paredes · evento de @ferreirabiaoficial\n30–31 OUT · @patrimonios_de_peso · Expocoa · Vila Nova de Foz Côa · evento de @patrimonios_de_peso\n31 OUT · @moonspellofficial + NÜN · @hardclubporto · Porto · esgotado · evento de @freemusicevents\n31 OUT · @rampoficial + @inhuman.band + @cicatrizband + @shadowmare_official · Clube da Pedra Mourinha · Portimão · entrada livre · evento de @associacaomarginalia\n\nDesliza para veres os cartazes oficiais, guarda o post e confirma horários, bilhetes e fontes em odesvio.pt.\n\nMenos procura. Mais música.\n\n#odesvio #concertosportugal #fimdesemana #soul #moonspell #metal #musicaaovivo`,
  },
];

function logo(dark) {
  return `<g transform="translate(64 50)"><g transform="scale(.42)" fill="none" stroke="${c.gold}" stroke-linecap="round"><path d="M93 31a45 45 0 1 0 13 31" stroke-width="7"/><path d="M87 42a33 33 0 1 0 9 23" stroke-width="6"/><path d="M81 52a21 21 0 1 0 6 15" stroke-width="5"/><path d="M94 20v25c0 10-6 15-15 19" stroke-width="10"/></g><circle cx="26.8" cy="28.5" r="5.3" fill="${c.gold}"/><circle cx="26.8" cy="28.5" r="2" fill="${c.coral}"/><text x="62" y="37" fill="${dark ? c.cream : c.ink}" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800" letter-spacing="-1">O DESVIO</text></g>`;
}

function base(background, body, index) {
  const dark = background === c.ink;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">${styles}<rect width="1080" height="1350" fill="${background}"/><rect width="1080" height="15" fill="${index === 1 ? c.gold : c.coral}"/>${logo(dark)}${body}<text class="mono" x="64" y="1300" fill="${dark ? c.cream : c.ink}" font-size="18">ODESVIO.PT</text><text class="mono" x="1016" y="1300" text-anchor="end" fill="${c.gold}" font-size="18">${String(index).padStart(2, "0")} / 05</text></svg>`;
}

function mascotImage(mascot, x, y, width, height, flip = false) {
  if (!flip) return `<image href="${mascot}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/>`;
  return `<g transform="translate(${x + width} 0) scale(-1 1)"><image href="${mascot}" x="0" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/></g>`;
}

function cover(post, mascots) {
  return base(c.ink, `<text class="mono" x="64" y="188" fill="${c.gold}" font-size="20">${post.dates} · FIM DE SEMANA</text><text class="display" x="64" y="310" fill="${c.cream}" font-size="92"><tspan x="64">${post.punchline[0]}</tspan><tspan x="64" dy="94">${post.punchline[1]}</tspan></text><text class="body" x="68" y="555" fill="${c.muted}" font-size="28">${post.intro}</text><line x1="64" y1="650" x2="1016" y2="650" stroke="${c.gold}" stroke-width="2"/><text class="mono" x="64" y="702" fill="${c.coral}" font-size="18">${post.kicker}</text>${mascotImage(mascots[0], 165, 695, 760, 500, post.mascotFlips[0])}`, 1);
}

function containPoster(event, x, y, width, height) {
  const scale = Math.min(width / event.posterWidth, height / event.posterHeight);
  const posterWidth = event.posterWidth * scale;
  const posterHeight = event.posterHeight * scale;
  return {
    x: x + (width - posterWidth) / 2,
    y: y + (height - posterHeight) / 2,
    width: posterWidth,
    height: posterHeight,
  };
}

function titleBlock(event, color) {
  const lines = event.titleLines || [event.title];
  const size = event.titleSize || (lines.length > 1 ? 43 : 56);
  const lineHeight = Math.round(size * 1.04);
  return `<text class="display" x="64" y="${lines.length > 1 ? 244 : 255}" fill="${color}" font-size="${size}">${lines.map((line, index) => `<tspan x="64"${index ? ` dy="${lineHeight}"` : ""}>${line}</tspan>`).join("")}</text>`;
}

function tourDetails(event) {
  const columns = event.tourDates.map((tourDate, index) => {
    const x = index === 0 ? 94 : 555;
    return `<g transform="translate(${x} 0)">
      <text class="mono" x="0" y="1014" fill="${c.gold}" font-size="14">${tourDate.date}</text>
      <text class="strong" x="0" y="1057" fill="${c.cream}" font-size="21">${tourDate.lineup}</text>
      <text class="body" x="0" y="1095" fill="${c.muted}" font-size="18">${tourDate.venue}</text>
    </g>`;
  }).join("");
  return `<rect x="64" y="965" width="952" height="255" rx="26" fill="${c.ink}" stroke="#465458"/>
    <text class="strong" x="94" y="1000" fill="${c.cream}" font-size="25">FATAL MOVE · PORTUGAL TOUR</text>
    ${columns}
    <line x1="535" y1="1015" x2="535" y2="1110" stroke="#596366"/>
    <text class="mono" x="94" y="1184" fill="${c.gold}" font-size="13">${event.promoter}</text>`;
}

function standardDetails(event, dark) {
  const lines = event.titleLines || [event.title];
  const titleSize = lines.length > 1 ? 26 : 35;
  const firstY = lines.length > 1 ? 1054 : 1067;
  const title = `<text class="strong" x="94" y="${firstY}" fill="${c.cream}" font-size="${titleSize}">${lines.map((line, index) => `<tspan x="94"${index ? ' dy="31"' : ""}>${line}</tspan>`).join("")}</text>`;
  const venueY = lines.length > 1 ? 1137 : 1116;
  return `<rect x="64" y="1010" width="952" height="196" rx="26" fill="${dark ? c.inkSoft : c.ink}" ${dark ? 'stroke="#465458"' : ""}/>${title}<text class="body" x="94" y="${venueY}" fill="${c.muted}" font-size="24">${event.venue}</text><text class="mono" x="94" y="1182" fill="${c.gold}" font-size="16">${event.promoter}</text>`;
}

function tourPosterDiptych(event, mascot, flip) {
  const [lisbon, santoTirso] = event.tourPosters;
  return `<g>
    <rect x="84" y="330" width="400" height="500" rx="20" fill="${c.ink}"/>
    <image href="${lisbon.data}" x="84" y="330" width="400" height="500" preserveAspectRatio="xMidYMid meet"/>
    <rect x="596" y="330" width="400" height="500" rx="20" fill="#0c1113"/>
    <image href="${santoTirso.data}" x="596" y="330" width="400" height="500" preserveAspectRatio="xMidYMid meet"/>
    <rect x="104" y="300" width="214" height="45" rx="22" fill="${c.coral}"/>
    <text class="mono" x="211" y="329" text-anchor="middle" fill="${c.cream}" font-size="14">${lisbon.label}</text>
    <rect x="740" y="300" width="256" height="45" rx="22" fill="${c.coral}"/>
    <text class="mono" x="868" y="329" text-anchor="middle" fill="${c.cream}" font-size="14">${santoTirso.label}</text>
    ${mascotImage(mascot, 440, 820, 200, 138, flip)}
  </g>`;
}

function eventSlide(post, event, mascots, index) {
  const dark = index % 2 === 1;
  const bg = dark ? c.ink : c.cream;
  const main = dark ? c.cream : c.ink;
  const muted = dark ? c.muted : c.mutedLight;
  const poster = event.posterData;
  const posterLeft = index % 2 === 0;
  const frameX = posterLeft ? 64 : 510;
  const frameW = posterLeft ? 650 : 506;
  const multiLineTitle = Boolean(event.titleLines?.length > 1);
  const posterY = multiLineTitle ? 340 : 310;
  const posterHeight = event.tourDates ? 625 : multiLineTitle ? 620 : 650;
  const posterBox = containPoster(event, frameX, posterY, frameW, posterHeight);
  const mascotX = posterLeft ? 710 : 12;
  const mascotW = posterLeft ? 370 : 470;
  const mascotY = index % 3 === 0 ? 505 : 535;
  const mascot = mascots[index - 1];
  const labelX = Math.max(64, posterBox.x + posterBox.width - 224);
  const labelY = Math.max(267, posterBox.y - 43);
  const posterBackground = event.posterBackground ? `<rect x="${posterBox.x}" y="${posterBox.y}" width="${posterBox.width}" height="${posterBox.height}" fill="${event.posterBackground}"/>` : "";
  const details = event.tourDates ? tourDetails(event) : standardDetails(event, dark);
  const artwork = event.tourPosters
    ? tourPosterDiptych(event, mascot, post.mascotFlips[index - 1])
    : `${posterBackground}<image href="${poster}" x="${posterBox.x}" y="${posterBox.y}" width="${posterBox.width}" height="${posterBox.height}" preserveAspectRatio="xMidYMid meet"/><rect x="${labelX}" y="${labelY}" width="224" height="45" rx="22" fill="${c.coral}"/><text class="mono" x="${labelX + 112}" y="${labelY + 28}" text-anchor="middle" fill="${c.cream}" font-size="15">${event.posterLabel || "CARTAZ OFICIAL"}</text>${mascotImage(mascot, mascotX, mascotY, mascotW, 420, post.mascotFlips[index - 1])}`;
  return base(bg, `<text class="mono" x="64" y="183" fill="${c.gold}" font-size="19">${event.date}</text>${titleBlock(event, main)}${artwork}${details}`, index);
}

for (const post of posts) {
  const out = path.join(here, post.dir);
  fs.mkdirSync(out, { recursive: true });
  const mascotPoses = await Promise.all(Array.from({ length: 5 }, (_, index) => pngData(path.join(post.mascotDir, `pose-${String(index + 1).padStart(2, "0")}.png`))));
  const mascots = post.mascotPoseOrder.map(pose => mascotPoses[pose - 1]);
  for (const event of post.events) {
    if (/\bconvidad[oa]s?\b/i.test(event.title)) {
      throw new Error(`O evento "${event.title}" esconde bandas sob \"convidados\".`);
    }
    const metadata = await sharp(event.poster).metadata();
    event.posterData = await pngData(event.poster);
    event.posterWidth = metadata.width || 1;
    event.posterHeight = metadata.height || 1;
    if (event.tourPosters) {
      for (const poster of event.tourPosters) poster.data = await pngData(poster.file);
    }
  }
  const slides = [cover(post, mascots), ...post.events.map((event, index) => eventSlide(post, event, mascots, index + 2))];
  for (const [index, slide] of slides.entries()) {
    const baseName = `${post.prefix}-${String(index + 1).padStart(2, "0")}`;
    fs.writeFileSync(path.join(out, `${baseName}.svg`), slide);
    await sharp(Buffer.from(slide)).png().toFile(path.join(out, `${baseName}.png`));
  }
  const thumbs = await Promise.all(slides.map(async (_, index) => ({ input: await sharp(path.join(out, `${post.prefix}-${String(index + 1).padStart(2, "0")}.png`)).resize(360, 450).png().toBuffer(), left: (index % 3) * 360, top: Math.floor(index / 3) * 450 })));
  await sharp({ create: { width: 1080, height: 900, channels: 4, background: c.inkSoft } }).composite(thumbs).png().toFile(path.join(out, `${post.prefix}-contact-sheet.png`));
  fs.writeFileSync(path.join(out, "caption-new.txt"), post.caption);
}

const coverThumbs = await Promise.all(posts.map(async post => ({ input: await sharp(path.join(here, post.dir, `${post.prefix}-01.png`)).resize(360, 450).png().toBuffer() })));
await sharp({ create: { width: 1080, height: 900, channels: 4, background: c.inkSoft } }).composite(coverThumbs.map((thumb, index) => ({ input: thumb.input, left: (index % 3) * 360, top: Math.floor(index / 3) * 450 }))).png().toFile(path.join(here, "weekend-editorial-covers.png"));

console.log("Rendered weekend editorial carousels");
