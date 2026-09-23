import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const here = path.dirname(new URL(import.meta.url).pathname);

const c = {
  ink: "#182226",
  cream: "#f7f5f0",
  gold: "#b7a45a",
  goldDark: "#88752e",
  coral: "#e35e44",
  mutedDark: "#cbd0cd",
  mutedLight: "#596467",
};

const styles = `<style>
  .display { font-family: Arial, Helvetica, sans-serif; font-weight: 800; letter-spacing: -5px; }
  .body { font-family: Arial, Helvetica, sans-serif; font-weight: 500; }
  .strong { font-family: Arial, Helvetica, sans-serif; font-weight: 800; }
  .mono { font-family: Menlo, Monaco, monospace; font-weight: 700; letter-spacing: 2.4px; }
</style>`;

function logo(dark = true) {
  return `<g transform="translate(68 60)">
    <g transform="scale(.44)" fill="none" stroke="${c.gold}" stroke-linecap="round">
      <path d="M93 31a45 45 0 1 0 13 31" stroke-width="7"/><path d="M87 42a33 33 0 1 0 9 23" stroke-width="6"/>
      <path d="M81 52a21 21 0 1 0 6 15" stroke-width="5"/><path d="M94 20v25c0 10-6 15-15 19" stroke-width="10"/>
    </g>
    <circle cx="28" cy="30" r="5.8" fill="${c.gold}"/><circle cx="28" cy="30" r="2.1" fill="${c.coral}"/>
    <text x="66" y="39" fill="${dark ? c.cream : c.ink}" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="800" letter-spacing="-1.2">O DESVIO</text>
  </g>`;
}

function footer(dark, number, total) {
  return `<text class="mono" x="68" y="1280" fill="${dark ? c.cream : c.ink}" font-size="22">ODESVIO.PT</text>
    <text class="mono" x="936" y="1280" text-anchor="end" fill="${dark ? c.gold : c.goldDark}" font-size="19">${String(number).padStart(2, "0")} / ${String(total).padStart(2, "0")}</text>`;
}

const mascotCache = new Map();
function mascot(dir, pose, x, y, width, { flip = false, rotate = 0 } = {}) {
  const key = `${dir}/${pose}`;
  if (!mascotCache.has(key)) {
    mascotCache.set(key, fs.readFileSync(path.join(here, dir, "mascots", `pose-${String(pose).padStart(2, "0")}.png`)).toString("base64"));
  }
  const tx = flip ? x + width : x;
  return `<g transform="translate(${tx} ${y}) scale(${flip ? -1 : 1} 1) rotate(${rotate} ${width / 2} ${width / 2})">
    <image href="data:image/png;base64,${mascotCache.get(key)}" width="${width}" height="${width}" preserveAspectRatio="xMidYMid meet"/>
  </g>`;
}

function textLines(items, { x, y, size, lineHeight, color, cls = "strong", anchor = "start" }) {
  return `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}" fill="${color}" font-size="${size}">${items.map((item, index) => `<tspan x="${x}"${index ? ` dy="${lineHeight}"` : ""}>${item}</tspan>`).join("")}</text>`;
}

function base(background, number, total, body) {
  const dark = background === c.ink;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">${styles}<rect width="1080" height="1350" fill="${background}"/>${logo(dark)}${body}${footer(dark, number, total)}</svg>`;
}

function cover(feature, total) {
  const mascotDir = feature.mascotDir || feature.dir;
  const coverTitle = feature.coverTitle || ["Este fim de", "semana toca aqui."];
  const coverLines = feature.coverLines || [feature.coverNote, "Seis caminhos para sair de casa."];
  return base(c.ink, 1, total, `
    <text class="mono" x="68" y="214" fill="${c.gold}" font-size="22">${feature.dateLabel} · AGENDA DE FIM DE SEMANA</text>
    ${textLines(coverTitle, { x: 68, y: 344, size: 92, lineHeight: 92, color: c.cream, cls: "display" })}
    ${textLines(coverLines, { x: 72, y: 590, size: 30, lineHeight: 44, color: c.mutedDark, cls: "body" })}
    <rect x="68" y="718" width="360" height="62" rx="31" fill="none" stroke="${c.gold}" stroke-width="2"/>
    <text class="mono" x="248" y="758" text-anchor="middle" fill="${c.cream}" font-size="18">GUARDA PARA MAIS TARDE</text>
    ${mascot(mascotDir, 1, 440, 510, 610, { flip: true, rotate: -2 })}`);
}

function eventSlide(feature, event, index, total) {
  const mascotDir = feature.mascotDir || feature.dir;
  const backgrounds = [c.cream, c.gold, c.ink, c.cream, c.coral, c.ink];
  const background = backgrounds[(index - 2) % backgrounds.length];
  const dark = background === c.ink;
  const main = dark ? c.cream : c.ink;
  const muted = dark ? c.mutedDark : c.mutedLight;
  const accent = dark ? c.gold : c.goldDark;
  const pose = ((index - 2) % 5) + 1;
  const right = index % 2 === 0;
  const titleSize = event.titleSize || 70;
  const titleY = event.title.length > 1 ? 334 : 382;
  const mascotX = right ? 520 : 40;
  const textX = right ? 68 : 500;
  const textWidth = right ? 510 : 520;
  return base(background, index, total, `
    <text class="mono" x="${textX}" y="214" fill="${accent}" font-size="21">${event.eyebrow}</text>
    ${textLines(event.title, { x: textX, y: titleY, size: titleSize, lineHeight: titleSize * .98, color: main, cls: "display" })}
    <line x1="${textX}" y1="${event.ruleY || 570}" x2="${textX + textWidth - 46}" y2="${event.ruleY || 570}" stroke="${accent}" stroke-width="2"/>
    ${textLines(event.details, { x: textX, y: event.detailsY || 632, size: event.detailSize || 28, lineHeight: event.detailLineHeight || 44, color: muted, cls: "body" })}
    ${event.promoter ? `<text class="mono" x="${textX}" y="${event.promoterY || 820}" fill="${accent}" font-size="17">${event.promoter}</text>` : ""}
    ${mascot(mascotDir, pose, mascotX, event.mascotY || 610, event.mascotWidth || 520, { flip: !right, rotate: event.rotate || 0 })}`);
}

function closing(feature, total) {
  const mascotDir = feature.mascotDir || feature.dir;
  return base(c.ink, total, total, `
    <text class="mono" x="68" y="214" fill="${c.gold}" font-size="22">HÁ MAIS NA AGENDA</text>
    ${textLines(["Escolhe o teu", "próximo desvio."], { x: 68, y: 350, size: 94, lineHeight: 92, color: c.cream, cls: "display" })}
    ${textLines(["Datas, salas, bilhetes e fontes", "em odesvio.pt"], { x: 72, y: 610, size: 31, lineHeight: 44, color: c.mutedDark, cls: "body" })}
    <rect x="68" y="734" width="430" height="76" rx="38" fill="${c.gold}"/>
    <text class="strong" x="283" y="783" text-anchor="middle" fill="${c.ink}" font-size="25">ABRIR A AGENDA</text>
    ${mascot(mascotDir, 5, 470, 515, 585, { rotate: 3 })}`);
}

const features = [
  {
    dir: "2026-09-22-reign-fury",
    prefix: "odesvio-fim-de-semana-25-27set",
    dateLabel: "25–27 SET",
    coverNote: "De Braga a Lagoa, com paragens bem pesadas.",
    coverLines: ["De Braga a Lagoa.", "Paragens bem pesadas."],
    events: [
      { eyebrow: "26 SET · PÓVOA DE VARZIM", title: ["Boney M."], details: ["Póvoa Arena", "21h30"], promoter: "DISCO · POP", mascotY: 615, rotate: -3 },
      { eyebrow: "25–26 SET · LISBOA", title: ["Under The Doom", "Festival"], titleSize: 68, details: ["LAV — Lisboa ao Vivo", "Portas 18h00"], promoter: "DOOM · METAL · EVENTO DE NOTREDAME", mascotY: 620, rotate: 2 },
      { eyebrow: "26 SET · CORROIOS", title: ["Reign Of Fury", "Fest 2026"], titleSize: 68, details: ["Ginásio Clube de Corroios", "Portas 15h00 · primeira banda 16h00"], promoter: "HARDCORE · DEZ BANDAS", mascotY: 605, rotate: -2 },
      { eyebrow: "26 SET · PORTO", title: ["Paws and", "Claws 9"], details: ["Heaven’s Social Club", "17h00"], promoter: "HARDCORE · EVENTO DE LANÇA CHAMAS", mascotY: 620, rotate: 3 },
      { eyebrow: "26 SET · AVEIRO", title: ["Ganso"], details: ["Teatro Aveirense", "Ciclo Novas Quintas"], promoter: "POP · ROCK", mascotY: 590, rotate: -4 },
      { eyebrow: "27 SET · LAGOA", title: ["Festival de", "Guitarra"], details: ["Centro Cultural Convento de S. José", "17h30"], promoter: "PAOLO DEVECCHI · SALVATORE SEMINARA", mascotY: 630, detailSize: 25, rotate: 2 },
    ],
    caption: `O fim de semana não cabe num só palco. De 25 a 27 de setembro, estes são seis desvios para guardar:\n\n26 SET · Boney M. · Póvoa Arena · Póvoa de Varzim\n25–26 SET · Under The Doom Festival · @lavlisboa · Lisboa · evento de Notredame Productions\n26 SET · Reign Of Fury Fest 2026 · Ginásio Clube de Corroios · Corroios · evento de Reign Fury Events\n26 SET · Paws and Claws 9 · Heaven’s Social Club · Porto · evento de Lança Chamas\n26 SET · Ganso · @teatroaveirense · Aveiro\n27 SET · Festival Internacional de Guitarra de Lagoa · Centro Cultural Convento de S. José · Lagoa\n\nHá muito mais a acontecer na agenda. Guarda o carrossel, envia-o a quem vai contigo e confirma horários e bilhetes na fonte de cada evento em odesvio.pt.\n\nMenos procura. Mais música.\n\n#odesvio #concertosportugal #fimdesemana #musicaaovivo #agendacultural`,
  },
  {
    dir: "2026-09-30-faro-alternativo",
    prefix: "odesvio-fim-de-semana-02-04out",
    dateLabel: "2–4 OUT",
    coverNote: "Faro, Barreiro, Lisboa, Paredes e Viseu.",
    coverLines: ["Faro, Braga, Viseu e Lisboa.", "Seis razões para sair de casa."],
    events: [
      { eyebrow: "2–4 OUT · FARO", title: ["Faro", "Alternativo"], details: ["Passeio Ribeirinho · dois palcos", "Portas 20h30 · concertos 21h00"], promoter: "EVENTO DE @FAROALTERNATIVOFEST", mascotY: 600, rotate: -3 },
      { eyebrow: "2–3 OUT · LISBOA", title: ["BIG BANG", "LX 2026"], details: ["Centro Cultural de Belém", "Programa por espaços"], promoter: "FESTIVAL DE MÚSICA E AVENTURA", mascotY: 610, rotate: -2 },
      { eyebrow: "2 OUT · LAGOS", title: ["Fado &amp; Jazz", "Uma Só Alma"], titleSize: 66, details: ["Centro Cultural de Lagos", "19h00"], promoter: "VÂNIA RODRIGUES · GABRIEL FIALHO", mascotY: 620, rotate: 2 },
      { eyebrow: "2 OUT · BRAGA", title: ["Radiografia #9", "Ana Teresa Pereira"], titleSize: 60, details: ["gnration", "21h30"], promoter: "MÚSICA CONTEMPORÂNEA · BRAGA", mascotY: 590, rotate: 3 },
      { eyebrow: "3 OUT · LISBOA", title: ["Nazareth"], details: ["República da Música", "19h00"], promoter: "ROCK · LISBOA", mascotY: 610, rotate: -3 },
      { eyebrow: "4 OUT · VISEU", title: ["A Voz do Rock", "e Convidadas"], titleSize: 66, details: ["Teatro Viriato", "Hora no programa oficial"], promoter: "ROCK · VISEU", mascotY: 620, rotate: -4 },
    ],
    caption: `Seis caminhos para o fim de semana de 2 a 4 de outubro:\n\n2–4 OUT · Faro Alternativo · Passeio Ribeirinho · Faro · evento de @faroalternativofest\n2–3 OUT · Festival BIG BANG LX · @ccbelem · Lisboa\n2 OUT · Fado & Jazz: Uma Só Alma · Centro Cultural de Lagos · Lagos\n2 OUT · Radiografia #9 · Ana Teresa Pereira · @gnration · Braga\n3 OUT · Nazareth · @republica_da_musica · Lisboa\n4 OUT · A Voz do Rock & Convidadas · @teatro_viriato · Viseu\n\nDo hardcore à música contemporânea, do fado ao rock: guarda o carrossel e confirma os horários e bilhetes na fonte de cada evento em odesvio.pt.\n\nMenos procura. Mais música.\n\n#odesvio #concertosportugal #fimdesemana #faroalternativo #musicaaovivo #agendacultural`,
  },
  {
    dir: "2026-10-07-fatal-move",
    prefix: "odesvio-fim-de-semana-09-11out",
    dateLabel: "9–11 OUT",
    coverNote: "De Braga a Lisboa, com duas paragens de tour.",
    coverLines: ["Duas cidades.", "A mesma tour pelo país."],
    events: [
      { eyebrow: "9–10 OUT · LISBOA + SANTO TIRSO", title: ["Fatal Move", "Portugal tour"], titleSize: 68, details: ["9 OUT · Village Underground · 20h00", "10 OUT · Carpe Diem · 22h00"], promoter: "EVENTOS DE @SPORTSWEAR.BOOKINGS + @BORN_TO_RESIST_EVENTS_BOOKING", promoterY: 846, detailSize: 25, mascotY: 620, rotate: -3 },
      { eyebrow: "9 OUT · PORTO", title: ["Rui Veloso", "Trio"], details: ["Super Bock Arena", "21h00"], promoter: "ROCK · PORTO", mascotY: 620, rotate: 2 },
      { eyebrow: "10 OUT · VIANA DO CASTELO", title: ["Concerto", "Lounge"], details: ["Estação Viana Shopping", "19h00"], promoter: "MÚSICA AO VIVO · ENTRADA LIVRE", mascotY: 610, rotate: -2 },
      { eyebrow: "10 OUT · PAREDES", title: ["Os Músicos", "do Tejo"], details: ["Centro Cultural de Paredes", "21h30"], promoter: "MÚSICA PORTUGUESA · SÉCULOS XVI E XVII", mascotY: 590, rotate: 3 },
      { eyebrow: "11 OUT · LISBOA", title: ["Handel"], details: ["CCB — Grande Auditório", "19h00"], promoter: "LES MUSICIENS DU LOUVRE", mascotY: 620, rotate: -4 },
      { eyebrow: "11 OUT · LISBOA", title: ["Ezhel"], details: ["LAV — Lisboa ao Vivo", "Portas 20h00 · início 21h00"], promoter: "EVENTO DE @PRIMEARTISTS", mascotY: 600, rotate: 2 },
    ],
    caption: `O fim de semana de 9 a 11 de outubro passa por seis caminhos e uma tour com duas paragens nacionais:\n\n9 OUT · @fatalmovehc + @outtaspitehc + @nopathnoise · @villageundergroundlisboa · Lisboa · evento de @sportswear.bookings\n10 OUT · @fatalmovehc + @ftlband + @lostgravehc · @carpediem_sts · Santo Tirso · evento de @born_to_resist_events_booking\n9 OUT · @ruivelosooficial · @superbockarena · Porto\n10 OUT · Concerto Lounge · Estação Viana Shopping · Viana do Castelo\n10 OUT · Os Músicos do Tejo · Centro Cultural de Paredes · evento de @paredes_municipio\n11 OUT · Handel · Les Musiciens du Louvre · @ccbelem · Lisboa\n11 OUT · @ezhel · @lavlisboa · Lisboa · evento de @primeartists\n\nGuarda o carrossel, escolhe a tua rota e confirma horários e bilhetes na fonte de cada evento em odesvio.pt.\n\nMenos procura. Mais música.\n\n#odesvio #concertosportugal #fimdesemana #fatalmove #hardcore #musicaaovivo`,
  },
  {
    dir: "2026-10-14-black-box",
    mascotDir: "2026-09-22-reign-fury",
    prefix: "odesvio-fim-de-semana-16-18out",
    dateLabel: "16–18 OUT",
    coverTitle: ["Duas noites.", "Muitos palcos."],
    coverNote: "Do peso de Guimarães e Almada à canção em Faro.",
    coverLines: ["Peso em Guimarães e Almada.", "Canção de Braga a Faro."],
    events: [
      { eyebrow: "16–17 OUT · GUIMARÃES", title: ["Black Box", "Fest 2026"], details: ["Sede dos Trovadores do Cano", "Programa por dias"], promoter: "EVENTO DE @BLACKBOXFEST", mascotY: 600, rotate: -3 },
      { eyebrow: "16–17 OUT · ALMADA", title: ["Purgatory", "Fest 2026"], details: ["Hollywood Spot · Estrelas do Feijó", "30 € antecipado · 35 € à porta"], promoter: "EVENTO DE @PURGATORYMETALFEST", mascotY: 610, rotate: -2 },
      { eyebrow: "17 OUT · BRAGA", title: ["Joana Sá"], details: ["gnration", "18h00"], promoter: "EXPERIMENTAL · PIANO", mascotY: 620, rotate: 2 },
      { eyebrow: "17 OUT · AVEIRO", title: ["Susie Filipe", "&amp; Banda Amizade"], titleSize: 62, details: ["Teatro Aveirense", "Banda Sinfónica de Aveiro"], promoter: "MÚSICA PORTUGUESA · SINFÓNICA", mascotY: 590, rotate: 3 },
      { eyebrow: "17–18 OUT · FARO", title: ["Pedro", "Abrunhosa"], details: ["Teatro das Figuras", "21h30"], promoter: "EVENTO DE @SONSEMTRANSITO", mascotY: 610, rotate: -3 },
      { eyebrow: "17 OUT · FAMALICÃO", title: ["Samuel Úria", "Cine-concerto"], titleSize: 64, details: ["Casa das Artes", "21h45"], promoter: "INDIE · BANDA SONORA", mascotY: 620, rotate: -4 },
    ],
  },
  {
    dir: "2026-10-21-semibreve",
    mascotDir: "2026-09-30-faro-alternativo",
    prefix: "odesvio-fim-de-semana-23-25out",
    dateLabel: "23–25 OUT",
    coverTitle: ["Escolhe a tua", "frequência."],
    coverNote: "Eletrónica, death metal, piano, pop e jazz.",
    coverLines: ["Eletrónica, death metal,", "piano, pop e jazz."],
    events: [
      { eyebrow: "22–25 OUT · BRAGA", title: ["Semibreve", "2026"], details: ["Vários espaços", "Programa online"], promoter: "ELETRÓNICA · EXPERIMENTAL · AUDIOVISUAL", mascotY: 600, rotate: -3 },
      { eyebrow: "23 OUT · LISBOA", title: ["Suffocation", "+ Ingested"], details: ["Lisbon Stage · Music Station", "c/ Undeath + Eternal"], promoter: "DEATH METAL · METAL", mascotY: 610, rotate: -2 },
      { eyebrow: "23 OUT · LISBOA", title: ["Joana Gama"], details: ["CCB · Luís de Freitas Branco", "20h00"], promoter: "CONTEMPORÂNEA · PIANO", mascotY: 620, rotate: 2 },
      { eyebrow: "24 OUT · PORTO", title: ["Rita", "Redshoes"], details: ["Casa da Música · Sala 2", "21h30"], promoter: "POP · INDIE", mascotY: 590, rotate: 3 },
      { eyebrow: "24 OUT · LISBOA", title: ["Jungle"], details: ["MEO Arena", "20h00"], promoter: "EVENTO DE @EVERYTHINGISNEWPT", mascotY: 610, rotate: -3 },
      { eyebrow: "24 OUT · LISBOA", title: ["Pedro Melo Alves’", "Omniae Ensemble"], titleSize: 58, details: ["CCB · Pequeno Auditório", "19h00"], promoter: "JAZZ · LARGE ENSEMBLE", mascotY: 620, rotate: -4 },
    ],
  },
  {
    dir: "2026-10-28-patrimonios",
    mascotDir: "2026-10-07-fatal-move",
    prefix: "odesvio-fim-de-semana-30out-01nov",
    dateLabel: "30 OUT–1 NOV",
    coverTitle: ["Outubro sai", "com estrondo."],
    coverNote: "Foz Côa, Porto, Braga, Paredes, Viseu e Lisboa.",
    coverLines: ["Foz Côa, Porto e Braga.", "Paredes, Viseu e Lisboa."],
    events: [
      { eyebrow: "30 OUT · BRAGA", title: ["Travo"], details: ["gnration", "21h30"], promoter: "EXPERIMENTAL · ELETRÓNICA", mascotY: 600, rotate: -3 },
      { eyebrow: "30–31 OUT · FOZ CÔA", title: ["Patrimónios", "de Peso"], details: ["Expocoa", "Entrada livre"], promoter: "METAL · ROCK", mascotY: 610, rotate: -2 },
      { eyebrow: "31 OUT · PORTO", title: ["Moonspell", "+ Nu:n"], details: ["Hard Club", "Portas 20h30 · início 21h00"], promoter: "INVICTA HALLOWEEN", mascotY: 620, rotate: 2 },
      { eyebrow: "31 OUT · PAREDES", title: ["Bia Ferreira", "Amefrica"], titleSize: 66, details: ["Centro Cultural de Paredes", "21h30"], promoter: "SOUL · WORLD · MÚSICA BRASILEIRA", mascotY: 590, rotate: 3 },
      { eyebrow: "31 OUT · VISEU", title: ["Lágrimas", "no Mar"], details: ["Teatro Viriato", "Arnaldo Antunes + Vítor Araújo"], promoter: "CANÇÃO DE AUTOR · MÚSICA BRASILEIRA", mascotY: 610, rotate: -3 },
      { eyebrow: "28 OUT–1 NOV · LISBOA", title: ["Carmen", "de Bizet"], titleSize: 70, details: ["CCB · Grande Auditório", "Várias sessões"], promoter: "ÓPERA · CLÁSSICA", mascotY: 620, rotate: -4 },
    ],
  },
];

for (const feature of features) {
  const total = feature.events.length + 2;
  const slides = [cover(feature, total), ...feature.events.map((event, index) => eventSlide(feature, event, index + 2, total)), closing(feature, total)];
  const outDir = path.join(here, feature.dir);
  fs.mkdirSync(outDir, { recursive: true });
  for (const [index, svg] of slides.entries()) {
    const basename = `${feature.prefix}-${String(index + 1).padStart(2, "0")}`;
    fs.writeFileSync(path.join(outDir, `${basename}.svg`), svg);
    await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, `${basename}.png`));
  }
  const thumbs = await Promise.all(slides.map(async (_, index) => ({
    input: await sharp(path.join(outDir, `${feature.prefix}-${String(index + 1).padStart(2, "0")}.png`)).resize(270, 338, { fit: "fill" }).png().toBuffer(),
    left: (index % 4) * 270,
    top: Math.floor(index / 4) * 338,
  })));
  await sharp({ create: { width: 1080, height: Math.ceil(slides.length / 4) * 338, channels: 4, background: c.ink } })
    .composite(thumbs).png().toFile(path.join(outDir, `${feature.prefix}-contact-sheet.png`));
  console.log(`Rendered ${slides.length} slides in ${outDir}`);
}
