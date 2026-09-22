import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const here = path.dirname(new URL(import.meta.url).pathname);
const asset = fs.readFileSync(path.join(here, "..", "weekly-mascots", "editorial", "fatal-move-outta-spite-nopath.png")).toString("base64");
const output = path.join(here, "drafts");
fs.mkdirSync(output, { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <style>
    .display{font-family:Arial,Helvetica,sans-serif;font-weight:800;letter-spacing:-5px}
    .body{font-family:Arial,Helvetica,sans-serif;font-weight:500}
    .mono{font-family:Menlo,Monaco,monospace;font-weight:700;letter-spacing:2.5px}
  </style>
  <rect width="1080" height="1350" fill="#f7f5f0"/>
  <g transform="translate(76 72)">
    <g transform="scale(.48)" fill="none" stroke="#b7a45a" stroke-linecap="round">
      <path d="M93 31a45 45 0 1 0 13 31" stroke-width="7"/><path d="M87 42a33 33 0 1 0 9 23" stroke-width="6"/><path d="M81 52a21 21 0 1 0 6 15" stroke-width="5"/><path d="M94 20v25c0 10-6 15-15 19" stroke-width="10"/>
    </g>
    <circle cx="30.7" cy="32.6" r="6.2" fill="#b7a45a"/><circle cx="30.7" cy="32.6" r="2.2" fill="#e35e44"/>
    <text x="72" y="42" fill="#182226" font-family="Arial,Helvetica,sans-serif" font-size="34" font-weight="800" letter-spacing="-1.4">O DESVIO</text>
  </g>
  <text class="mono" x="76" y="226" fill="#8a7734" font-size="23">IBERIA TOUR · PORTUGAL</text>
  <text class="display" x="470" y="350" fill="#182226" font-size="91">Fatal Move</text>
  <text class="body" x="474" y="415" fill="#536064" font-size="30">Duas noites. Duas cidades.</text>
  <line x1="590" y1="535" x2="590" y2="825" stroke="#b7a45a" stroke-width="3" stroke-dasharray="9 12"/>
  <circle cx="590" cy="535" r="11" fill="#e35e44"/><circle cx="590" cy="825" r="11" fill="#e35e44"/>
  <text class="mono" x="630" y="546" fill="#8a7734" font-size="23">9 OUT · LISBOA</text>
  <text class="body" x="630" y="600" fill="#182226" font-size="29" font-weight="700">Village Underground</text>
  <text class="body" x="630" y="641" fill="#536064" font-size="24">20h00 · c/ Outta Spite + NoPath</text>
  <text class="mono" x="630" y="836" fill="#8a7734" font-size="23">10 OUT · PORTO</text>
  <text class="body" x="630" y="890" fill="#182226" font-size="29" font-weight="700">Carpe Diem · Santo Tirso</text>
  <text class="body" x="630" y="932" fill="#536064" font-size="22">22h00 · c/ Fear The Lord</text>
  <text class="body" x="630" y="968" fill="#536064" font-size="22">+ Lost Grave</text>
  <text class="mono" x="630" y="1038" fill="#182226" font-size="20">HARDCORE · IBERIA TOUR</text>
  <g transform="translate(590 570) scale(-1 1)">
    <image href="data:image/png;base64,${asset}" x="0" y="0" width="610" height="610" preserveAspectRatio="xMidYMid meet"/>
  </g>
  <text class="mono" x="76" y="1268" fill="#182226" font-size="24">ODESVIO.PT</text>
  <text class="mono" x="940" y="1268" fill="#8a7734" font-size="20">05 / 08</text>
</svg>`;

const svgPath = path.join(output, "fatal-move-portugal-tour-draft.svg");
const pngPath = path.join(output, "fatal-move-portugal-tour-draft.png");
fs.writeFileSync(svgPath, svg);
await sharp(Buffer.from(svg)).png().toFile(pngPath);
console.log(pngPath);
