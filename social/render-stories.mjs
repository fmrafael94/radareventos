import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const here = path.dirname(new URL(import.meta.url).pathname);

const WIDTH = 1080;
const HEIGHT = 1920;
const CARD_WIDTH = 930;
const CARD_HEIGHT = 1163;
const CARD_X = 75;
const CARD_Y = 354;

const sets = [
  ["giveaway/2026-10-for-the-glory", "odesvio-giveaway-for-the-glory", 4],
  ["weekend-features/2026-09-22-reign-fury", "odesvio-fim-de-semana-editorial-25-27set", 5],
  ["weekend-features/2026-09-30-faro-alternativo", "odesvio-fim-de-semana-editorial-02-04out", 5],
  ["weekend-features/2026-10-07-fatal-move", "odesvio-fim-de-semana-editorial-09-11out", 5],
  ["weekend-features/2026-10-14-black-box", "odesvio-fim-de-semana-editorial-16-18out", 5],
  ["weekend-features/2026-10-21-semibreve", "odesvio-fim-de-semana-editorial-23-25out", 5],
  ["weekend-features/2026-10-28-patrimonios", "odesvio-fim-de-semana-editorial-30out-01nov", 5],
  ["weekend-features/2026-10-28-patrimonios", "odesvio-fim-de-semana-30out-01nov", 8],
  ["weekly/2026-09-28_2026-10-04", "odesvio-agenda-28set-04out", 8],
  ["weekly/2026-10-05_2026-10-11", "odesvio-agenda-05out-11out", 8],
  ["weekly/2026-10-12_2026-10-18", "odesvio-agenda-12out-18out", 8],
  ["weekly/2026-10-19_2026-10-25", "odesvio-agenda-19out-25out", 8],
  ["weekly/2026-10-26_2026-11-01", "odesvio-agenda-26out-01nov", 8],
];

const chrome = index => Buffer.from(`<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
  <style>
    .brand { font-family: Arial, Helvetica, sans-serif; font-weight: 800; }
    .mono { font-family: Menlo, Monaco, monospace; font-weight: 700; letter-spacing: 2px; }
  </style>
  <rect width="1080" height="1920" fill="#182226" opacity=".55"/>
  <g transform="translate(74 104)">
    <g transform="scale(.42)" fill="none" stroke="#b7a45a" stroke-linecap="round">
      <path d="M93 31a45 45 0 1 0 13 31" stroke-width="7"/><path d="M87 42a33 33 0 1 0 9 23" stroke-width="6"/><path d="M81 52a21 21 0 1 0 6 15" stroke-width="5"/><path d="M94 20v25c0 10-6 15-15 19" stroke-width="10"/>
    </g>
    <circle cx="26.8" cy="28.5" r="5.3" fill="#b7a45a"/><circle cx="26.8" cy="28.5" r="2" fill="#e35e44"/>
    <text class="brand" x="62" y="37" fill="#f7f5f0" font-size="30">O DESVIO</text>
  </g>
  <text class="mono" x="1006" y="140" text-anchor="end" fill="#bdc5c2" font-size="18">${String(index).padStart(2, "0")}</text>
  <text class="mono" x="74" y="1725" fill="#b7a45a" font-size="20">@ODESVIO.PT</text>
  <text class="brand" x="74" y="1780" fill="#f7f5f0" font-size="34">A agenda continua em odesvio.pt</text>
  <text class="mono" x="74" y="1830" fill="#bdc5c2" font-size="17">GUARDA · PARTILHA · ESCOLHE O TEU DESVIO</text>
</svg>`);

async function storyFromCard(input, output, index) {
  const backdrop = await sharp(input)
    .resize(WIDTH, HEIGHT, { fit: "cover" })
    .blur(32)
    .modulate({ brightness: 0.52, saturation: 0.55 })
    .png()
    .toBuffer();

  const card = await sharp(input)
    .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "fill" })
    .composite([{ input: Buffer.from(`<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}"><rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="28" fill="white"/></svg>`), blend: "dest-in" }])
    .png()
    .toBuffer();

  const shadow = await sharp({ create: { width: CARD_WIDTH + 40, height: CARD_HEIGHT + 40, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: Buffer.from(`<svg width="${CARD_WIDTH + 40}" height="${CARD_HEIGHT + 40}"><rect x="20" y="20" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="30" fill="black" fill-opacity=".55"/></svg>`) }])
    .blur(18)
    .png()
    .toBuffer();

  await sharp(backdrop)
    .composite([
      { input: chrome(index), top: 0, left: 0 },
      { input: shadow, top: CARD_Y - 20, left: CARD_X - 20 },
      { input: card, top: CARD_Y, left: CARD_X },
    ])
    .png()
    .toFile(output);

  const metadata = await sharp(output).metadata();
  if (metadata.width !== WIDTH || metadata.height !== HEIGHT) throw new Error(`Story inválida: ${output}`);
}

for (const [relativeDir, prefix, count] of sets) {
  const dir = path.join(here, relativeDir);
  const storyDir = path.join(dir, "stories");
  fs.mkdirSync(storyDir, { recursive: true });
  for (let index = 1; index <= count; index += 1) {
    const suffix = count === 1 ? "" : `-${String(index).padStart(2, "0")}`;
    const input = path.join(dir, `${prefix}${suffix}.png`);
    if (!fs.existsSync(input)) throw new Error(`Falta o cartão: ${input}`);
    const output = path.join(storyDir, `${prefix}${suffix}-story.png`);
    await storyFromCard(input, output, index);
  }
}

console.log("Rendered native 1080×1920 story versions for all scheduled post cards");
