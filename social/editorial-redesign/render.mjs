import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, "../..");

const colours = {
  ink: "#182226",
  inkSoft: "#243034",
  cream: "#f7f5f0",
  gold: "#b7a45a",
  coral: "#e35e44",
  muted: "#bfc7c4",
};

const styles = `<style>
  .display { font-family: Arial, Helvetica, sans-serif; font-weight: 800; letter-spacing: -4px; }
  .body { font-family: Arial, Helvetica, sans-serif; font-weight: 500; }
  .strong { font-family: Arial, Helvetica, sans-serif; font-weight: 800; }
  .mono { font-family: Menlo, Monaco, monospace; font-weight: 700; letter-spacing: 1.8px; }
</style>`;

const toDataUri = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
const drum = toDataUri(path.join(root, "brand/mascots-happy/bateria-feliz.png"), "image/png");
const guitar = toDataUri(path.join(root, "social/weekly-mascots/editorial/fatal-move-outta-spite-nopath.png"), "image/png");
const fatalMovePoster = `data:image/png;base64,${(
  await sharp(path.join(root, "brand/event-posters/fatal-move-santo-tirso-2026.webp")).png().toBuffer()
).toString("base64")}`;

function logo(x = 64, y = 52, scale = 0.42) {
  return `<g transform="translate(${x} ${y})">
    <g transform="scale(${scale})" fill="none" stroke="${colours.gold}" stroke-linecap="round">
      <path d="M93 31a45 45 0 1 0 13 31" stroke-width="7"/>
      <path d="M87 42a33 33 0 1 0 9 23" stroke-width="6"/>
      <path d="M81 52a21 21 0 1 0 6 15" stroke-width="5"/>
      <path d="M94 20v25c0 10-6 15-15 19" stroke-width="10"/>
    </g>
    <circle cx="26.8" cy="28.5" r="5.3" fill="${colours.gold}"/>
    <circle cx="26.8" cy="28.5" r="2" fill="${colours.coral}"/>
    <text x="62" y="37" fill="${colours.cream}" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800" letter-spacing="-1">O DESVIO</text>
  </g>`;
}

const events = [
  ["28 SET", "Placebo", "Super Bock Arena · Porto"],
  ["29 SET", "Placebo", "Sagres Campo Pequeno · Lisboa"],
  ["30 SET", "Blood Red Shoes", "República da Música · Lisboa"],
  ["30 SET", "Mario Biondi", "Casa da Música · Porto"],
  ["30 SET", "Carlos Bica", "Auditório Taguspark · Porto Salvo"],
  ["1–4 OUT", "OUT.FEST", "Vários espaços · Barreiro"],
  ["2–4 OUT", "Faro Alternativo", "Passeio Ribeirinho · Faro"],
  ["2–3 OUT", "BIG BANG LX", "Centro Cultural de Belém · Lisboa"],
  ["2 OUT", "Fado &amp; Jazz", "Centro Cultural de Lagos · Lagos"],
  ["2 OUT", "Radiografia #9", "gnration · Braga"],
  ["3 OUT", "MXGPU", "Centro Cultural de Paredes · Paredes"],
  ["4 OUT", "Evanescence", "MEO Arena · Lisboa"],
];

function eventRow(item, x, y, width) {
  const [date, title, place] = item;
  return `<g transform="translate(${x} ${y})">
    <rect width="112" height="48" rx="9" fill="${colours.gold}"/>
    <text class="mono" x="56" y="31" text-anchor="middle" fill="${colours.ink}" font-size="17">${date}</text>
    <text class="strong" x="132" y="21" fill="${colours.cream}" font-size="24">${title}</text>
    <text class="body" x="132" y="49" fill="${colours.muted}" font-size="17">${place}</text>
    <line x1="0" y1="76" x2="${width}" y2="76" stroke="#596366" stroke-width="1" opacity=".55"/>
  </g>`;
}

function weeklySvg() {
  const rows = events.map((item, index) => {
    const column = index < 6 ? 0 : 1;
    const row = index % 6;
    return eventRow(item, 64 + column * 506, 410 + row * 128, 454);
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
    ${styles}
    <rect width="1080" height="1350" fill="${colours.ink}"/>
    <path d="M0 0h1080v15H0z" fill="${colours.gold}"/>
    ${logo()}
    <text class="mono" x="64" y="190" fill="${colours.gold}" font-size="20">AGENDA SEMANAL</text>
    <text class="display" x="64" y="286" fill="${colours.cream}" font-size="78">A semana toda.</text>
    <text class="mono" x="68" y="342" fill="${colours.coral}" font-size="23">28 SET — 4 OUT</text>
    <image href="${drum}" x="785" y="70" width="255" height="290" preserveAspectRatio="xMidYMid meet"/>
    <line x1="64" y1="379" x2="1016" y2="379" stroke="${colours.gold}" stroke-width="2"/>
    ${rows}
    <rect x="64" y="1210" width="952" height="77" rx="20" fill="${colours.inkSoft}" stroke="#4c595c"/>
    <text class="mono" x="92" y="1257" fill="${colours.cream}" font-size="18">GUARDA · PARTILHA · ESCOLHE O TEU DESVIO</text>
    <text class="mono" x="987" y="1257" text-anchor="end" fill="${colours.gold}" font-size="19">ODESVIO.PT</text>
  </svg>`;
}

function highlightSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
    ${styles}
    <rect width="1080" height="1350" fill="${colours.cream}"/>
    <path d="M0 0h1080v15H0z" fill="${colours.coral}"/>
    <g transform="translate(64 52)">
      <g transform="scale(.42)" fill="none" stroke="${colours.gold}" stroke-linecap="round">
        <path d="M93 31a45 45 0 1 0 13 31" stroke-width="7"/><path d="M87 42a33 33 0 1 0 9 23" stroke-width="6"/><path d="M81 52a21 21 0 1 0 6 15" stroke-width="5"/><path d="M94 20v25c0 10-6 15-15 19" stroke-width="10"/>
      </g>
      <circle cx="26.8" cy="28.5" r="5.3" fill="${colours.gold}"/><circle cx="26.8" cy="28.5" r="2" fill="${colours.coral}"/>
      <text x="62" y="37" fill="${colours.ink}" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800" letter-spacing="-1">O DESVIO</text>
    </g>
    <text class="mono" x="64" y="178" fill="${colours.gold}" font-size="19">DESTAQUE DO FIM DE SEMANA</text>
    <text class="display" x="64" y="260" fill="${colours.ink}" font-size="64">Fatal Move em tour.</text>
    <text class="body" x="68" y="307" fill="#596467" font-size="24">O cartaz oficial é o centro da história.</text>
    <rect x="399" y="350" width="613" height="774" rx="28" fill="${colours.ink}"/>
    <rect x="421" y="372" width="569" height="712" rx="18" fill="#0d1214"/>
    <image href="${fatalMovePoster}" x="421" y="372" width="569" height="712" preserveAspectRatio="xMidYMid meet"/>
    <rect x="425" y="1089" width="190" height="44" rx="22" fill="${colours.coral}"/>
    <text class="mono" x="520" y="1117" text-anchor="middle" fill="${colours.cream}" font-size="15">CARTAZ OFICIAL</text>
    <g transform="translate(382 784) scale(-1 1)">
      <image href="${guitar}" width="500" height="500" preserveAspectRatio="xMidYMid meet"/>
    </g>
    <rect x="64" y="1038" width="344" height="196" rx="24" fill="${colours.ink}"/>
    <text class="mono" x="92" y="1082" fill="${colours.gold}" font-size="18">10 OUT · SANTO TIRSO</text>
    <text class="strong" x="92" y="1127" fill="${colours.cream}" font-size="28">Fatal Move</text>
    <text class="body" x="92" y="1164" fill="${colours.muted}" font-size="20">Fear The Lord · Lost Grave</text>
    <text class="body" x="92" y="1199" fill="${colours.muted}" font-size="20">Carpe Diem · 22h00</text>
    <text class="mono" x="64" y="1300" fill="${colours.ink}" font-size="18">EVENTO DE @BORN_TO_RESIST_EVENTS_BOOKING</text>
    <text class="mono" x="1009" y="1300" text-anchor="end" fill="${colours.gold}" font-size="18">02 / 04</text>
  </svg>`;
}

fs.mkdirSync(here, { recursive: true });

for (const [name, svg] of [["weekly-single-draft", weeklySvg()], ["weekend-highlight-draft", highlightSvg()]]) {
  fs.writeFileSync(path.join(here, `${name}.svg`), svg);
  await sharp(Buffer.from(svg)).png().toFile(path.join(here, `${name}.png`));
}

const [weeklyThumb, highlightThumb] = await Promise.all([
  sharp(path.join(here, "weekly-single-draft.png")).resize(486, 608).png().toBuffer(),
  sharp(path.join(here, "weekend-highlight-draft.png")).resize(486, 608).png().toBuffer(),
]);

await sharp({ create: { width: 1036, height: 672, channels: 4, background: colours.inkSoft } })
  .composite([
    { input: weeklyThumb, left: 24, top: 32 },
    { input: highlightThumb, left: 526, top: 32 },
  ])
  .png()
  .toFile(path.join(here, "formats-contact-sheet.png"));

console.log(`Drafts rendered in ${here}`);
