import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, "../..");

const c = {
  ink: "#182226",
  inkSoft: "#253135",
  cream: "#f7f5f0",
  gold: "#b7a45a",
  coral: "#e35e44",
  muted: "#bdc5c2",
};

const styles = `<style>
  .display { font-family: Arial, Helvetica, sans-serif; font-weight: 800; letter-spacing: -4px; }
  .strong { font-family: Arial, Helvetica, sans-serif; font-weight: 800; }
  .body { font-family: Arial, Helvetica, sans-serif; font-weight: 500; }
  .mono { font-family: Menlo, Monaco, monospace; font-weight: 700; letter-spacing: 1.8px; }
</style>`;

const image = file => `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;

const weeks = [
  {
    dir: "2026-09-28_2026-10-04",
    prefix: "odesvio-agenda-28set-04out-single",
    range: "28 SET — 4 OUT",
    title: "Esta semana sobe o volume.",
    mascot: "bateria-feliz.png",
    mascotLayout: { x: 798, y: 70, width: 246, height: 290 },
    events: [
      ["28 SET", "Placebo", "Super Bock Arena · Porto"],
      ["28 SET–1 OUT", "Schönbrunn Orchestra", "Teatro Aveirense · Aveiro"],
      ["29 SET", "Placebo", "Campo Pequeno · Lisboa"],
      ["30 SET", "Blood Red Shoes", "República da Música · Lisboa"],
      ["30 SET", "Mario Biondi", "Casa da Música · Porto"],
      ["30 SET", "Carlos Bica", "Auditório Taguspark · Porto Salvo"],
      ["30 SET", "Transvision Vamp", "LAV · Lisboa"],
      ["1 OUT", "Desolated + Soulcrusher", "RCA Club · Lisboa"],
      ["1 OUT", "Mercury Rev", "República da Música · Lisboa"],
      ["1–4 OUT", "OUT.FEST", "Vários espaços · Barreiro"],
      ["1 OUT", "Transvision Vamp", "Hard Club · Porto"],
      ["2 OUT", "Candlelight · Pink Floyd", "Altis Grand Hotel · Lisboa"],
      ["2 OUT", "Fado & Jazz · Uma Só Alma", "C. C. Lagos · Lagos"],
      ["2–4 OUT", "Faro Alternativo", "Passeio Ribeirinho · Faro"],
      ["2–3 OUT", "Festival BIG BANG LX", "CCB · Lisboa"],
      ["2 OUT", "Radiografia #9", "gnration · Braga"],
      ["2 OUT", "RIOT x VUL", "Village Underground · Lisboa"],
      ["3 OUT", "Beleza Abstracta Prog Fest", "Village Underground · Lisboa"],
      ["3 OUT", "MXGPU", "C. C. Paredes · Paredes"],
      ["3 OUT", "Nazareth", "República da Música · Lisboa"],
      ["4 OUT", "Ciclo Mendelssohn", "T. J. Lúcio da Silva · Leiria"],
      ["4 OUT", "Evanescence", "MEO Arena · Lisboa"],
    ],
  },
  {
    dir: "2026-10-05_2026-10-11",
    prefix: "odesvio-agenda-05out-11out-single",
    range: "5 — 11 OUT",
    title: "Sete dias. Nenhum em silêncio.",
    mascot: "carrinha-feliz.png",
    mascotLayout: { x: 782, y: 92, width: 275, height: 245 },
    events: [
      ["7 OUT", "Grant-Lee Phillips", "Casa da Música · Porto"],
      ["8 OUT", "Mike Stern Band", "CCB · Lisboa"],
      ["8 OUT", "Rui Massena", "Teatro das Figuras · Faro"],
      ["9 OUT", "Midori Hirano", "gnration · Braga"],
      ["9 OUT", "Rui Veloso Trio", "Super Bock Arena · Porto"],
      ["9 OUT", "Fatal Move · Outta Spite · NoPath", "Village Underground · Lisboa"],
      ["10 OUT", "Concerto Lounge", "Estação Viana · Viana do Castelo"],
      ["10 OUT", "Dire Straits Legacy", "Campo Pequeno · Lisboa"],
      ["10 OUT", "Fatal Move · Fear The Lord · Lost Grave", "Carpe Diem · Santo Tirso"],
      ["10 OUT", "Os Músicos do Tejo", "C. C. Paredes · Paredes"],
      ["11 OUT", "Ezhel", "LAV · Lisboa"],
      ["11 OUT", "Handel · Les Musiciens du Louvre", "CCB · Lisboa"],
    ],
  },
  {
    dir: "2026-10-12_2026-10-18",
    prefix: "odesvio-agenda-12out-18out-single",
    range: "12 — 18 OUT",
    title: "A semana entra em palco.",
    mascot: "guitarra-feliz.png",
    mascotLayout: { x: 828, y: 56, width: 202, height: 302 },
    events: [
      ["15 OUT", "Simplesmente Roupa Nova", "Campo Pequeno · Lisboa"],
      ["16 OUT", "Alphaville", "Campo Pequeno · Lisboa"],
      ["16–17 OUT", "Black Box Fest", "Trovadores do Cano · Guimarães"],
      ["16 OUT", "Boca Livre + Edu Lobo", "CCB · Lisboa"],
      ["16 OUT", "Margarida Campelo", "CCB · Lisboa"],
      ["16–17 OUT", "Purgatory Fest", "Hollywood Spot · Almada"],
      ["17 OUT", "Em Casa D’Amália", "T. J. Lúcio da Silva · Leiria"],
      ["17 OUT", "For The Glory · Fear The Lord · Sunny Slam", "RCA Club · Lisboa"],
      ["17 OUT", "Joana Sá", "gnration · Braga"],
      ["17 OUT", "Noites de Orfeu", "Museu de Odrinhas · Sintra"],
      ["17 OUT", "Pedro Abrunhosa", "Teatro das Figuras · Faro"],
      ["17 OUT", "Rui Veloso Trio", "Campo Pequeno · Lisboa"],
      ["17 OUT", "Samuel Úria", "Casa das Artes · Famalicão"],
      ["17 OUT", "Susie Filipe & Banda Amizade", "Teatro Aveirense · Aveiro"],
      ["17 OUT", "XXX Trovas", "Theatro Circo · Braga"],
      ["18 OUT", "D’Anto · Fado de Coimbra", "C. C. Paredes · Paredes"],
      ["18 OUT", "Steve n’ Seagulls", "República da Música · Lisboa"],
      ["18 OUT", "Trio Fantasma de Beethoven", "CCB · Lisboa"],
    ],
  },
  {
    dir: "2026-10-19_2026-10-25",
    prefix: "odesvio-agenda-19out-25out-single",
    range: "19 — 25 OUT",
    title: "Há uma frequência para ti.",
    mascot: "amplificador-feliz.png",
    mascotLayout: { x: 800, y: 68, width: 244, height: 286 },
    events: [
      ["21 OUT", "Fontaines D.C. + Chalk", "MEO Arena · Lisboa"],
      ["21 OUT", "Cabrita", "Auditório Taguspark · Porto Salvo"],
      ["22 OUT", "Laura Pausini", "MEO Arena · Lisboa"],
      ["22 OUT", "Myrath", "República da Música · Lisboa"],
      ["22–25 OUT", "Semibreve", "Vários espaços · Braga"],
      ["23 OUT", "a mind in the heart · Joana Gama", "CCB · Lisboa"],
      ["23 OUT", "Suffocation · Ingested · Undeath · Eternal", "Lisbon Stage · Lisboa"],
      ["24 OUT", "Jungle", "MEO Arena · Lisboa"],
      ["24 OUT", "Noite de Tributos", "Pedra Mourinha · Portimão"],
      ["24 OUT", "Pedro Melo Alves · Omniae", "CCB · Lisboa"],
      ["24 OUT", "Rita Redshoes", "Casa da Música · Porto"],
      ["24 OUT", "Titãs", "Campo Pequeno · Lisboa"],
    ],
  },
  {
    dir: "2026-10-26_2026-11-01",
    prefix: "odesvio-agenda-26out-01nov-single",
    range: "26 OUT — 1 NOV",
    title: "Outubro sai com estrondo.",
    mascot: "vinil-feliz.png",
    mascotLayout: { x: 808, y: 72, width: 232, height: 282 },
    events: [
      ["27 OUT", "Anastacia", "Campo Pequeno · Lisboa"],
      ["28 OUT", "Carmen de Bizet", "CCB · Lisboa"],
      ["29–31 OUT", "André Rieu", "MEO Arena · Lisboa"],
      ["30–31 OUT", "Patrimónios de Peso", "Expocoa · Foz Côa"],
      ["30 OUT", "Sul · Há Fado no Cais", "CCB · Lisboa"],
      ["30 OUT", "Travo", "gnration · Braga"],
      ["31 OUT", "Bia Ferreira · Amefrica", "C. C. Paredes · Paredes"],
      ["31 OUT", "Moonspell + NÜN", "Hard Club · Porto"],
      ["31 OUT", "No Candy Tonight", "Pedra Mourinha · Portimão"],
      ["1 NOV", "Ex-Easter Island Head", "gnration · Braga"],
      ["1 NOV", "The Chameleons", "RCA Club · Lisboa"],
    ],
  },
];

function logo() {
  return `<g transform="translate(64 50)">
    <g transform="scale(.42)" fill="none" stroke="${c.gold}" stroke-linecap="round">
      <path d="M93 31a45 45 0 1 0 13 31" stroke-width="7"/><path d="M87 42a33 33 0 1 0 9 23" stroke-width="6"/><path d="M81 52a21 21 0 1 0 6 15" stroke-width="5"/><path d="M94 20v25c0 10-6 15-15 19" stroke-width="10"/>
    </g>
    <circle cx="26.8" cy="28.5" r="5.3" fill="${c.gold}"/><circle cx="26.8" cy="28.5" r="2" fill="${c.coral}"/>
    <text x="62" y="37" fill="${c.cream}" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800" letter-spacing="-1">O DESVIO</text>
  </g>`;
}

const esc = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const fit = (value, max) => value.length > max ? `${value.slice(0, max - 1).trim()}…` : value;

function row([date, title, venue], x, y, width, step) {
  const compact = step < 80;
  const titleWidth = width - 96;
  const titleNeedsFit = title.length > (compact ? 31 : 35);
  return `<g transform="translate(${x} ${y})">
    <text class="mono" x="0" y="18" fill="${c.gold}" font-size="${compact ? 13 : 14}">${esc(date)}</text>
    <text class="strong" x="96" y="18" fill="${c.cream}" font-size="${compact ? 17 : 19}"${titleNeedsFit ? ` textLength="${titleWidth}" lengthAdjust="spacingAndGlyphs"` : ""}>${esc(title)}</text>
    <text class="body" x="96" y="42" fill="${c.muted}" font-size="${compact ? 12 : 14}">${esc(fit(venue, compact ? 38 : 42))}</text>
    <line x1="0" y1="${step - 13}" x2="${width}" y2="${step - 13}" stroke="#596366" opacity=".52"/>
  </g>`;
}

function mascotBlock(week, mascot) {
  const layout = week.mascotLayout;
  return `<image href="${mascot}" x="${layout.x}" y="${layout.y}" width="${layout.width}" height="${layout.height}" preserveAspectRatio="xMidYMid meet"/>`;
}

function render(week) {
  const mascot = image(path.join(root, "brand/mascots-happy", week.mascot));
  const perColumn = Math.ceil(week.events.length / 2);
  const step = Math.min(112, Math.floor(790 / perColumn));
  const columnWidth = 452;
  const rows = week.events.map((event, index) => {
    const column = Math.floor(index / perColumn);
    const line = index % perColumn;
    return row(event, 64 + column * 506, 385 + line * step, columnWidth, step);
  }).join("");
  const titleSize = week.title.length > 28 ? 50 : 56;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
    ${styles}<rect width="1080" height="1350" fill="${c.ink}"/><rect width="1080" height="15" fill="${c.gold}"/>
    ${logo()}
    <text class="mono" x="64" y="165" fill="${c.gold}" font-size="19">AGENDA SEMANAL</text>
    <text class="display" x="64" y="245" fill="${c.cream}" font-size="${titleSize}">${week.title}</text>
    <text class="mono" x="68" y="307" fill="${c.coral}" font-size="21">${week.range} · ${week.events.length} EVENTOS</text>
    ${mascotBlock(week, mascot)}
    <line x1="64" y1="342" x2="1016" y2="342" stroke="${c.gold}" stroke-width="2"/>
    ${rows}
    <rect x="64" y="1162" width="952" height="90" rx="22" fill="${c.inkSoft}" stroke="#465357"/>
    <text class="mono" x="92" y="1217" fill="${c.cream}" font-size="18">GUARDA · PARTILHA · ESCOLHE O TEU DESVIO</text>
    <text class="mono" x="987" y="1217" text-anchor="end" fill="${c.gold}" font-size="19">ODESVIO.PT</text>
  </svg>`;
}

for (const week of weeks) {
  for (const [, title] of week.events) {
    if (/\bconvidad[oa]s?\b/i.test(title)) throw new Error(`A agenda não pode esconder bandas em "${title}".`);
  }
  const out = path.join(here, week.dir);
  fs.mkdirSync(out, { recursive: true });
  const svg = render(week);
  const svgPath = path.join(out, `${week.prefix}.svg`);
  const pngPath = path.join(out, `${week.prefix}.png`);
  fs.writeFileSync(svgPath, svg);
  await sharp(Buffer.from(svg)).png().toFile(pngPath);
}

const thumbs = await Promise.all(weeks.map(async week => ({
  input: await sharp(path.join(here, week.dir, `${week.prefix}.png`)).resize(360, 450).png().toBuffer(),
})));
await sharp({ create: { width: 1080, height: 900, channels: 4, background: c.inkSoft } })
  .composite(thumbs.map((thumb, index) => ({ input: thumb.input, left: (index % 3) * 360, top: Math.floor(index / 3) * 450 })))
  .png().toFile(path.join(here, "weekly-single-contact-sheet.png"));

console.log("Rendered weekly single-post format");
